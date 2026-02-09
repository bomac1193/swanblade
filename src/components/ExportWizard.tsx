"use client";

import React, { useState, useCallback } from "react";
import type { StemBundle } from "@/lib/stemGenerator";
import { generateUnityPackage } from "@/lib/exports/unity";
import { generateUnrealPackage } from "@/lib/exports/unreal";
import { generateWwisePackage } from "@/lib/exports/wwise";
import { generateFMODPackage } from "@/lib/exports/fmod";
import { cn } from "@/lib/utils";

type ExportTarget = "unity" | "unreal" | "wwise" | "fmod" | "all";
type ExportStep = "target" | "configure" | "preview" | "export";

interface ExportWizardProps {
  bundles: StemBundle[];
  onExportComplete?: (target: ExportTarget, files: Map<string, string>) => void;
  onCancel?: () => void;
  className?: string;
}

const EXPORT_TARGETS: {
  id: ExportTarget;
  name: string;
  description: string;
  icon: string;
  features: string[];
}[] = [
  {
    id: "unity",
    name: "Unity",
    description: "Complete Unity package with AudioManager and ScriptableObjects",
    icon: "unity",
    features: [
      "AudioManager script with state machine",
      "ScriptableObject bundles per game state",
      "Event system for integration",
      "Editor tools for bundle management",
    ],
  },
  {
    id: "unreal",
    name: "Unreal Engine",
    description: "Full Unreal plugin with C++ classes and Blueprint support",
    icon: "unreal",
    features: [
      "C++ AudioManager actor",
      "DataAsset classes for bundles",
      "Blueprint function library",
      "RTPC parameter mapping",
    ],
  },
  {
    id: "wwise",
    name: "Wwise",
    description: "Complete Wwise project with events, states, and RTPCs",
    icon: "wwise",
    features: [
      "Work unit XML files",
      "Event and state definitions",
      "RTPC game parameters",
      "Music switch container setup",
    ],
  },
  {
    id: "fmod",
    name: "FMOD Studio",
    description: "Full FMOD project with multi-track events and snapshots",
    icon: "fmod",
    features: [
      "Multi-track instrument events",
      "Parameter definitions",
      "Snapshot presets",
      "Bank configuration",
    ],
  },
  {
    id: "all",
    name: "All Platforms",
    description: "Export for all platforms at once",
    icon: "all",
    features: [
      "Unity, Unreal, Wwise, and FMOD packages",
      "Consistent configuration across platforms",
      "Single download with all files",
    ],
  },
];

export function ExportWizard({
  bundles,
  onExportComplete,
  onCancel,
  className,
}: ExportWizardProps) {
  const [step, setStep] = useState<ExportStep>("target");
  const [target, setTarget] = useState<ExportTarget | null>(null);
  const [projectName, setProjectName] = useState("SwanbladeAudio");
  const [includeReadme, setIncludeReadme] = useState(true);
  const [includeLicense, setIncludeLicense] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<Map<string, string> | null>(null);

  const handleTargetSelect = useCallback((targetId: ExportTarget) => {
    setTarget(targetId);
    setStep("configure");
  }, []);

  const handleConfigure = useCallback(() => {
    setStep("preview");
  }, []);

  const handleExport = useCallback(async () => {
    if (!target) return;

    setIsExporting(true);
    const files = new Map<string, string>();

    try {
      // Generate files based on target
      const targets = target === "all" ? ["unity", "unreal", "wwise", "fmod"] : [target];

      for (const t of targets) {
        const prefix = target === "all" ? `${t}/` : "";

        switch (t) {
          case "unity": {
            const pkg = generateUnityPackage(bundles, projectName);
            files.set(`${prefix}manifest.json`, JSON.stringify(pkg.manifest, null, 2));
            files.set(`${prefix}Scripts/SwanbladeAudioManager.cs`, pkg.audioManager);
            files.set(`${prefix}Scripts/SwanbladeAudioEvents.cs`, pkg.eventDefinitions);
            files.set(`${prefix}Editor/SwanbladeAudioEditor.cs`, pkg.editorScript);
            for (const [name, content] of pkg.scriptableObjects) {
              files.set(`${prefix}Scripts/Bundles/${name}`, content);
            }
            if (includeReadme) files.set(`${prefix}README.md`, pkg.readme);
            break;
          }
          case "unreal": {
            const pkg = generateUnrealPackage(bundles, projectName);
            files.set(`${prefix}manifest.json`, JSON.stringify(pkg.manifest, null, 2));
            files.set(`${prefix}Source/SwanbladeAudioManager.h`, pkg.audioManagerHeader);
            files.set(`${prefix}Source/SwanbladeAudioManager.cpp`, pkg.audioManagerCpp);
            files.set(`${prefix}Source/SwanbladeBlueprintLibrary.h`, pkg.blueprintLibrary);
            files.set(`${prefix}Config/DefaultGameplayTags.ini`, pkg.gameplayTags);
            for (const [name, content] of pkg.dataAssets) {
              files.set(`${prefix}Source/DataAssets/${name}`, content);
            }
            if (includeReadme) files.set(`${prefix}README.md`, pkg.readme);
            break;
          }
          case "wwise": {
            const pkg = generateWwisePackage(bundles, projectName);
            files.set(`${prefix}manifest.json`, JSON.stringify(pkg.manifest, null, 2));
            files.set(`${prefix}WorkUnits/${projectName}_Actors.wwu`, pkg.workUnit);
            files.set(`${prefix}WorkUnits/${projectName}_Events.wwu`, pkg.eventDefinitions);
            files.set(`${prefix}WorkUnits/${projectName}_States.wwu`, pkg.switchGroups);
            files.set(`${prefix}WorkUnits/${projectName}_RTPCs.wwu`, pkg.rtpcDefinitions);
            files.set(`${prefix}WorkUnits/${projectName}_Music.wwu`, pkg.musicSetup);
            files.set(`${prefix}SoundBanks/${projectName}_Main.xml`, pkg.soundbankConfig);
            if (includeReadme) files.set(`${prefix}README.md`, pkg.readme);
            break;
          }
          case "fmod": {
            const pkg = generateFMODPackage(bundles, projectName);
            files.set(`${prefix}manifest.json`, JSON.stringify(pkg.manifest, null, 2));
            files.set(`${prefix}${projectName}.fspro`, pkg.projectConfig);
            files.set(`${prefix}Events/${projectName}.xml`, pkg.eventDefinitions);
            files.set(`${prefix}Parameters/${projectName}.xml`, pkg.parameterDefinitions);
            files.set(`${prefix}Snapshots/${projectName}.xml`, pkg.snapshotPresets);
            files.set(`${prefix}Banks/${projectName}.xml`, pkg.bankConfig);
            files.set(`${prefix}IntegrationGuide.md`, pkg.integrationGuide);
            if (includeReadme) files.set(`${prefix}README.md`, pkg.readme);
            break;
          }
        }
      }

      // Add license if requested
      if (includeLicense) {
        files.set("LICENSE.txt", generateLicense(bundles));
      }

      setExportedFiles(files);
      setStep("export");
      onExportComplete?.(target, files);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [target, bundles, projectName, includeReadme, includeLicense, onExportComplete]);

  const handleDownload = useCallback(() => {
    if (!exportedFiles) return;

    // Create a simple download of all files as a JSON bundle
    // In production, this would create a proper ZIP file
    const bundle = {
      files: Object.fromEntries(exportedFiles),
      exportedAt: new Date().toISOString(),
      target,
      projectName,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}_${target}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportedFiles, target, projectName]);

  return (
    <div className={cn("flex flex-col gap-6 p-6 bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Export Wizard</h2>
          <p className="text-sm text-muted-foreground">
            Export {bundles.length} bundle{bundles.length > 1 ? "s" : ""} for game engine integration
          </p>
        </div>
        {onCancel && step !== "export" && (
          <button
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {(["target", "configure", "preview", "export"] as ExportStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["target", "configure", "preview", "export"].indexOf(step)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "flex-1 h-0.5",
                  i < ["target", "configure", "preview", "export"].indexOf(step)
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {step === "target" && (
        <div className="space-y-4">
          <h3 className="font-medium">Select Export Target</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXPORT_TARGETS.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "flex flex-col items-start p-4 rounded-lg border text-left transition-colors",
                  target === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handleTargetSelect(t.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ExportIcon type={t.icon} />
                  <span className="font-medium">{t.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {t.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "configure" && target && (
        <div className="space-y-4">
          <h3 className="font-medium">Configure Export</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className="w-full mt-1 p-2 rounded-md border bg-background"
                placeholder="SwanbladeAudio"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for namespaces, class names, and folder structure
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeReadme}
                  onChange={(e) => setIncludeReadme(e.target.checked)}
                  className="rounded"
                />
                Include README with integration guide
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeLicense}
                  onChange={(e) => setIncludeLicense(e.target.checked)}
                  className="rounded"
                />
                Include LICENSE with provenance information
              </label>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Bundles to Export</h4>
            <div className="space-y-1">
              {bundles.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span>{b.name}</span>
                  <span className="text-muted-foreground">
                    {b.stems.length} stems · {b.manifest.bpm} BPM
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-md border hover:bg-muted"
              onClick={() => setStep("target")}
            >
              Back
            </button>
            <button
              className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleConfigure}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "preview" && target && (
        <div className="space-y-4">
          <h3 className="font-medium">Preview Export</h3>

          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-medium">
                {EXPORT_TARGETS.find((t) => t.id === target)?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project Name</span>
              <span className="font-medium">{projectName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bundles</span>
              <span className="font-medium">{bundles.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Stems</span>
              <span className="font-medium">
                {bundles.reduce((sum, b) => sum + b.stems.length, 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-md border hover:bg-muted"
              onClick={() => setStep("configure")}
            >
              Back
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground",
                "hover:bg-primary/90 disabled:opacity-50"
              )}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Package"
              )}
            </button>
          </div>
        </div>
      )}

      {step === "export" && exportedFiles && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="font-medium">Export Complete</h3>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Generated Files ({exportedFiles.size})</h4>
            <div className="max-h-48 overflow-auto space-y-1">
              {Array.from(exportedFiles.keys()).map((file) => (
                <div key={file} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span>{file}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-md border hover:bg-muted"
              onClick={() => {
                setStep("target");
                setExportedFiles(null);
              }}
            >
              Export Another
            </button>
            <button
              className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleDownload}
            >
              Download Package
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Icons ====================

function ExportIcon({ type }: { type: string }) {
  const className = "w-5 h-5";

  switch (type) {
    case "unity":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.4 17.8l-5.2-3v-6l5.2 3v6zm.8-7.1L6 7.6l5.2-3 5.2 3.1-5.2 3zm6 4.1l-5.2 3v-6l5.2-3v6zm1.2-7.2L12 4 5.6 7.6v9.8l6.4 4 6.4-4V7.6z"/>
        </svg>
      );
    case "unreal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm1-15.2v5.5l3.8-2.8-3.8-2.7zm-4.3 2.7l3.8 2.8V6.8L8.7 9.5zm0 5l3.8 2.8v-5.5l-3.8 2.7zm4.3 2.7l3.8-2.7-3.8-2.8v5.5z"/>
        </svg>
      );
    case "wwise":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      );
    case "fmod":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
      );
    case "all":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      );
    default:
      return null;
  }
}

// ==================== Helpers ====================

function generateLicense(bundles: StemBundle[]): string {
  const hasProvenance = bundles.some((b) => b.stems.some((s) => s.provenanceCid));

  return `SWANBLADE AUDIO EXPORT LICENSE
==============================

Exported: ${new Date().toISOString()}
Bundles: ${bundles.length}
Total Stems: ${bundles.reduce((sum, b) => sum + b.stems.length, 0)}

PROVENANCE INFORMATION
----------------------
${hasProvenance
  ? `This audio export has verifiable provenance through the o8 protocol.
All stems can be traced to their origin and verified on-chain.

Verify at: https://verify.o8.audio`
  : `This audio export does not have on-chain provenance.
Consider stamping with o8 protocol for full attribution tracking.`}

USAGE RIGHTS
------------
This audio was generated using AI models through Swanblade.
Usage rights depend on your subscription tier and the underlying model providers.

For commercial use, ensure you have appropriate licensing from:
- Swanblade (generation platform)
- Underlying model provider (Replicate, fal.ai, etc.)

ATTRIBUTION
-----------
Generated by Swanblade
https://swanblade.io

For provenance verification: https://o8.audio
`;
}

export default ExportWizard;
