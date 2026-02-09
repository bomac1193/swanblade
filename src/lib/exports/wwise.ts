/**
 * Wwise Export - Full Project Generation
 *
 * Generates complete Wwise-ready packages including:
 * - Work unit XML files
 * - Event definitions
 * - Switch/State groups
 * - RTPC definitions
 * - Music segment setup
 */

import type { StemBundle } from "../stemGenerator";
import type { GameState } from "../gameStateEngine";

// ==================== Wwise Package Types ====================

export interface WwisePackage {
  manifest: WwiseManifest;
  workUnit: string;
  eventDefinitions: string;
  switchGroups: string;
  rtpcDefinitions: string;
  musicSetup: string;
  soundbankConfig: string;
  readme: string;
}

export interface WwiseManifest {
  name: string;
  version: string;
  wwiseVersion: string;
  generator: string;
  generatedAt: string;
  bundles: WwiseBundleInfo[];
}

export interface WwiseBundleInfo {
  id: string;
  name: string;
  gameState: GameState;
  stemCount: number;
  bpm: number;
}

// ==================== Work Unit Generation ====================

/**
 * Generate Wwise work unit XML
 */
export function generateWwiseWorkUnit(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  const workUnitId = generateWwiseId();

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="{${workUnitId}}" SchemaVersion="119">
    <AudioObjects>
        <WorkUnit Name="${projectName}" ID="{${workUnitId}}" PersistMode="Standalone">
            <ChildrenList>
                <!-- Game State Actor-Mixers -->
${bundles.map((b) => generateBundleActorMixer(b)).join("\n")}
            </ChildrenList>
        </WorkUnit>
    </AudioObjects>
</WwiseDocument>
`;
}

function generateBundleActorMixer(bundle: StemBundle): string {
  const actorMixerId = generateWwiseId();
  const stems = bundle.stems;

  return `                <ActorMixer Name="${bundle.name}" ID="{${actorMixerId}}" ShortID="${shortId()}">
                    <PropertyList>
                        <Property Name="Tempo" Type="Real64" Value="${bundle.manifest.bpm}"/>
                        <Property Name="TimeSignatureLower" Type="int32" Value="4"/>
                        <Property Name="TimeSignatureUpper" Type="int32" Value="4"/>
                    </PropertyList>
                    <ChildrenList>
${stems.map((stem) => `                        <Sound Name="${stem.stemType}" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                            <ReferenceList>
                                <Reference Name="Conversion">
                                    <ObjectRef Name="Default Conversion Settings" ID="{${generateWwiseId()}}" WorkUnitID="{${generateWwiseId()}}"/>
                                </Reference>
                                <Reference Name="OutputBus">
                                    <ObjectRef Name="Master Audio Bus" ID="{${generateWwiseId()}}" WorkUnitID="{${generateWwiseId()}}"/>
                                </Reference>
                            </ReferenceList>
                            <ChildrenList>
                                <AudioFileSource Name="${stem.stemType}" ID="{${generateWwiseId()}}">
                                    <Language>SFX</Language>
                                    <AudioFile>${stem.stemType}.wav</AudioFile>
                                </AudioFileSource>
                            </ChildrenList>
                        </Sound>`).join("\n")}
                    </ChildrenList>
                </ActorMixer>`;
}

// ==================== Event Definitions ====================

/**
 * Generate Wwise event definitions
 */
export function generateWwiseEventDefinitions(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  const workUnitId = generateWwiseId();

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="{${workUnitId}}" SchemaVersion="119">
    <Events>
        <WorkUnit Name="${projectName}_Events" ID="{${workUnitId}}" PersistMode="Standalone">
            <ChildrenList>
                <!-- Play Events -->
${bundles.map((b) => `                <Event Name="Play_${b.gameState}" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <ActionList>
                        <Action Name="" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                            <PropertyList>
                                <Property Name="ActionType" Type="int16" Value="1"/>
                                <Property Name="FadeInCurve" Type="int16" Value="4"/>
                                <Property Name="FadeTime" Type="Real64" Value="1.5"/>
                            </PropertyList>
                            <ReferenceList>
                                <Reference Name="Target">
                                    <ObjectRef Name="${b.name}" ID="{${generateWwiseId()}}"/>
                                </Reference>
                            </ReferenceList>
                        </Action>
                    </ActionList>
                </Event>
                <Event Name="Stop_${b.gameState}" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <ActionList>
                        <Action Name="" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                            <PropertyList>
                                <Property Name="ActionType" Type="int16" Value="2"/>
                                <Property Name="FadeOutCurve" Type="int16" Value="4"/>
                                <Property Name="FadeTime" Type="Real64" Value="1.5"/>
                            </PropertyList>
                            <ReferenceList>
                                <Reference Name="Target">
                                    <ObjectRef Name="${b.name}" ID="{${generateWwiseId()}}"/>
                                </Reference>
                            </ReferenceList>
                        </Action>
                    </ActionList>
                </Event>`).join("\n")}

                <!-- State Change Events -->
${bundles.map((b) => `                <Event Name="SetState_${b.gameState}" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <ActionList>
                        <Action Name="" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                            <PropertyList>
                                <Property Name="ActionType" Type="int16" Value="19"/>
                            </PropertyList>
                            <ReferenceList>
                                <Reference Name="Target">
                                    <ObjectRef Name="${b.gameState}" ID="{${generateWwiseId()}}"/>
                                </Reference>
                            </ReferenceList>
                        </Action>
                    </ActionList>
                </Event>`).join("\n")}
            </ChildrenList>
        </WorkUnit>
    </Events>
</WwiseDocument>
`;
}

// ==================== Switch Groups ====================

/**
 * Generate Wwise switch/state group definitions
 */
export function generateWwiseSwitchGroups(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  const workUnitId = generateWwiseId();
  const stateGroupId = generateWwiseId();
  const states = [...new Set(bundles.map((b) => b.gameState))];

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="{${workUnitId}}" SchemaVersion="119">
    <StateGroups>
        <WorkUnit Name="${projectName}_States" ID="{${workUnitId}}" PersistMode="Standalone">
            <ChildrenList>
                <!-- Game State Group -->
                <StateGroup Name="GameState" ID="{${stateGroupId}}" ShortID="${shortId()}">
                    <PropertyList>
                        <Property Name="DefaultTransitionTime" Type="Real64" Value="1500"/>
                    </PropertyList>
                    <ChildrenList>
${states.map((state) => `                        <State Name="${state}" ID="{${generateWwiseId()}}" ShortID="${shortId()}"/>`).join("\n")}
                    </ChildrenList>
                </StateGroup>

                <!-- Stem Mix State Group -->
                <StateGroup Name="StemMix" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <PropertyList>
                        <Property Name="DefaultTransitionTime" Type="Real64" Value="500"/>
                    </PropertyList>
                    <ChildrenList>
                        <State Name="Full" ID="{${generateWwiseId()}}" ShortID="${shortId()}"/>
                        <State Name="NoDrums" ID="{${generateWwiseId()}}" ShortID="${shortId()}"/>
                        <State Name="Ambient" ID="{${generateWwiseId()}}" ShortID="${shortId()}"/>
                        <State Name="Minimal" ID="{${generateWwiseId()}}" ShortID="${shortId()}"/>
                    </ChildrenList>
                </StateGroup>
            </ChildrenList>
        </WorkUnit>
    </StateGroups>
</WwiseDocument>
`;
}

// ==================== RTPC Definitions ====================

/**
 * Generate Wwise RTPC (Game Parameter) definitions
 */
export function generateWwiseRTPCDefinitions(
  projectName: string = "SwanbladeAudio"
): string {
  const workUnitId = generateWwiseId();

  const rtpcs = [
    { name: "Health", min: 0, max: 100, default: 100, description: "Player health percentage" },
    { name: "CombatIntensity", min: 0, max: 100, default: 0, description: "Combat intensity level" },
    { name: "Stealth", min: 0, max: 100, default: 0, description: "Stealth meter value" },
    { name: "Tension", min: 0, max: 100, default: 0, description: "Environmental tension" },
    { name: "DrumVolume", min: 0, max: 100, default: 100, description: "Drums stem volume" },
    { name: "BassVolume", min: 0, max: 100, default: 100, description: "Bass stem volume" },
    { name: "MelodyVolume", min: 0, max: 100, default: 100, description: "Melody stem volume" },
    { name: "AtmosphereVolume", min: 0, max: 100, default: 100, description: "Atmosphere stem volume" },
  ];

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="{${workUnitId}}" SchemaVersion="119">
    <GameParameters>
        <WorkUnit Name="${projectName}_RTPCs" ID="{${workUnitId}}" PersistMode="Standalone">
            <ChildrenList>
${rtpcs.map((rtpc) => `                <!-- ${rtpc.description} -->
                <GameParameter Name="${rtpc.name}" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <PropertyList>
                        <Property Name="InitialValue" Type="Real64" Value="${rtpc.default}"/>
                        <Property Name="Max" Type="Real64" Value="${rtpc.max}"/>
                        <Property Name="Min" Type="Real64" Value="${rtpc.min}"/>
                        <Property Name="SimulationValue" Type="Real64" Value="${rtpc.default}"/>
                    </PropertyList>
                </GameParameter>`).join("\n")}
            </ChildrenList>
        </WorkUnit>
    </GameParameters>
</WwiseDocument>
`;
}

// ==================== Music Segment Setup ====================

/**
 * Generate Wwise music segment structure
 */
export function generateWwiseMusicSetup(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  const workUnitId = generateWwiseId();

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="{${workUnitId}}" SchemaVersion="119">
    <InteractiveMusic>
        <WorkUnit Name="${projectName}_Music" ID="{${workUnitId}}" PersistMode="Standalone">
            <ChildrenList>
                <MusicSwitchContainer Name="${projectName}_MusicSwitch" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                    <PropertyList>
                        <Property Name="ContinuePlayback" Type="bool" Value="True"/>
                        <Property Name="TransitionMode" Type="int16" Value="2"/>
                    </PropertyList>
                    <ReferenceList>
                        <Reference Name="SwitchGroupOrStateGroup">
                            <ObjectRef Name="GameState" ID="{${generateWwiseId()}}"/>
                        </Reference>
                    </ReferenceList>
                    <ChildrenList>
${bundles.map((b) => generateMusicSegment(b)).join("\n")}
                    </ChildrenList>
                    <TransitionList>
${generateMusicTransitions(bundles)}
                    </TransitionList>
                </MusicSwitchContainer>
            </ChildrenList>
        </WorkUnit>
    </InteractiveMusic>
</WwiseDocument>
`;
}

function generateMusicSegment(bundle: StemBundle): string {
  const segmentId = generateWwiseId();
  const beatsPerBar = 4;
  const barsPerSegment = Math.ceil(bundle.manifest.duration / (60 / bundle.manifest.bpm * beatsPerBar));

  return `                        <MusicSegment Name="${bundle.name}_Segment" ID="{${segmentId}}" ShortID="${shortId()}">
                            <PropertyList>
                                <Property Name="Tempo" Type="Real64" Value="${bundle.manifest.bpm}"/>
                                <Property Name="TimeSignatureLower" Type="int32" Value="4"/>
                                <Property Name="TimeSignatureUpper" Type="int32" Value="4"/>
                                <Property Name="EndPosition" Type="Real64" Value="${bundle.manifest.duration * 1000}"/>
                            </PropertyList>
                            <ChildrenList>
${bundle.stems.map((stem, i) => `                                <MusicTrack Name="${stem.stemType}_Track" ID="{${generateWwiseId()}}" ShortID="${shortId()}">
                                    <PropertyList>
                                        <Property Name="Volume" Type="Real64" Value="0"/>
                                    </PropertyList>
                                    <ChildrenList>
                                        <MusicTrackSequence Name="" ID="{${generateWwiseId()}}">
                                            <ClipList>
                                                <MusicClip Name="${stem.stemType}" ID="{${generateWwiseId()}}">
                                                    <PropertyList>
                                                        <Property Name="Duration" Type="Real64" Value="${bundle.manifest.duration * 1000}"/>
                                                    </PropertyList>
                                                    <AudioSourceRef Name="${stem.stemType}" ID="{${generateWwiseId()}}"/>
                                                </MusicClip>
                                            </ClipList>
                                        </MusicTrackSequence>
                                    </ChildrenList>
                                </MusicTrack>`).join("\n")}
                            </ChildrenList>
                            <Associations>
                                <SwitchAssociations>
                                    <SwitchAssociation>
                                        <SwitchPath>
                                            <SwitchRef Name="${bundle.gameState}" ID="{${generateWwiseId()}}"/>
                                        </SwitchPath>
                                    </SwitchAssociation>
                                </SwitchAssociations>
                            </Associations>
                        </MusicSegment>`;
}

function generateMusicTransitions(bundles: StemBundle[]): string {
  const transitions: string[] = [];

  // Default transition (any to any)
  transitions.push(`                        <MusicTransition Name="Default_Transition" ID="{${generateWwiseId()}}">
                            <PropertyList>
                                <Property Name="IsFolder" Type="bool" Value="False"/>
                            </PropertyList>
                            <TransitionInfo>
                                <Source>
                                    <AnyObject/>
                                    <ExitSync Type="NextBar"/>
                                </Source>
                                <Destination>
                                    <AnyObject/>
                                    <EntrySync Type="SameTime"/>
                                </Destination>
                                <FadeParams>
                                    <FadeIn>
                                        <PropertyList>
                                            <Property Name="FadeCurve" Type="int16" Value="4"/>
                                            <Property Name="FadeTime" Type="Real64" Value="1000"/>
                                        </PropertyList>
                                    </FadeIn>
                                    <FadeOut>
                                        <PropertyList>
                                            <Property Name="FadeCurve" Type="int16" Value="4"/>
                                            <Property Name="FadeTime" Type="Real64" Value="1000"/>
                                        </PropertyList>
                                    </FadeOut>
                                </FadeParams>
                            </TransitionInfo>
                        </MusicTransition>`);

  return transitions.join("\n");
}

// ==================== Soundbank Config ====================

/**
 * Generate Wwise soundbank configuration
 */
export function generateWwiseSoundbankConfig(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<SoundBanks Version="3">
    <SoundBank Name="${projectName}_Main" Language="SFX">
        <IncludedEvents>
${bundles.map((b) => `            <Event Name="Play_${b.gameState}"/>
            <Event Name="Stop_${b.gameState}"/>
            <Event Name="SetState_${b.gameState}"/>`).join("\n")}
        </IncludedEvents>
        <IncludedBusses>
            <Bus Name="Master Audio Bus"/>
        </IncludedBusses>
        <IncludedGameParameters>
            <GameParameter Name="Health"/>
            <GameParameter Name="CombatIntensity"/>
            <GameParameter Name="Stealth"/>
            <GameParameter Name="Tension"/>
            <GameParameter Name="DrumVolume"/>
            <GameParameter Name="BassVolume"/>
            <GameParameter Name="MelodyVolume"/>
            <GameParameter Name="AtmosphereVolume"/>
        </IncludedGameParameters>
        <IncludedStates>
            <StateGroup Name="GameState"/>
            <StateGroup Name="StemMix"/>
        </IncludedStates>
    </SoundBank>
</SoundBanks>
`;
}

// ==================== README ====================

/**
 * Generate README for Wwise package
 */
export function generateWwiseReadme(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): string {
  return `# ${projectName} - Swanblade Audio Package for Wwise

## Overview

This Wwise package was generated by Swanblade and contains:
- ${bundles.length} music segment(s) for different game states
- Event definitions for playback control
- State groups for game state management
- RTPC definitions for parameter-driven mixing
- Music Switch Container for seamless transitions

## Import Instructions

1. **Create a new Wwise project** or open an existing one
2. **Import work units** from the \`WorkUnits\` folder
3. **Import audio files** from the \`Audio\` folder
4. **Generate SoundBanks** using the provided configuration

## Structure

\`\`\`
${projectName}/
├── WorkUnits/
│   ├── ${projectName}_Actors.wwu      # Actor-Mixers with audio
│   ├── ${projectName}_Events.wwu      # Play/Stop/State events
│   ├── ${projectName}_States.wwu      # State and Switch groups
│   ├── ${projectName}_RTPCs.wwu       # Game Parameters
│   └── ${projectName}_Music.wwu       # Music segments
├── Audio/
│   └── [stem audio files]
├── SoundBanks/
│   └── ${projectName}_Main.xml        # Soundbank config
└── README.md
\`\`\`

## Events

${bundles.map((b) => `### ${b.gameState}
- \`Play_${b.gameState}\` - Start playback with crossfade
- \`Stop_${b.gameState}\` - Stop playback with fadeout
- \`SetState_${b.gameState}\` - Set game state (triggers switch)`).join("\n\n")}

## Game Parameters (RTPCs)

| Parameter | Range | Description |
|-----------|-------|-------------|
| Health | 0-100 | Player health percentage |
| CombatIntensity | 0-100 | Combat intensity level |
| Stealth | 0-100 | Stealth meter value |
| Tension | 0-100 | Environmental tension |
| DrumVolume | 0-100 | Drums stem volume |
| BassVolume | 0-100 | Bass stem volume |
| MelodyVolume | 0-100 | Melody stem volume |
| AtmosphereVolume | 0-100 | Atmosphere stem volume |

## Integration Example (C++)

\`\`\`cpp
#include <AK/SoundEngine/Common/AkSoundEngine.h>

// Post event
AK::SoundEngine::PostEvent("Play_combat", gameObjectID);

// Set RTPC
AK::SoundEngine::SetRTPCValue("Health", playerHealth, gameObjectID);

// Set state
AK::SoundEngine::SetState("GameState", "combat");
\`\`\`

---
Generated by Swanblade | https://swanblade.io
`;
}

// ==================== Full Package Generation ====================

/**
 * Generate complete Wwise package
 */
export function generateWwisePackage(
  bundles: StemBundle[],
  projectName: string = "SwanbladeAudio"
): WwisePackage {
  const manifest: WwiseManifest = {
    name: projectName,
    version: "1.0.0",
    wwiseVersion: "2023.1",
    generator: "swanblade",
    generatedAt: new Date().toISOString(),
    bundles: bundles.map((b) => ({
      id: b.id,
      name: b.name,
      gameState: b.gameState,
      stemCount: b.stems.length,
      bpm: b.manifest.bpm,
    })),
  };

  return {
    manifest,
    workUnit: generateWwiseWorkUnit(bundles, projectName),
    eventDefinitions: generateWwiseEventDefinitions(bundles, projectName),
    switchGroups: generateWwiseSwitchGroups(bundles, projectName),
    rtpcDefinitions: generateWwiseRTPCDefinitions(projectName),
    musicSetup: generateWwiseMusicSetup(bundles, projectName),
    soundbankConfig: generateWwiseSoundbankConfig(bundles, projectName),
    readme: generateWwiseReadme(bundles, projectName),
  };
}

// ==================== Helpers ====================

function generateWwiseId(): string {
  // Generate a GUID-like ID for Wwise
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

function shortId(): number {
  // Generate a short numeric ID (1-999999999)
  return Math.floor(Math.random() * 999999999) + 1;
}
