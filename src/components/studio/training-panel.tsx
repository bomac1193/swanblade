"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DataProtectionContract } from "./data-protection-contract";
import {
  generateTrainingKey,
  exportKeyAsBase64,
  encryptAudioFile,
} from "@/lib/crypto";

/** Convert File to base64 (used only for LoRA non-secure context fallback) */
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a",
  ".wma", ".aiff", ".aif", ".opus", ".webm", ".mp4",
]);

/** Detect audio files by MIME type or extension (webkitdirectory ignores accept attr) */
function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

/** Upload files in parallel batches */
const CONCURRENT_UPLOADS = 3;

type ModelType = "lora" | "rave";

type TrainingStage =
  | "idle"
  | "selecting"
  | "contract"
  | "encrypting"
  | "uploading"
  | "training"
  | "completed"
  | "failed";

interface SourceFile {
  name: string;
  size: number;
  mime_type?: string;
}

interface TrainingPanelProps {
  onToast: (message: string, tone?: "neutral" | "success" | "error") => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "finishing...";
  if (seconds < 60) return `~${seconds}s remaining`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min < 60) return `~${min}m ${sec > 0 ? `${sec}s` : ""} remaining`;
  const hrs = Math.floor(min / 60);
  return `~${hrs}h ${min % 60}m remaining`;
}

export function TrainingPanel({ onToast }: TrainingPanelProps) {
  const [modelType, setModelType] = useState<ModelType>("lora");
  const [stage, setStage] = useState<TrainingStage>("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [totalSteps, setTotalSteps] = useState(1000);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [finalLoss, setFinalLoss] = useState<number | null>(null);
  const [trainingPhase, setTrainingPhase] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const isRave = modelType === "rave";

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Job recovery: check for in-progress training jobs on mount
  useEffect(() => {
    async function checkActiveJobs() {
      try {
        const res = await fetch("/api/training/active-job");
        if (!res.ok) return;
        const data = await res.json();
        if (data.job_id && data.status === "training") {
          setJobId(data.job_id);
          setStage("training");
          setModelType(data.model_type === "rave" ? "rave" : "lora");
          setTrainingPhase("Recovering training session...");
          startPolling(data.job_id);
        }
      } catch {
        // No active job or error — ignore
      }
    }
    checkActiveJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addAudioFiles = useCallback(
    (files: File[]) => {
      const audioFiles = files.filter(isAudioFile);
      if (audioFiles.length === 0) {
        onToast("No audio files found.", "error");
        return;
      }
      if (audioFiles.length < files.length) {
        onToast(
          `${files.length - audioFiles.length} non-audio file${files.length - audioFiles.length !== 1 ? "s" : ""} skipped.`,
          "neutral"
        );
      }
      setSelectedFiles((prev) => [...prev, ...audioFiles]);
      setStage("selecting");
    },
    [onToast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addAudioFiles(Array.from(e.target.files || []));
      // Reset input value so the same file(s) can be re-selected
      e.target.value = "";
    },
    [addAudioFiles]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      addAudioFiles(Array.from(e.dataTransfer.files || []));
    },
    [addAudioFiles]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBeginTraining = useCallback(() => {
    if (selectedFiles.length === 0) {
      onToast("Select at least one audio file.", "error");
      return;
    }
    setStage("contract");
  }, [selectedFiles.length, onToast]);

  const startPolling = useCallback((pollJobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(
          `/api/training/status?job_id=${pollJobId}`
        );
        if (!statusRes.ok) return;
        const status = await statusRes.json();

        if (status.status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStage("completed");
          setProgress(100);
          setSourceFiles(status.source_files || []);
          setFinalLoss(status.final_loss);
          onToast(
            status.model_type === "rave"
              ? "My Sound training complete. Your sonic DNA is ready."
              : "Training complete. Your model is ready.",
            "success"
          );
        } else if (status.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStage("failed");
          setErrorMessage(status.error_message || "Training failed.");
          onToast("Training failed.", "error");
        } else if (status.status === "training") {
          setProgress(status.progress || 0);
          setEtaSeconds(status.eta_seconds);
          setCurrentStep(status.current_step);
          setTotalSteps(status.total_steps || (status.model_type === "rave" ? 500000 : 1000));

          if (status.model_type === "rave" && status.phase) {
            const phaseLabels: Record<string, string> = {
              decrypting: "Decrypting audio...",
              preprocessing: "Preprocessing catalog...",
              training: status.current_step
                ? `Step ${status.current_step.toLocaleString()} / ${(status.total_steps || 500000).toLocaleString()}`
                : "Training RAVE model...",
              exporting: "Exporting model...",
              generating_donors: "Generating your sound clips...",
            };
            setTrainingPhase(phaseLabels[status.phase] || status.phase);
          } else if (status.current_step !== null && status.current_step > 0) {
            setTrainingPhase(
              `Step ${status.current_step.toLocaleString()} / ${(status.total_steps || 1000).toLocaleString()}`
            );
          } else if (status.progress < 15) {
            setTrainingPhase("Loading model + encoding audio...");
          }
        }
      } catch {
        // Polling error, will retry
      }
    }, isRave ? 30000 : 3000);
  }, [isRave, onToast]);

  const handleContractAccept = useCallback(
    async (consentTimestamp: string) => {
      setStage("encrypting");
      setProgress(0);

      try {
        const canEncryptLocally = typeof crypto !== "undefined" && !!crypto.subtle;
        let job_id: string;

        if (isRave) {
          // --- RAVE: Chunked upload (one file at a time) ---
          // Phase 1: Create job
          const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0);
          const sourceFileMeta = selectedFiles.map((f) => ({
            name: f.name,
            size: f.size,
            mime_type: f.type || "audio/mpeg",
          }));

          const initRes = await fetch("/api/training/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chunked_init: true,
              encrypt_server_side: true,
              consent_timestamp: consentTimestamp,
              model_name: modelName.trim() || null,
              model_description: modelDescription.trim() || null,
              model_type: "rave",
              file_count: selectedFiles.length,
              total_size_bytes: totalSize,
              source_files: sourceFileMeta,
            }),
          });

          if (!initRes.ok) {
            const err = await initRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to create training job.");
          }

          const initData = await initRes.json();
          job_id = initData.job_id;
          setJobId(job_id);

          // Phase 2: Upload files in parallel (FormData binary, no base64)
          setStage("uploading");
          const uploadedFiles: { encrypted_name: string; original_name: string; iv: string; size: number }[] = new Array(selectedFiles.length);
          let completedCount = 0;

          async function uploadSingleFile(file: File, index: number) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("job_id", job_id);
            formData.append("file_index", String(index));
            formData.append("original_name", file.name);

            const fileRes = await fetch("/api/training/upload-file", {
              method: "POST",
              body: formData,
            });

            if (!fileRes.ok) {
              const err = await fileRes.json().catch(() => ({}));
              throw new Error(err.error || `Failed to upload ${file.name}.`);
            }

            const fileData = await fileRes.json();
            uploadedFiles[index] = {
              encrypted_name: fileData.encrypted_name,
              original_name: fileData.original_name,
              iv: fileData.iv,
              size: fileData.original_size,
            };

            completedCount++;
            setProgress(Math.round((completedCount / selectedFiles.length) * 65));
          }

          // Process in batches of CONCURRENT_UPLOADS
          for (let batch = 0; batch < selectedFiles.length; batch += CONCURRENT_UPLOADS) {
            const batchFiles = selectedFiles.slice(batch, batch + CONCURRENT_UPLOADS);
            await Promise.all(
              batchFiles.map((file, batchIdx) =>
                uploadSingleFile(file, batch + batchIdx)
              )
            );
          }

          // Phase 3: Finalize (write manifest)
          const finalizeRes = await fetch("/api/training/upload-finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id, files: uploadedFiles }),
          });

          if (!finalizeRes.ok) {
            const err = await finalizeRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to finalize upload.");
          }

          setProgress(70);
        } else {
          // --- LoRA: Existing single-request upload ---
          let uploadBody: Record<string, unknown>;

          if (canEncryptLocally) {
            const key = await generateTrainingKey();
            const keyB64 = await exportKeyAsBase64(key);

            const encryptedFiles = [];
            for (let i = 0; i < selectedFiles.length; i++) {
              const file = selectedFiles[i];
              const encrypted = await encryptAudioFile(file, key);

              const bytes = new Uint8Array(encrypted.encrypted);
              let binary = "";
              const chunkSize = 8192;
              for (let j = 0; j < bytes.length; j += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(j, j + chunkSize));
              }
              const encB64 = btoa(binary);

              encryptedFiles.push({
                encrypted_b64: encB64,
                iv: encrypted.iv,
                original_name: encrypted.originalName,
                original_size: encrypted.originalSize,
                mime_type: encrypted.mimeType,
              });

              setProgress(Math.round(((i + 1) / selectedFiles.length) * 50));
            }

            uploadBody = {
              files: encryptedFiles,
              session_key_b64: keyB64,
              consent_timestamp: consentTimestamp,
              model_name: modelName.trim() || null,
              model_description: modelDescription.trim() || null,
              model_type: modelType,
            };
          } else {
            const rawFiles = [];
            for (let i = 0; i < selectedFiles.length; i++) {
              const file = selectedFiles[i];
              const b64 = await fileToBase64(file);
              rawFiles.push({
                data_b64: b64,
                original_name: file.name,
                original_size: file.size,
                mime_type: file.type || "audio/mpeg",
              });
              setProgress(Math.round(((i + 1) / selectedFiles.length) * 50));
            }

            uploadBody = {
              raw_files: rawFiles,
              encrypt_server_side: true,
              consent_timestamp: consentTimestamp,
              model_name: modelName.trim() || null,
              model_description: modelDescription.trim() || null,
              model_type: modelType,
            };
          }

          setStage("uploading");
          setProgress(50);

          const uploadRes = await fetch("/api/training/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uploadBody),
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({}));
            throw new Error(err.error || "Upload failed.");
          }

          const uploadData = await uploadRes.json();
          job_id = uploadData.job_id;
          setJobId(job_id);
          setProgress(70);
        }

        // --- Trigger training (both LoRA and RAVE) ---
        setStage("training");
        setTrainingPhase("Launching GPU...");
        const triggerRes = await fetch("/api/training/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id }),
        });

        if (!triggerRes.ok) {
          const err = await triggerRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to trigger training.");
        }

        setProgress(5);

        // Poll for status with progress
        startPolling(job_id);
      } catch (err) {
        setStage("failed");
        const msg = err instanceof Error ? err.message : "Training failed.";
        setErrorMessage(msg);
        onToast(msg, "error");
      }
    },
    [selectedFiles, onToast, modelName, modelDescription, modelType, isRave, startPolling]
  );

  const handleContractCancel = useCallback(() => {
    setStage("selecting");
  }, []);

  const handleDownload = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/training/download?job_id=${jobId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed." }));
        onToast(err.error || "Download not available yet.", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (modelName || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      a.download = safeName
        ? `${safeName}.safetensors`
        : `swanblade-lora-${jobId.slice(0, 8)}.safetensors`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast("Model downloaded.", "success");
    } catch {
      onToast("Download failed.", "error");
    }
  }, [jobId, onToast, modelName]);

  const reset = useCallback(() => {
    setStage("idle");
    setSelectedFiles([]);
    setProgress(0);
    setJobId(null);
    setErrorMessage(null);
    setModelName("");
    setModelDescription("");
    setEtaSeconds(null);
    setCurrentStep(null);
    setSourceFiles([]);
    setFinalLoss(null);
    setTrainingPhase("");
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  return (
    <>
      <div className="bg-black border border-white/[0.06] p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-400">Training</p>
          {stage !== "idle" && stage !== "selecting" && (
            <span className="text-xs text-gray-600 uppercase tracking-wider">
              {stage}
            </span>
          )}
        </div>

        {/* Model Type Toggle */}
        {(stage === "idle" || stage === "selecting") && (
          <div className="mt-3 flex gap-1">
            <button
              onClick={() => { setModelType("lora"); setSelectedFiles([]); }}
              className={`flex-1 px-3 py-1.5 text-xs border transition-colors ${
                modelType === "lora"
                  ? "border-white/20 bg-white/[0.06] text-white"
                  : "border-white/[0.04] text-gray-600 hover:text-gray-400"
              }`}
            >
              Sound World
            </button>
            <button
              onClick={() => { setModelType("rave"); setSelectedFiles([]); }}
              className={`flex-1 px-3 py-1.5 text-xs border transition-colors ${
                modelType === "rave"
                  ? "border-white/20 bg-white/[0.06] text-white"
                  : "border-white/[0.04] text-gray-600 hover:text-gray-400"
              }`}
            >
              My Sound
            </button>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-500">
          {isRave
            ? "Train on your music catalog. Your sonic DNA becomes a permanent donor source for sculpting."
            : "Train a custom model on your own audio. Files are encrypted in your browser before upload and deleted after training."
          }
        </p>

        {/* Idle / Selecting */}
        {(stage === "idle" || stage === "selecting") && (
          <div
            className="mt-4"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Folder input for RAVE — webkitdirectory */}
            {isRave && (
              <input
                ref={folderInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
              />
            )}

            {/* Drop zone */}
            <div
              className={`relative border border-dashed transition-colors ${
                isDragging
                  ? "border-white/40 bg-white/[0.04]"
                  : "border-white/[0.12]"
              } py-6 px-4 text-center cursor-pointer`}
              onClick={() => fileInputRef.current?.click()}
            >
              {isDragging ? (
                <p className="text-sm text-white">Drop audio files here</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Drop audio files here or click to browse
                  </p>
                  {isRave && (
                    <p className="text-xs text-gray-600 mt-1">
                      mp3, wav, flac, aac, ogg, m4a, aiff
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Folder button for RAVE */}
            {isRave && (
              <button
                onClick={() => folderInputRef.current?.click()}
                className="mt-2 w-full py-2 border border-dashed border-white/[0.08] text-xs text-gray-600 hover:text-gray-400 hover:border-white/[0.16] transition-colors"
              >
                + Add Folder
              </button>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {selectedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between py-1.5 px-2 border border-white/[0.06] text-sm"
                  >
                    <span className="text-gray-300 truncate flex-1 mr-2">
                      {file.name}
                    </span>
                    <span className="text-gray-600 text-xs shrink-0 mr-2">
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M6 6l12 12M6 18L18 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}

                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={isRave ? "Name your sound (e.g., My Catalog)" : "Name your Sound World"}
                    maxLength={60}
                    className="w-full px-3 py-2 bg-transparent border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    placeholder="Short description (optional)"
                    maxLength={120}
                    className="w-full px-3 py-2 bg-transparent border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleBeginTraining}
                  className="mt-3 w-full px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors"
                >
                  Begin Training ({selectedFiles.length} file
                  {selectedFiles.length !== 1 ? "s" : ""})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progress States */}
        {(stage === "encrypting" ||
          stage === "uploading" ||
          stage === "training") && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-gray-300">
                {stage === "encrypting" && "Encrypting files..."}
                {stage === "uploading" && "Uploading encrypted files..."}
                {stage === "training" && "Training model..."}
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/[0.06] overflow-hidden rounded-full">
              <div
                className="h-full bg-white transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {stage === "encrypting" &&
                  "AES-256-GCM encryption in your browser."}
                {stage === "uploading" &&
                  "Server receives only encrypted data."}
                {stage === "training" && trainingPhase}
              </p>
              {stage === "training" && (
                <p className="text-xs text-gray-500 tabular-nums">
                  {etaSeconds !== null ? formatEta(etaSeconds) : "Estimating..."}
                </p>
              )}
            </div>

            {/* Step counter during training */}
            {stage === "training" && currentStep !== null && currentStep > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <span>{Math.round(progress)}%</span>
                <span>
                  {currentStep.toLocaleString()} / {totalSteps.toLocaleString()} steps
                </span>
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {stage === "completed" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 12l2.5 2.5L16 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm">Training complete</span>
              {finalLoss !== null && (
                <span className="text-xs text-gray-600 ml-auto tabular-nums">
                  loss: {finalLoss.toFixed(4)}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-3">
              {isRave
                ? "Your audio files have been permanently deleted. Your sonic DNA is now available as a donor source in Sculpt mode."
                : "Your audio files have been permanently deleted. The LoRA model is yours to download."
              }
            </p>

            {/* Source files that trained this model */}
            {sourceFiles.length > 0 && (
              <div className="mb-3 border border-white/[0.04] p-3">
                <p className="text-xs text-gray-600 mb-2">Trained on:</p>
                <div className="space-y-1">
                  {sourceFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-400 truncate flex-1 mr-2">
                        {f.name}
                      </span>
                      <span className="text-gray-600 shrink-0">
                        {formatSize(f.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!isRave && (
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 text-sm text-black bg-white hover:bg-gray-200 transition-colors"
                >
                  Download Model
                </button>
              )}
              <button
                onClick={reset}
                className={`${isRave ? "flex-1" : ""} px-4 py-2 text-sm text-gray-400 border border-white/[0.06] hover:text-white transition-colors`}
              >
                {isRave ? "Train Another" : "New Training"}
              </button>
            </div>
          </div>
        )}

        {/* Failed */}
        {stage === "failed" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-red-400 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 8l8 8M8 16l8-8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm">Training failed</span>
            </div>

            {errorMessage && (
              <p className="text-xs text-gray-500 mb-3">{errorMessage}</p>
            )}

            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-gray-400 border border-white/[0.06] hover:text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Data Protection Contract Modal */}
      {stage === "contract" && (
        <DataProtectionContract
          fileCount={selectedFiles.length}
          onAccept={handleContractAccept}
          onCancel={handleContractCancel}
        />
      )}
    </>
  );
}
