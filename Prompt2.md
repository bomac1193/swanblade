You are an expert full-stack engineer and AI systems architect working on the existing production project **Swanblade** — the artist-first audio world model and generative music platform focused on alien, beautiful, genre-defining strange music.

Do not build a new app from scratch. Do not create disconnected demos or toys.
Implement the following vision and features directly into the existing Swanblade codebase. Respect all current architecture, folder structure, design system (Resonaet-style: Canela headings, Söhne body, black/white luxury minimal aesthetic, high contrast, elegant typography, no clutter), component patterns, and coding standards.

### Overall Vision to Implement
"Your Swanblade audio AI system is aiming at exactly the right target: alien, beautiful, genre-defining strange music that feels like *your* signature sonic world rather than generic AI slop.

The most distinctive, ownable, genre-defining results come from a **composable pipeline**, not one end-to-end model:

- ACE-Step 1.5 (or its XL 4B variant) as the musical foundation (local, fast, personalizable with LoRA on private data).
- AudioX for multimodal conditioning when you want image/video → sound prompts (using its Multimodal Adaptive Fusion module).
- Fugatto as the primary transformation / deformation layer (free-form text instructions + optional audio input for grotesque timbral shifts, impossible hybrids, and never-heard sounds).
- MusicHiFi (or latest stereo vocoder equivalents) as the final render stage for high-fidelity stereo, spatial polish, and bandwidth extension.

Supporting elements:
- DiffRhythm 2 or YuE when lyric alignment or fast full-song structure is needed.
- Offline music analysis: Essentia + librosa + madmom.
- Hybrid LoRA + instruction pipelines: Personalize ACE-Step on the private 7-layer dataset (vocal canon, paired controls, preference rankings, automatic writing, etc.), then feed into Fugatto.
- Custom DSP / resynthesis as the final signature layer (topology-based sequencing, microtonal retuning, resonator/granular systems, Max/MSP-style processing).
- Preference / reward modeling using the ranking dataset to create a taste reranker.

VampNet is legacy — use it only as a lightweight local baseline if needed. Avoid over-focusing on single closed models like Suno or Udio for core generation.

The private dataset (7-layer system) is the real moat. Turn Swanblade into a true artist-world-model platform by wiring this pipeline into it.

After every generation step, automatically apply the **08 Protocol** (Origin 8 Protocol) fingerprint + invisible watermark, then embed it as custom assertions inside a standard **C2PA manifest**. This must be non-bypassable in Private Canon / Ethical Lock mode.

Support cross-modal assets (audio + visuals: images, AI videos, album art). Show a unified “08 Protocol + C2PA Protected” badge.

### What to Build / Modify

1. **Core Generation Pipeline Module**
   - Create or extend a modular pipeline orchestrator that supports the stack above.
   - Allow chaining: ACE-Step/AudioX → Fugatto mutation → MusicHiFi render → custom DSP stage.
   - Support LoRA personalization from the user’s private dataset (secure/ephemeral environment only).
   - Integrate multimodal conditioning via AudioX.

2. **08 Protocol + C2PA Provenance Integration**
   - On ingest, upload, or any generation: compute 08 Protocol perceptual fingerprint + watermark (survives DSP, compression, etc.).
   - Generate C2PA manifest and embed 08 Protocol data as custom signed assertions (e.g. swanblade.origin8_fingerprint, swanblade.private_canon_id, swanblade.ai_training_opt_in).
   - Make it work for audio and visual files.
   - Tie into the Data Sovereignty Dashboard: display status, allow audit/revoke, reflect opt-in/out for AI training.

3. **Asset & Generation UI Updates**
   - Asset Detail page: show provenance badge, manifest preview, pipeline steps used.
   - Generation interface: options to select pipeline components (ACE-Step base, Fugatto strength, MusicHiFi toggle, custom DSP chain).
   - Add clear, elegant success states with “08 Protocol + C2PA Protected” confirmation.

4. **Dataset & Analysis Integration**
   - Hook the 7-layer private dataset (vocal canon, paired controls, rankings, etc.) into LoRA training and preference modeling.
   - Use Essentia/librosa/madmom offline for analysis features.

### Recommended Libraries & Tech (use or integrate these where appropriate)

**Backend (Python for audio/ML):**
- `c2pa` or `c2pa-py` for C2PA manifests
- `torch` + `torchaudio`, `librosa`, `essentia`, `numpy` for audio processing and analysis
- Hugging Face `diffusers` / `transformers` or official repos for ACE-Step 1.5, AudioX, Fugatto (when available), MusicHiFi
- Existing watermarking or perceptual hashing libs (extend for 08 Protocol)

**Frontend (TypeScript/React):**
- Reuse existing Resonaet components and tokens
- Waveform previews, pipeline visualizer, provenance badges

Keep everything secure: raw data stays in per-artist encrypted storage; training in ephemeral environments.

### Success Criteria
- The pipeline produces alien, signature strange music that feels like a new artistic instrument.
- Every output carries 08 Protocol + C2PA provenance automatically.
- Artists see clear control via the Data Sovereignty Dashboard and unified badges.
- The system feels premium, trustworthy, and artist-sovereign.

Before writing code:
1. Inspect the current Swanblade codebase (generation pipelines, asset handling, provenance if any, dataset modules).
2. Summarize your integration plan, including files to modify/create and how the models will be wired in.
3. Address how 08 Protocol enforcement will be non-bypassable.

Then implement the changes cleanly with clear file paths.

Output the plan first, then the code.
