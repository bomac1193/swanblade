/**
 * FMOD Export - Full Project Generation
 *
 * Generates complete FMOD Studio-ready packages including:
 * - Project XML configuration
 * - Event definitions with multi-track instruments
 * - Parameter definitions for adaptive audio
 * - Snapshot presets
 * - Bank configuration
 */

import type { StemBundle } from "../stemGenerator";
import type { GameState } from "../gameStateEngine";

// ==================== FMOD Package Types ====================

export interface FMODPackage {
  manifest: FMODManifest;
  projectConfig: string;
  eventDefinitions: string;
  parameterDefinitions: string;
  snapshotPresets: string;
  bankConfig: string;
  integrationGuide: string;
  readme: string;
}

export interface FMODManifest {
  name: string;
  version: string;
  fmodVersion: string;
  generator: string;
  generatedAt: string;
  bundles: FMODBundleInfo[];
}

export interface FMODBundleInfo {
  id: string;
  name: string;
  gameState: GameState;
  stemCount: number;
  bpm: number;
  duration: number;
}

// ==================== Project Config ====================

/**
 * Generate FMOD Studio project configuration
 */
export function generateFMODProjectConfig(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project version="2.02">
    <name>${projectName}</name>
    <guid>${generateFMODGuid()}</guid>
    <createdBy>Swanblade</createdBy>
    <createdAt>${new Date().toISOString()}</createdAt>

    <settings>
        <sampleRate>48000</sampleRate>
        <speakerMode>Stereo</speakerMode>
        <dopplerScale>1.0</dopplerScale>
        <distanceFactor>1.0</distanceFactor>
        <rolloffScale>1.0</rolloffScale>
    </settings>

    <mixerSettings>
        <masterBus>
            <volume>0.0</volume>
            <pitch>0.0</pitch>
        </masterBus>
        <musicBus>
            <volume>0.0</volume>
            <pitch>0.0</pitch>
        </musicBus>
        <sfxBus>
            <volume>0.0</volume>
            <pitch>0.0</pitch>
        </sfxBus>
    </mixerSettings>

    <bundles>
${bundles.map((b) => `        <bundle>
            <id>${b.id}</id>
            <name>${b.name}</name>
            <gameState>${b.gameState}</gameState>
            <bpm>${b.manifest.bpm}</bpm>
            <duration>${b.manifest.duration}</duration>
            <stemCount>${b.stems.length}</stemCount>
        </bundle>`).join("\n")}
    </bundles>
</project>
`;
}

// ==================== Event Definitions ====================

/**
 * Generate FMOD event definitions with multi-track instruments
 */
export function generateFMODEventDefinitions(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<events version="2.02">
    <folder name="${projectName}">
${bundles.map((b) => generateFMODEvent(b)).join("\n")}

        <!-- Control Events -->
        <folder name="Control">
${bundles.map((b) => `            <event name="Control_${b.gameState}" guid="${generateFMODGuid()}">
                <property name="oneShot" value="false"/>
                <property name="is3D" value="false"/>
                <commandInstrument>
                    <command>set_parameter</command>
                    <targetParameter>GameState</targetParameter>
                    <value>${gameStateToValue(b.gameState)}</value>
                </commandInstrument>
            </event>`).join("\n")}
        </folder>
    </folder>
</events>
`;
}

function generateFMODEvent(bundle: StemBundle): string {
  const eventGuid = generateFMODGuid();

  return `        <event name="Music_${bundle.gameState}" guid="${eventGuid}">
            <property name="oneShot" value="false"/>
            <property name="is3D" value="false"/>
            <property name="cooldown" value="0"/>
            <property name="priority" value="128"/>

            <timeline>
                <tempo>${bundle.manifest.bpm}</tempo>
                <timeSignature>4/4</timeSignature>
            </timeline>

            <tracks>
${bundle.stems.map((stem, i) => `                <track name="${stem.stemType}" guid="${generateFMODGuid()}">
                    <property name="volume" value="0.0"/>
                    <property name="fadeIn" value="500"/>
                    <property name="fadeOut" value="500"/>

                    <multiInstrument>
                        <playlist mode="sequential">
                            <entry>
                                <audioFile>${stem.stemType}.wav</audioFile>
                                <loopMode>loop</loopMode>
                            </entry>
                        </playlist>
                    </multiInstrument>

                    <automation parameter="StemVolume_${stem.stemType}">
                        <point time="0" value="1.0"/>
                    </automation>
                </track>`).join("\n")}
            </tracks>

            <parameters>
                <reference name="Intensity"/>
                <reference name="GameState"/>
${bundle.stems.map((stem) => `                <reference name="StemVolume_${stem.stemType}"/>`).join("\n")}
            </parameters>

            <markers>
                <transitionMarker name="exit" time="${bundle.manifest.duration * 1000}">
                    <transitionTo>next_in_playlist</transitionTo>
                    <fadeOut>1000</fadeOut>
                </transitionMarker>
            </markers>
        </event>`;
}

// ==================== Parameter Definitions ====================

/**
 * Generate FMOD parameter definitions
 */
export function generateFMODParameterDefinitions(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  // Get all unique stem types
  const allStemTypes = [...new Set(bundles.flatMap((b) => b.stems.map((s) => s.stemType)))];
  const allStates = [...new Set(bundles.map((b) => b.gameState))];

  return `<?xml version="1.0" encoding="UTF-8"?>
<parameters version="2.02">
    <folder name="${projectName}">
        <!-- Global Parameters -->
        <parameter name="GameState" guid="${generateFMODGuid()}">
            <type>labeled</type>
            <minimum>0</minimum>
            <maximum>${allStates.length - 1}</maximum>
            <default>0</default>
            <labels>
${allStates.map((state, i) => `                <label value="${i}">${state}</label>`).join("\n")}
            </labels>
        </parameter>

        <parameter name="Intensity" guid="${generateFMODGuid()}">
            <type>continuous</type>
            <minimum>0</minimum>
            <maximum>1</maximum>
            <default>0.5</default>
            <description>Overall music intensity (affects dynamics)</description>
        </parameter>

        <parameter name="Health" guid="${generateFMODGuid()}">
            <type>continuous</type>
            <minimum>0</minimum>
            <maximum>100</maximum>
            <default>100</default>
            <description>Player health percentage</description>
        </parameter>

        <parameter name="CombatThreat" guid="${generateFMODGuid()}">
            <type>continuous</type>
            <minimum>0</minimum>
            <maximum>100</maximum>
            <default>0</default>
            <description>Combat threat level</description>
        </parameter>

        <parameter name="Stealth" guid="${generateFMODGuid()}">
            <type>continuous</type>
            <minimum>0</minimum>
            <maximum>100</maximum>
            <default>0</default>
            <description>Stealth detection meter</description>
        </parameter>

        <!-- Stem Volume Parameters -->
${allStemTypes.map((stemType) => `        <parameter name="StemVolume_${stemType}" guid="${generateFMODGuid()}">
            <type>continuous</type>
            <minimum>0</minimum>
            <maximum>1</maximum>
            <default>1</default>
            <description>Volume control for ${stemType} stem</description>
        </parameter>`).join("\n\n")}
    </folder>

    <!-- Automation Presets -->
    <folder name="Presets">
        <preset name="FullMix">
${allStemTypes.map((stemType) => `            <parameterValue name="StemVolume_${stemType}" value="1.0"/>`).join("\n")}
        </preset>

        <preset name="NoDrums">
            <parameterValue name="StemVolume_drums" value="0.0"/>
${allStemTypes.filter((t) => t !== "drums").map((stemType) => `            <parameterValue name="StemVolume_${stemType}" value="1.0"/>`).join("\n")}
        </preset>

        <preset name="AmbientOnly">
            <parameterValue name="StemVolume_drums" value="0.0"/>
            <parameterValue name="StemVolume_bass" value="0.2"/>
            <parameterValue name="StemVolume_melody" value="0.3"/>
            <parameterValue name="StemVolume_atmosphere" value="1.0"/>
            <parameterValue name="StemVolume_harmony" value="0.7"/>
        </preset>

        <preset name="Minimal">
${allStemTypes.map((stemType) => `            <parameterValue name="StemVolume_${stemType}" value="0.3"/>`).join("\n")}
        </preset>
    </folder>
</parameters>
`;
}

// ==================== Snapshot Presets ====================

/**
 * Generate FMOD snapshot presets for quick mixing
 */
export function generateFMODSnapshotPresets(
  projectName: string = "SwanbladeAudio"
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<snapshots version="2.02">
    <folder name="${projectName}">
        <!-- Combat Snapshots -->
        <snapshot name="Combat_FullIntensity" guid="${generateFMODGuid()}">
            <description>Full combat intensity with all stems at max</description>
            <parameter name="Intensity" value="1.0"/>
            <parameter name="StemVolume_drums" value="1.0"/>
            <parameter name="StemVolume_bass" value="1.0"/>
            <parameter name="StemVolume_melody" value="0.8"/>
            <parameter name="StemVolume_atmosphere" value="0.5"/>
            <busVolume name="Music" value="0.0"/>
            <fadeIn>500</fadeIn>
            <fadeOut>1000</fadeOut>
        </snapshot>

        <snapshot name="Combat_LowHealth" guid="${generateFMODGuid()}">
            <description>Low health - reduced drums, increased tension</description>
            <parameter name="Intensity" value="0.7"/>
            <parameter name="StemVolume_drums" value="0.4"/>
            <parameter name="StemVolume_bass" value="1.0"/>
            <parameter name="StemVolume_atmosphere" value="1.0"/>
            <busVolume name="Music" value="-3.0"/>
            <effect name="LowPass" parameter="Cutoff" value="2000"/>
            <fadeIn>1000</fadeIn>
            <fadeOut>500</fadeOut>
        </snapshot>

        <!-- Stealth Snapshots -->
        <snapshot name="Stealth_Safe" guid="${generateFMODGuid()}">
            <description>Safe stealth - minimal, ambient feel</description>
            <parameter name="Intensity" value="0.2"/>
            <parameter name="StemVolume_drums" value="0.0"/>
            <parameter name="StemVolume_bass" value="0.3"/>
            <parameter name="StemVolume_melody" value="0.2"/>
            <parameter name="StemVolume_atmosphere" value="1.0"/>
            <busVolume name="Music" value="-6.0"/>
            <fadeIn>2000</fadeIn>
            <fadeOut>2000</fadeOut>
        </snapshot>

        <snapshot name="Stealth_Detected" guid="${generateFMODGuid()}">
            <description>Detection alert - rising tension</description>
            <parameter name="Intensity" value="0.6"/>
            <parameter name="StemVolume_drums" value="0.5"/>
            <parameter name="StemVolume_bass" value="0.8"/>
            <parameter name="StemVolume_fx" value="1.0"/>
            <busVolume name="Music" value="0.0"/>
            <fadeIn>200</fadeIn>
            <fadeOut>500</fadeOut>
        </snapshot>

        <!-- Exploration Snapshots -->
        <snapshot name="Exploration_Calm" guid="${generateFMODGuid()}">
            <description>Calm exploration - peaceful ambient</description>
            <parameter name="Intensity" value="0.3"/>
            <parameter name="StemVolume_drums" value="0.2"/>
            <parameter name="StemVolume_melody" value="0.6"/>
            <parameter name="StemVolume_harmony" value="1.0"/>
            <parameter name="StemVolume_atmosphere" value="1.0"/>
            <busVolume name="Music" value="-3.0"/>
            <fadeIn>3000</fadeIn>
            <fadeOut>3000</fadeOut>
        </snapshot>

        <snapshot name="Exploration_Discovery" guid="${generateFMODGuid()}">
            <description>Discovery moment - uplifting reveal</description>
            <parameter name="Intensity" value="0.7"/>
            <parameter name="StemVolume_melody" value="1.0"/>
            <parameter name="StemVolume_harmony" value="1.0"/>
            <parameter name="StemVolume_fx" value="0.8"/>
            <busVolume name="Music" value="2.0"/>
            <fadeIn>500</fadeIn>
            <fadeOut>2000</fadeOut>
        </snapshot>
    </folder>
</snapshots>
`;
}

// ==================== Bank Configuration ====================

/**
 * Generate FMOD bank configuration
 */
export function generateFMODBankConfig(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<banks version="2.02">
    <bank name="${projectName}_Master" guid="${generateFMODGuid()}">
        <type>master</type>
        <output>Desktop</output>
        <compression>Vorbis</compression>
        <compressionQuality>80</compressionQuality>

        <contents>
            <folder>/Events/${projectName}</folder>
            <folder>/Parameters/${projectName}</folder>
            <folder>/Snapshots/${projectName}</folder>
        </contents>
    </bank>

    <bank name="${projectName}_Music" guid="${generateFMODGuid()}">
        <type>streaming</type>
        <output>Desktop</output>
        <compression>Vorbis</compression>
        <compressionQuality>90</compressionQuality>

        <contents>
${bundles.map((b) => `            <event>Music_${b.gameState}</event>`).join("\n")}
        </contents>
    </bank>

    <bank name="${projectName}_Strings" guid="${generateFMODGuid()}">
        <type>strings</type>
        <output>Desktop</output>

        <strings>
${bundles.map((b) => `            <string key="event:/Music/${b.gameState}" value="${b.name}"/>`).join("\n")}
        </strings>
    </bank>
</banks>
`;
}

// ==================== Integration Guide ====================

/**
 * Generate integration guide for game engines
 */
export function generateFMODIntegrationGuide(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `# ${projectName} - FMOD Integration Guide

## Unity Integration

### Setup
\`\`\`csharp
using FMODUnity;
using FMOD.Studio;

public class SwanbladeAudioManager : MonoBehaviour
{
    private EventInstance musicInstance;
    private PARAMETER_ID gameStateParam;
    private PARAMETER_ID intensityParam;

    void Start()
    {
        // Get parameter IDs
        EventDescription desc;
        RuntimeManager.StudioSystem.getEvent("event:/${projectName}/Music_menu", out desc);
        desc.getParameterDescriptionByName("GameState", out PARAMETER_DESCRIPTION gameStateDesc);
        gameStateParam = gameStateDesc.id;
        desc.getParameterDescriptionByName("Intensity", out PARAMETER_DESCRIPTION intensityDesc);
        intensityParam = intensityDesc.id;

        // Start with menu music
        SetGameState(GameState.Menu);
    }

    public void SetGameState(GameState state)
    {
        // Stop current music with fade
        if (musicInstance.isValid())
        {
            musicInstance.stop(FMOD.Studio.STOP_MODE.ALLOWFADEOUT);
            musicInstance.release();
        }

        // Start new music
        string eventPath = $"event:/${projectName}/Music_{state.ToString().ToLower()}";
        musicInstance = RuntimeManager.CreateInstance(eventPath);
        musicInstance.start();
    }

    public void SetIntensity(float intensity)
    {
        if (musicInstance.isValid())
        {
            musicInstance.setParameterByID(intensityParam, intensity);
        }
    }

    public void SetStemVolume(string stemName, float volume)
    {
        if (musicInstance.isValid())
        {
            musicInstance.setParameterByName($"StemVolume_{stemName}", volume);
        }
    }
}
\`\`\`

### Snapshot Usage
\`\`\`csharp
// Apply a snapshot
RuntimeManager.PlayOneShot("snapshot:/${projectName}/Combat_FullIntensity");

// Or use StudioEventEmitter component for automatic management
\`\`\`

## Unreal Engine Integration

### Setup (C++)
\`\`\`cpp
#include "FMODStudioModule.h"
#include "FMODBlueprintStatics.h"

void ASwanbladeAudioManager::SetGameState(EGameState NewState)
{
    // Stop current music
    if (MusicInstance.Instance)
    {
        MusicInstance.Instance->stop(FMOD_STUDIO_STOP_ALLOWFADEOUT);
        MusicInstance.Instance->release();
    }

    // Get event path
    FString EventPath = FString::Printf(TEXT("event:/${projectName}/Music_%s"),
        *UEnum::GetValueAsString(NewState).ToLower());

    // Start new music
    UFMODBlueprintStatics::PlayEvent2D(this, LoadObject<UFMODEvent>(nullptr, *EventPath), true);
}

void ASwanbladeAudioManager::SetIntensity(float Intensity)
{
    UFMODBlueprintStatics::SetGlobalParameterByName(TEXT("Intensity"), Intensity);
}
\`\`\`

## Available Events

| Event | Description |
|-------|-------------|
${bundles.map((b) => `| \`event:/${projectName}/Music_${b.gameState}\` | ${b.name} (${b.manifest.bpm} BPM, ${b.stems.length} stems) |`).join("\n")}
${bundles.map((b) => `| \`event:/${projectName}/Control/Control_${b.gameState}\` | Switch to ${b.gameState} state |`).join("\n")}

## Parameters

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| GameState | Labeled | 0-${bundles.length - 1} | Current game state |
| Intensity | Continuous | 0-1 | Music intensity |
| Health | Continuous | 0-100 | Player health |
| CombatThreat | Continuous | 0-100 | Combat threat level |
| Stealth | Continuous | 0-100 | Stealth detection |
| StemVolume_* | Continuous | 0-1 | Individual stem volumes |

## Snapshots

| Snapshot | Use Case |
|----------|----------|
| Combat_FullIntensity | Full combat engagement |
| Combat_LowHealth | Player in danger |
| Stealth_Safe | Undetected stealth |
| Stealth_Detected | Detection alert |
| Exploration_Calm | Peaceful exploration |
| Exploration_Discovery | Discovery moment |

---
Generated by Swanblade | https://swanblade.io
`;
}

// ==================== README ====================

/**
 * Generate README for FMOD package
 */
export function generateFMODReadme(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `# ${projectName} - Swanblade Audio Package for FMOD Studio

## Overview

This FMOD Studio package was generated by Swanblade and contains:
- ${bundles.length} multi-track event(s) for different game states
- Parameter definitions for adaptive audio
- Snapshot presets for quick mixing
- Bank configuration for deployment
- Integration guides for Unity and Unreal

## Quick Start

1. **Open FMOD Studio** (2.02 or later)
2. **Import** the package contents
3. **Build banks** for your target platform
4. **Integrate** using the provided guides

## Audio Bundles

${bundles.map((b) => `- **${b.name}** (${b.gameState}): ${b.stems.length} stems, ${b.manifest.bpm} BPM, ${b.manifest.duration}s`).join("\n")}

## Features

### Multi-Track Events
Each music event contains separate tracks for:
- Drums (foundation)
- Bass (foundation)
- Melody (accent)
- Harmony (atmosphere)
- Atmosphere (ambient)
- FX (transitions)
- Vocals (when applicable)

### Adaptive Parameters
- **GameState**: Switch between musical states
- **Intensity**: Scale overall energy
- **StemVolume_***: Control individual stems

### Snapshots
Pre-configured mixing states for common game scenarios:
- Combat intensity levels
- Stealth states
- Exploration moods

## File Structure

\`\`\`
${projectName}/
├── Events/
│   └── ${projectName}/
│       ├── Music_*.fspro          # Music events
│       └── Control/               # Control events
├── Parameters/
│   └── ${projectName}.fspro       # Parameter definitions
├── Snapshots/
│   └── ${projectName}.fspro       # Snapshot presets
├── Banks/
│   └── ${projectName}.xml         # Bank configuration
├── IntegrationGuide.md            # Game engine guides
└── README.md
\`\`\`

---
Generated by Swanblade | https://swanblade.io
`;
}

// ==================== Full Package Generation ====================

/**
 * Generate complete FMOD package
 */
export function generateFMODPackage(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): FMODPackage {
  const manifest: FMODManifest = {
    name: projectName,
    version: "1.0.0",
    fmodVersion: "2.02",
    generator: "swanblade",
    generatedAt: new Date().toISOString(),
    bundles: bundles.map((b) => ({
      id: b.id,
      name: b.name,
      gameState: b.gameState,
      stemCount: b.stems.length,
      bpm: b.manifest.bpm,
      duration: b.manifest.duration,
    })),
  };

  return {
    manifest,
    projectConfig: generateFMODProjectConfig(bundles, projectName),
    eventDefinitions: generateFMODEventDefinitions(bundles, projectName),
    parameterDefinitions: generateFMODParameterDefinitions(bundles, projectName),
    snapshotPresets: generateFMODSnapshotPresets(projectName),
    bankConfig: generateFMODBankConfig(bundles, projectName),
    integrationGuide: generateFMODIntegrationGuide(bundles, projectName),
    readme: generateFMODReadme(bundles, projectName),
  };
}

// ==================== Helpers ====================

function generateFMODGuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function gameStateToValue(state: GameState): number {
  const states: GameState[] = [
    "menu",
    "exploration",
    "combat",
    "boss",
    "victory",
    "defeat",
    "stealth",
    "ambient",
    "tension",
    "chase",
    "cutscene",
    "credits",
  ];
  return states.indexOf(state);
}
