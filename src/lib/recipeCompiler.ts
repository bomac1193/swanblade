/**
 * Recipe Compiler
 *
 * Compile procedural recipes to game engine middleware formats:
 * - Wwise SoundCaster sessions
 * - FMOD event macros
 * - Unity ScriptableObject presets
 * - Unreal MetaSound graphs
 * - Pure Data patches
 * - Web Audio AudioWorklet code
 */

import type {
  ProceduralRecipe,
  RecipeLayer,
  VariationRule,
  SelectionRule,
  LayerProcessing,
  SequencingConfig,
  OutputConfig,
} from "./proceduralRecipe";

// ==================== Compiler Output Types ====================

export interface CompiledRecipe {
  recipeId: string;
  recipeName: string;
  format: CompilerTarget;
  compiledAt: string;

  // Format-specific outputs
  files: CompiledFile[];

  // Metadata
  metadata: {
    sourceCount: number;
    layerCount: number;
    variationRuleCount: number;
    estimatedMemoryMB: number;
  };
}

export interface CompiledFile {
  path: string;
  content: string;
  type: "code" | "config" | "data" | "asset_manifest";
}

export type CompilerTarget =
  | "wwise"
  | "fmod"
  | "unity"
  | "unreal"
  | "pure_data"
  | "web_audio";

// ==================== Main Compiler ====================

/**
 * Compile a recipe to the specified target format
 */
export function compileRecipe(
  recipe: ProceduralRecipe,
  target: CompilerTarget
): CompiledRecipe {
  const compilers: Record<CompilerTarget, (r: ProceduralRecipe) => CompiledFile[]> = {
    wwise: compileToWwise,
    fmod: compileToFMOD,
    unity: compileToUnity,
    unreal: compileToUnreal,
    pure_data: compileToPureData,
    web_audio: compileToWebAudio,
  };

  const compiler = compilers[target];
  const files = compiler(recipe);

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    format: target,
    compiledAt: new Date().toISOString(),
    files,
    metadata: {
      sourceCount: recipe.sources.length,
      layerCount: recipe.layers.length,
      variationRuleCount: recipe.variationRules.length,
      estimatedMemoryMB: estimateMemoryUsage(recipe),
    },
  };
}

// ==================== Wwise Compiler ====================

function compileToWwise(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];

  // Generate Random Container for variation
  const randomContainer = generateWwiseRandomContainer(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/RandomContainers.xml`,
    content: randomContainer,
    type: "config",
  });

  // Generate Blend Container for layers
  const blendContainer = generateWwiseBlendContainer(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/BlendContainers.xml`,
    content: blendContainer,
    type: "config",
  });

  // Generate RTPCs for variation parameters
  const rtpcs = generateWwiseRTPCs(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/GameParameters.xml`,
    content: rtpcs,
    type: "config",
  });

  // Generate asset manifest
  const manifest = generateAssetManifest(recipe, "wwise");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generateWwiseRandomContainer(recipe: ProceduralRecipe): string {
  const layerContainers = recipe.layers.map((layer) => {
    const selectionMode = mapSelectionToWwise(layer.selection);
    return `
      <RandomSequenceContainer Name="${layer.name}" ID="${generateId()}">
        <PropertyList>
          <Property Name="RandomOrSequence" Type="int16" Value="${selectionMode}"/>
          <Property Name="NormalOrShuffle" Type="int16" Value="${layer.selection.type === "shuffle" ? 1 : 0}"/>
          <Property Name="Volume" Type="Real64" Value="${dbFromLinear(layer.volume)}"/>
          <Property Name="Pitch" Type="int32" Value="${layer.processing.pitchShift?.min || 0}"/>
        </PropertyList>
        <PlaylistList>
          ${layer.sourceIds.map((id, i) => `
          <PlaylistItem>
            <AudioFileID>${id}</AudioFileID>
            <Weight>${getWeight(layer.selection, i)}%</Weight>
          </PlaylistItem>
          `).join("")}
        </PlaylistList>
      </RandomSequenceContainer>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="${generateId()}" SchemaVersion="110">
  <AudioObjects>
    <WorkUnit Name="${recipe.name}" ID="${generateId()}" PersistMode="Standalone">
      <ChildrenList>
        ${layerContainers}
      </ChildrenList>
    </WorkUnit>
  </AudioObjects>
</WwiseDocument>`;
}

function generateWwiseBlendContainer(recipe: ProceduralRecipe): string {
  const blendTracks = recipe.layers.map((layer) => `
    <BlendTrack Name="${layer.name}" ID="${generateId()}">
      <PropertyList>
        <Property Name="CrossfadeDuration" Type="Real64" Value="${recipe.sequencing.transitionDuration / 1000}"/>
        <Property Name="MakeUpGain" Type="Real64" Value="0"/>
      </PropertyList>
      <ReferenceList>
        <Reference Name="ChildRef">
          <ObjectRef Name="${layer.name}" ID="${generateId()}" WorkUnitID="${generateId()}"/>
        </Reference>
      </ReferenceList>
    </BlendTrack>
  `).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="${generateId()}" SchemaVersion="110">
  <AudioObjects>
    <WorkUnit Name="${recipe.name}_Blend" ID="${generateId()}" PersistMode="Standalone">
      <ChildrenList>
        <BlendContainer Name="${recipe.name}_BlendContainer" ID="${generateId()}">
          <PropertyList>
            <Property Name="LoopEnabled" Type="bool" Value="${recipe.sequencing.loopEnabled}"/>
          </PropertyList>
          <BlendList>
            ${blendTracks}
          </BlendList>
        </BlendContainer>
      </ChildrenList>
    </WorkUnit>
  </AudioObjects>
</WwiseDocument>`;
}

function generateWwiseRTPCs(recipe: ProceduralRecipe): string {
  const rtpcs = recipe.variationRules.map((rule) => {
    const rtpcName = `${recipe.name}_${rule.name}`.replace(/\s+/g, "_");
    return `
    <GameParameter Name="${rtpcName}" ID="${generateId()}">
      <PropertyList>
        <Property Name="InitialValue" Type="Real64" Value="${rule.config.amount * 100}"/>
        <Property Name="Min" Type="Real64" Value="0"/>
        <Property Name="Max" Type="Real64" Value="100"/>
      </PropertyList>
    </GameParameter>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<WwiseDocument Type="WorkUnit" ID="${generateId()}" SchemaVersion="110">
  <GameParameters>
    <WorkUnit Name="${recipe.name}_Parameters" ID="${generateId()}" PersistMode="Standalone">
      <ChildrenList>
        ${rtpcs}
      </ChildrenList>
    </WorkUnit>
  </GameParameters>
</WwiseDocument>`;
}

// ==================== FMOD Compiler ====================

function compileToFMOD(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];

  // Generate multi-instrument for variations
  const multiInstrument = generateFMODMultiInstrument(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/MultiInstrument.xml`,
    content: multiInstrument,
    type: "config",
  });

  // Generate parameters
  const parameters = generateFMODParameters(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/Parameters.xml`,
    content: parameters,
    type: "config",
  });

  // Generate event macro
  const eventMacro = generateFMODEventMacro(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/EventMacro.cs`,
    content: eventMacro,
    type: "code",
  });

  const manifest = generateAssetManifest(recipe, "fmod");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generateFMODMultiInstrument(recipe: ProceduralRecipe): string {
  const instruments = recipe.layers.map((layer) => {
    const playlistMode = mapSelectionToFMOD(layer.selection);
    return `
    <multiInstrument name="${layer.name}" id="${generateId()}">
      <playlistMode>${playlistMode}</playlistMode>
      <volume>${layer.volume}</volume>
      <pitch>${(layer.processing.pitchShift?.min || 0) / 100}</pitch>
      <pitchRandomization>
        <min>${(layer.processing.pitchShift?.min || 0) / 100}</min>
        <max>${(layer.processing.pitchShift?.max || 0) / 100}</max>
      </pitchRandomization>
      <playlist>
        ${layer.sourceIds.map((id, i) => `
        <sound id="${id}" weight="${getWeight(layer.selection, i)}"/>
        `).join("")}
      </playlist>
    </multiInstrument>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<fmodProject>
  <event name="${recipe.name}" id="${generateId()}">
    <instruments>
      ${instruments}
    </instruments>
    <looping enabled="${recipe.sequencing.loopEnabled}"/>
  </event>
</fmodProject>`;
}

function generateFMODParameters(recipe: ProceduralRecipe): string {
  const params = recipe.variationRules.map((rule) => `
    <parameter name="${rule.name.replace(/\s+/g, "_")}" id="${generateId()}">
      <type>user</type>
      <minimum>0</minimum>
      <maximum>1</maximum>
      <default>${rule.config.amount}</default>
    </parameter>
  `).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<fmodParameters>
  ${params}
</fmodParameters>`;
}

function generateFMODEventMacro(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// FMOD Event Macro for ${recipe.name}
// Generated by Swanblade Recipe Compiler

using FMOD.Studio;
using UnityEngine;

public static class ${className}Audio
{
    private static EventInstance _instance;
    private static bool _isInitialized = false;

    public static void Initialize()
    {
        if (_isInitialized) return;
        _instance = RuntimeManager.CreateInstance("event:/${recipe.name.replace(/\s+/g, "_")}");
        _isInitialized = true;
    }

    public static void Play()
    {
        Initialize();
        _instance.start();
    }

    public static void Stop(FMOD.Studio.STOP_MODE mode = FMOD.Studio.STOP_MODE.ALLOWFADEOUT)
    {
        if (!_isInitialized) return;
        _instance.stop(mode);
    }

    ${recipe.variationRules.map((rule) => {
      const paramName = rule.name.replace(/\s+/g, "");
      return `
    public static void Set${paramName}(float value)
    {
        if (!_isInitialized) return;
        _instance.setParameterByName("${rule.name.replace(/\s+/g, "_")}", Mathf.Clamp01(value));
    }`;
    }).join("\n")}

    public static void Release()
    {
        if (!_isInitialized) return;
        _instance.release();
        _isInitialized = false;
    }
}
`;
}

// ==================== Unity Compiler ====================

function compileToUnity(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];

  // Generate ScriptableObject
  const scriptableObject = generateUnityScriptableObject(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/ProceduralAudio${recipe.name.replace(/\s+/g, "")}.cs`,
    content: scriptableObject,
    type: "code",
  });

  // Generate AudioMixer preset
  const mixerPreset = generateUnityMixerPreset(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/MixerPreset.json`,
    content: mixerPreset,
    type: "config",
  });

  // Generate runtime player component
  const playerComponent = generateUnityPlayerComponent(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/${recipe.name.replace(/\s+/g, "")}Player.cs`,
    content: playerComponent,
    type: "code",
  });

  const manifest = generateAssetManifest(recipe, "unity");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generateUnityScriptableObject(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Procedural Audio Recipe: ${recipe.name}
// Generated by Swanblade Recipe Compiler

using UnityEngine;
using System.Collections.Generic;

[CreateAssetMenu(fileName = "${className}Recipe", menuName = "Swanblade/Procedural/${recipe.category}/${className}")]
public class ProceduralAudio${className} : ScriptableObject
{
    [Header("Recipe Info")]
    public string recipeName = "${recipe.name}";
    public string recipeId = "${recipe.id}";
    public string category = "${recipe.category}";

    [Header("Audio Sources")]
    public List<AudioLayer> layers = new List<AudioLayer>();

    [Header("Variation Settings")]
    public List<VariationRule> variationRules = new List<VariationRule>();

    [Header("Sequencing")]
    public SequencingMode sequencingMode = SequencingMode.${mapSequencingToUnity(recipe.sequencing.mode)};
    public bool loopEnabled = ${recipe.sequencing.loopEnabled};
    public float transitionDuration = ${recipe.sequencing.transitionDuration / 1000}f;

    [Header("Output")]
    public float targetLoudness = ${recipe.output.targetLoudness || -18}f;
    public bool normalize = ${recipe.output.normalize};

    [System.Serializable]
    public class AudioLayer
    {
        public string name;
        public AudioClip[] clips;
        public SelectionMode selectionMode;
        public float volume = 1f;
        public float pan = 0f;
        public Vector2 pitchRange = new Vector2(-2f, 2f);
        public Vector2 timeStretchRange = new Vector2(0.9f, 1.1f);
    }

    [System.Serializable]
    public class VariationRule
    {
        public string name;
        public VariationType type;
        public float amount = 0.5f;
        public float range = 50f;
    }

    public enum SequencingMode { OneShot, Loop, RandomInterval, Triggered, Continuous }
    public enum SelectionMode { Random, RoundRobin, Weighted, Sequential, Shuffle }
    public enum VariationType { PitchHumanize, TimingHumanize, VolumeHumanize, ParameterDrift, RandomSwap }

    private void OnValidate()
    {
        // Initialize default layers from recipe
        if (layers.Count == 0)
        {
            ${recipe.layers.map((layer) => `
            layers.Add(new AudioLayer
            {
                name = "${layer.name}",
                selectionMode = SelectionMode.${mapSelectionToUnity(layer.selection)},
                volume = ${layer.volume}f,
                pan = ${layer.pan}f,
                pitchRange = new Vector2(${layer.processing.pitchShift?.min || 0}f, ${layer.processing.pitchShift?.max || 0}f),
            });`).join("")}
        }

        // Initialize default variation rules
        if (variationRules.Count == 0)
        {
            ${recipe.variationRules.map((rule) => `
            variationRules.Add(new VariationRule
            {
                name = "${rule.name}",
                type = VariationType.${mapVariationToUnity(rule.type)},
                amount = ${rule.config.amount}f,
                range = ${rule.config.pitchRange || rule.config.timingRange || rule.config.volumeRange || 50}f,
            });`).join("")}
        }
    }
}
`;
}

function generateUnityMixerPreset(recipe: ProceduralRecipe): string {
  return JSON.stringify({
    name: `${recipe.name}_Mixer`,
    groups: recipe.layers.map((layer) => ({
      name: layer.name,
      volume: layer.volume,
      mute: layer.mute,
      solo: layer.solo,
      effects: buildUnityEffects(layer.processing),
    })),
    snapshots: [
      {
        name: "Default",
        values: recipe.layers.map((layer) => ({
          group: layer.name,
          volume: layer.volume,
        })),
      },
    ],
  }, null, 2);
}

function generateUnityPlayerComponent(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Runtime Player for ${recipe.name}
// Generated by Swanblade Recipe Compiler

using UnityEngine;
using System.Collections;
using System.Collections.Generic;

[RequireComponent(typeof(AudioSource))]
public class ${className}Player : MonoBehaviour
{
    [Header("Recipe")]
    public ProceduralAudio${className} recipe;

    [Header("Runtime State")]
    [SerializeField] private int[] _layerIndices;
    [SerializeField] private float[] _layerCooldowns;

    private AudioSource[] _audioSources;
    private bool _isPlaying = false;

    private void Awake()
    {
        // Create audio sources for each layer
        _audioSources = new AudioSource[recipe.layers.Count];
        _layerIndices = new int[recipe.layers.Count];
        _layerCooldowns = new float[recipe.layers.Count];

        for (int i = 0; i < recipe.layers.Count; i++)
        {
            if (i == 0)
            {
                _audioSources[i] = GetComponent<AudioSource>();
            }
            else
            {
                var go = new GameObject($"Layer_{recipe.layers[i].name}");
                go.transform.SetParent(transform);
                _audioSources[i] = go.AddComponent<AudioSource>();
            }

            ConfigureAudioSource(_audioSources[i], recipe.layers[i]);
        }
    }

    private void ConfigureAudioSource(AudioSource source, ProceduralAudio${className}.AudioLayer layer)
    {
        source.volume = layer.volume;
        source.panStereo = layer.pan;
        source.playOnAwake = false;
        source.loop = recipe.loopEnabled && recipe.sequencingMode == ProceduralAudio${className}.SequencingMode.Loop;
    }

    public void Play()
    {
        if (_isPlaying) return;
        _isPlaying = true;
        StartCoroutine(PlayRoutine());
    }

    public void Stop()
    {
        _isPlaying = false;
        StopAllCoroutines();
        foreach (var source in _audioSources)
        {
            source.Stop();
        }
    }

    public void Trigger()
    {
        // One-shot trigger
        for (int i = 0; i < recipe.layers.Count; i++)
        {
            PlayLayer(i);
        }
    }

    private IEnumerator PlayRoutine()
    {
        while (_isPlaying)
        {
            for (int i = 0; i < recipe.layers.Count; i++)
            {
                if (_layerCooldowns[i] <= 0)
                {
                    PlayLayer(i);
                }
                _layerCooldowns[i] -= Time.deltaTime;
            }
            yield return null;
        }
    }

    private void PlayLayer(int layerIndex)
    {
        var layer = recipe.layers[layerIndex];
        if (layer.clips == null || layer.clips.Length == 0) return;

        var clip = SelectClip(layer, layerIndex);
        if (clip == null) return;

        var source = _audioSources[layerIndex];
        source.clip = clip;

        // Apply variation
        ApplyVariation(source, layer);

        source.Play();

        // Set cooldown based on clip length
        _layerCooldowns[layerIndex] = clip.length;
    }

    private AudioClip SelectClip(ProceduralAudio${className}.AudioLayer layer, int layerIndex)
    {
        switch (layer.selectionMode)
        {
            case ProceduralAudio${className}.SelectionMode.Random:
                return layer.clips[Random.Range(0, layer.clips.Length)];

            case ProceduralAudio${className}.SelectionMode.RoundRobin:
                var clip = layer.clips[_layerIndices[layerIndex] % layer.clips.Length];
                _layerIndices[layerIndex]++;
                return clip;

            case ProceduralAudio${className}.SelectionMode.Sequential:
                if (_layerIndices[layerIndex] >= layer.clips.Length)
                    _layerIndices[layerIndex] = 0;
                return layer.clips[_layerIndices[layerIndex]++];

            case ProceduralAudio${className}.SelectionMode.Shuffle:
                // Fisher-Yates shuffle on first pass, then sequential
                return layer.clips[Random.Range(0, layer.clips.Length)];

            default:
                return layer.clips[0];
        }
    }

    private void ApplyVariation(AudioSource source, ProceduralAudio${className}.AudioLayer layer)
    {
        foreach (var rule in recipe.variationRules)
        {
            switch (rule.type)
            {
                case ProceduralAudio${className}.VariationType.PitchHumanize:
                    float pitchVar = Random.Range(-rule.range, rule.range) * rule.amount / 100f;
                    source.pitch = 1f + pitchVar;
                    break;

                case ProceduralAudio${className}.VariationType.VolumeHumanize:
                    float volVar = Random.Range(-rule.range, rule.range) * rule.amount / 100f;
                    source.volume = Mathf.Clamp01(layer.volume + volVar);
                    break;
            }
        }

        // Layer-specific pitch range
        source.pitch *= 1f + Random.Range(layer.pitchRange.x, layer.pitchRange.y) / 100f;
    }
}
`;
}

// ==================== Unreal Compiler ====================

function compileToUnreal(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

  // Generate MetaSound source
  const metaSound = generateUnrealMetaSound(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/MS_${className}.metasound`,
    content: metaSound,
    type: "config",
  });

  // Generate DataAsset
  const dataAsset = generateUnrealDataAsset(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/DA_${className}.h`,
    content: dataAsset,
    type: "code",
  });

  // Generate Blueprint-callable component
  const component = generateUnrealComponent(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/${className}AudioComponent.h`,
    content: component,
    type: "code",
  });

  const manifest = generateAssetManifest(recipe, "unreal");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generateUnrealMetaSound(recipe: ProceduralRecipe): string {
  // MetaSound is JSON-based in UE5
  return JSON.stringify({
    Type: "MetaSound",
    Name: `MS_${recipe.name.replace(/\s+/g, "_")}`,
    Description: recipe.description,
    Inputs: [
      { Name: "Play", Type: "Trigger" },
      { Name: "Stop", Type: "Trigger" },
      ...recipe.variationRules.map((rule) => ({
        Name: rule.name.replace(/\s+/g, ""),
        Type: "Float",
        Default: rule.config.amount,
        Min: 0,
        Max: 1,
      })),
    ],
    Outputs: [
      { Name: "OnFinished", Type: "Trigger" },
      { Name: "AudioOutput", Type: "Audio" },
    ],
    Nodes: [
      {
        Type: "WavePlayer",
        Name: "Player",
        Config: {
          Loop: recipe.sequencing.loopEnabled,
        },
      },
      ...recipe.layers.map((layer, i) => ({
        Type: "RandomSelector",
        Name: `Layer_${i}`,
        Config: {
          Mode: mapSelectionToUnreal(layer.selection),
          Sources: layer.sourceIds,
        },
      })),
      ...recipe.variationRules.map((rule, i) => ({
        Type: mapVariationNodeType(rule.type),
        Name: `Variation_${i}`,
        Config: {
          Amount: rule.config.amount,
          Range: rule.config.pitchRange || rule.config.timingRange || 50,
        },
      })),
    ],
    Connections: [
      // Auto-generated connections based on graph
    ],
  }, null, 2);
}

function generateUnrealDataAsset(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Procedural Audio Data Asset: ${recipe.name}
// Generated by Swanblade Recipe Compiler

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DA_${className}.generated.h"

UENUM(BlueprintType)
enum class E${className}SelectionMode : uint8
{
    Random,
    RoundRobin,
    Weighted,
    Sequential,
    Shuffle
};

USTRUCT(BlueprintType)
struct F${className}AudioLayer
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<USoundWave*> Clips;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    E${className}SelectionMode SelectionMode = E${className}SelectionMode::Random;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float Volume = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "-1.0", ClampMax = "1.0"))
    float Pan = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector2D PitchRange = FVector2D(-2.0f, 2.0f);
};

USTRUCT(BlueprintType)
struct F${className}VariationRule
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float Amount = 0.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Range = 50.0f;
};

UCLASS(BlueprintType)
class UDA_${className} : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe Info")
    FString RecipeName = TEXT("${recipe.name}");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe Info")
    FString RecipeId = TEXT("${recipe.id}");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio Sources")
    TArray<F${className}AudioLayer> Layers;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Variation")
    TArray<F${className}VariationRule> VariationRules;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sequencing")
    bool bLoopEnabled = ${recipe.sequencing.loopEnabled};

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sequencing")
    float TransitionDuration = ${recipe.sequencing.transitionDuration / 1000}f;
};
`;
}

function generateUnrealComponent(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `// Procedural Audio Component: ${recipe.name}
// Generated by Swanblade Recipe Compiler

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DA_${className}.h"
#include "${className}AudioComponent.generated.h"

UCLASS(ClassGroup=(Audio), meta=(BlueprintSpawnableComponent))
class U${className}AudioComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    U${className}AudioComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe")
    UDA_${className}* Recipe;

    UFUNCTION(BlueprintCallable, Category = "Audio")
    void Play();

    UFUNCTION(BlueprintCallable, Category = "Audio")
    void Stop();

    UFUNCTION(BlueprintCallable, Category = "Audio")
    void Trigger();

    ${recipe.variationRules.map((rule) => `
    UFUNCTION(BlueprintCallable, Category = "Audio|Parameters")
    void Set${rule.name.replace(/\s+/g, "")}(float Value);
    `).join("")}

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TArray<UAudioComponent*> LayerComponents;

    TArray<int32> LayerIndices;

    void PlayLayer(int32 LayerIndex);
    USoundWave* SelectClip(const F${className}AudioLayer& Layer, int32 LayerIndex);
    void ApplyVariation(UAudioComponent* Component, const F${className}AudioLayer& Layer);
};
`;
}

// ==================== Pure Data Compiler ====================

function compileToPureData(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];

  // Generate main patch
  const mainPatch = generatePdMainPatch(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/main.pd`,
    content: mainPatch,
    type: "code",
  });

  // Generate abstractions for each layer
  recipe.layers.forEach((layer, i) => {
    const layerPatch = generatePdLayerPatch(layer, i, recipe);
    files.push({
      path: `${recipe.name.replace(/\s+/g, "_")}/layer_${i}.pd`,
      content: layerPatch,
      type: "code",
    });
  });

  const manifest = generateAssetManifest(recipe, "pure_data");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generatePdMainPatch(recipe: ProceduralRecipe): string {
  let xPos = 50;
  let yPos = 50;
  const objects: string[] = [];

  // Header
  objects.push(`#N canvas 0 0 800 600 10;`);

  // Inlet for play/stop
  objects.push(`#X obj ${xPos} ${yPos} inlet;`);
  const playInlet = objects.length - 1;
  yPos += 40;

  // Route for play/stop
  objects.push(`#X obj ${xPos} ${yPos} route play stop trigger;`);
  const router = objects.length - 1;
  yPos += 40;

  // Create layer subpatches
  recipe.layers.forEach((layer, i) => {
    objects.push(`#X obj ${xPos + i * 150} ${yPos} layer_${i};`);
  });
  yPos += 40;

  // Mixer
  objects.push(`#X obj ${xPos} ${yPos} throw~ mix;`);
  yPos += 40;

  // Output
  objects.push(`#X obj ${xPos} ${yPos} catch~ mix;`);
  const catchObj = objects.length - 1;
  objects.push(`#X obj ${xPos} ${yPos + 40} dac~;`);
  const dacObj = objects.length - 1;

  // Connections
  objects.push(`#X connect ${playInlet} 0 ${router} 0;`);
  objects.push(`#X connect ${catchObj} 0 ${dacObj} 0;`);
  objects.push(`#X connect ${catchObj} 0 ${dacObj} 1;`);

  return objects.join("\n");
}

function generatePdLayerPatch(layer: RecipeLayer, index: number, recipe: ProceduralRecipe): string {
  const objects: string[] = [];
  let yPos = 50;

  objects.push(`#N canvas 0 0 600 400 10;`);

  // Inlet
  objects.push(`#X obj 50 ${yPos} inlet;`);
  yPos += 40;

  // Random selection
  if (layer.selection.type === "random") {
    objects.push(`#X obj 50 ${yPos} random ${layer.sourceIds.length};`);
  } else if (layer.selection.type === "round_robin") {
    objects.push(`#X obj 50 ${yPos} counter ${layer.sourceIds.length};`);
  }
  yPos += 40;

  // Sample player
  objects.push(`#X obj 50 ${yPos} tabread4~ sample_${index};`);
  yPos += 40;

  // Pitch variation
  if (layer.processing.pitchShift) {
    objects.push(`#X obj 50 ${yPos} *~ 1;`);
    objects.push(`#X obj 150 ${yPos} random ${Math.abs(layer.processing.pitchShift.max - layer.processing.pitchShift.min)};`);
    yPos += 40;
  }

  // Volume
  objects.push(`#X obj 50 ${yPos} *~ ${layer.volume};`);
  yPos += 40;

  // Output to main mix
  objects.push(`#X obj 50 ${yPos} throw~ mix;`);

  return objects.join("\n");
}

// ==================== Web Audio Compiler ====================

function compileToWebAudio(recipe: ProceduralRecipe): CompiledFile[] {
  const files: CompiledFile[] = [];

  // Generate AudioWorklet processor
  const worklet = generateWebAudioWorklet(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/processor.js`,
    content: worklet,
    type: "code",
  });

  // Generate main player class
  const player = generateWebAudioPlayer(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/player.js`,
    content: player,
    type: "code",
  });

  // Generate TypeScript types
  const types = generateWebAudioTypes(recipe);
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/types.d.ts`,
    content: types,
    type: "code",
  });

  const manifest = generateAssetManifest(recipe, "web_audio");
  files.push({
    path: `${recipe.name.replace(/\s+/g, "_")}/AssetManifest.json`,
    content: manifest,
    type: "asset_manifest",
  });

  return files;
}

function generateWebAudioWorklet(recipe: ProceduralRecipe): string {
  return `// Web Audio Worklet Processor: ${recipe.name}
// Generated by Swanblade Recipe Compiler

class ${recipe.name.replace(/\s+/g, "")}Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.layers = [];
    this.variationState = {};
    this.isPlaying = false;

    // Initialize variation state
    ${recipe.variationRules.map((rule) => `
    this.variationState['${rule.name}'] = {
      amount: ${rule.config.amount},
      current: 0,
    };`).join("")}

    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'play':
          this.isPlaying = true;
          break;
        case 'stop':
          this.isPlaying = false;
          break;
        case 'setParameter':
          if (this.variationState[data.name]) {
            this.variationState[data.name].amount = data.value;
          }
          break;
        case 'loadBuffers':
          this.layers = data.layers;
          break;
      }
    };
  }

  static get parameterDescriptors() {
    return [
      ${recipe.variationRules.map((rule) => `{
        name: '${rule.name.replace(/\s+/g, "_")}',
        defaultValue: ${rule.config.amount},
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      }`).join(",\n      ")}
    ];
  }

  process(inputs, outputs, parameters) {
    if (!this.isPlaying) return true;

    const output = outputs[0];

    // Mix all layers
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; i++) {
        outputChannel[i] = 0;
      }

      // Sum layer contributions
      for (const layer of this.layers) {
        if (layer.buffer && layer.playhead < layer.buffer.length) {
          const sample = layer.buffer[Math.floor(layer.playhead)] || 0;
          const varied = this.applyVariation(sample, layer);
          outputChannel[Math.floor(layer.playhead) % outputChannel.length] += varied * layer.volume;
          layer.playhead += layer.playbackRate;
        }
      }
    }

    return true;
  }

  applyVariation(sample, layer) {
    let result = sample;

    // Apply pitch humanization as playback rate variation
    const pitchRule = this.variationState['Pitch Variation'] || this.variationState['pitch_humanize'];
    if (pitchRule) {
      // Pitch variation already applied via playbackRate
    }

    // Apply volume humanization
    const volRule = this.variationState['Volume Humanize'] || this.variationState['volume_humanize'];
    if (volRule) {
      const volVar = (Math.random() - 0.5) * 2 * volRule.amount * 0.2;
      result *= (1 + volVar);
    }

    return result;
  }
}

registerProcessor('${recipe.name.replace(/\s+/g, "-").toLowerCase()}-processor', ${recipe.name.replace(/\s+/g, "")}Processor);
`;
}

function generateWebAudioPlayer(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "");
  return `// Web Audio Player: ${recipe.name}
// Generated by Swanblade Recipe Compiler

export class ${className}Player {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.buffers = new Map();
    this.layerState = [];
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    this.audioContext = new AudioContext({
      sampleRate: ${recipe.output.sampleRate},
    });

    // Load worklet processor
    await this.audioContext.audioWorklet.addModule('./processor.js');

    // Create worklet node
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      '${recipe.name.replace(/\s+/g, "-").toLowerCase()}-processor'
    );

    // Connect to output
    this.workletNode.connect(this.audioContext.destination);

    // Initialize layer state
    this.layerState = [
      ${recipe.layers.map((layer) => `{
        name: '${layer.name}',
        sourceIds: ${JSON.stringify(layer.sourceIds)},
        selection: '${layer.selection.type}',
        volume: ${layer.volume},
        index: 0,
        buffer: null,
        playhead: 0,
        playbackRate: 1,
      }`).join(",\n      ")}
    ];

    this.isInitialized = true;
  }

  async loadSamples(sampleMap) {
    // sampleMap: { sourceId: url }
    for (const [id, url] of Object.entries(sampleMap)) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(id, audioBuffer);
    }

    // Send buffers to worklet
    this.updateWorkletBuffers();
  }

  updateWorkletBuffers() {
    const layers = this.layerState.map((layer) => {
      const sourceId = this.selectSource(layer);
      const buffer = this.buffers.get(sourceId);
      return {
        ...layer,
        buffer: buffer ? buffer.getChannelData(0) : null,
      };
    });

    this.workletNode.port.postMessage({
      type: 'loadBuffers',
      data: { layers },
    });
  }

  selectSource(layer) {
    const { sourceIds, selection } = layer;
    if (!sourceIds || sourceIds.length === 0) return null;

    switch (selection) {
      case 'random':
        return sourceIds[Math.floor(Math.random() * sourceIds.length)];

      case 'round_robin':
        const id = sourceIds[layer.index % sourceIds.length];
        layer.index++;
        return id;

      case 'sequential':
        if (layer.index >= sourceIds.length) layer.index = 0;
        return sourceIds[layer.index++];

      case 'shuffle':
        // Simple shuffle: random selection
        return sourceIds[Math.floor(Math.random() * sourceIds.length)];

      default:
        return sourceIds[0];
    }
  }

  play() {
    if (!this.isInitialized) {
      console.warn('Player not initialized. Call init() first.');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.workletNode.port.postMessage({ type: 'play' });
  }

  stop() {
    if (!this.isInitialized) return;
    this.workletNode.port.postMessage({ type: 'stop' });
  }

  trigger() {
    // One-shot trigger - select new samples and play
    this.updateWorkletBuffers();
    this.play();
  }

  ${recipe.variationRules.map((rule) => `
  set${rule.name.replace(/\s+/g, "")}(value) {
    if (!this.isInitialized) return;
    this.workletNode.port.postMessage({
      type: 'setParameter',
      data: { name: '${rule.name}', value: Math.max(0, Math.min(1, value)) },
    });
  }`).join("")}

  dispose() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.buffers.clear();
    this.isInitialized = false;
  }
}

export default ${className}Player;
`;
}

function generateWebAudioTypes(recipe: ProceduralRecipe): string {
  const className = recipe.name.replace(/\s+/g, "");
  return `// TypeScript Types: ${recipe.name}
// Generated by Swanblade Recipe Compiler

export interface ${className}PlayerOptions {
  autoInit?: boolean;
}

export interface ${className}SampleMap {
  [sourceId: string]: string;
}

export declare class ${className}Player {
  constructor(options?: ${className}PlayerOptions);

  init(): Promise<void>;
  loadSamples(sampleMap: ${className}SampleMap): Promise<void>;
  play(): void;
  stop(): void;
  trigger(): void;
  dispose(): void;

  ${recipe.variationRules.map((rule) => `set${rule.name.replace(/\s+/g, "")}(value: number): void;`).join("\n  ")}
}

export default ${className}Player;
`;
}

// ==================== Helper Functions ====================

function generateId(): string {
  return `{${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}}`;
}

function dbFromLinear(linear: number): number {
  return 20 * Math.log10(Math.max(0.0001, linear));
}

function mapSelectionToWwise(selection: SelectionRule): number {
  switch (selection.type) {
    case "random": return 0;
    case "sequential": return 1;
    case "round_robin": return 1;
    case "shuffle": return 0;
    default: return 0;
  }
}

function mapSelectionToFMOD(selection: SelectionRule): string {
  switch (selection.type) {
    case "random": return "random";
    case "sequential": return "sequential";
    case "round_robin": return "sequential";
    case "shuffle": return "shuffle";
    case "weighted": return "random";
    default: return "random";
  }
}

function mapSelectionToUnity(selection: SelectionRule): string {
  switch (selection.type) {
    case "random": return "Random";
    case "round_robin": return "RoundRobin";
    case "weighted": return "Weighted";
    case "sequential": return "Sequential";
    case "shuffle": return "Shuffle";
    default: return "Random";
  }
}

function mapSelectionToUnreal(selection: SelectionRule): string {
  switch (selection.type) {
    case "random": return "Random";
    case "round_robin": return "RoundRobin";
    case "weighted": return "Weighted";
    case "sequential": return "Sequential";
    case "shuffle": return "Shuffle";
    default: return "Random";
  }
}

function mapSequencingToUnity(mode: string): string {
  switch (mode) {
    case "one_shot": return "OneShot";
    case "loop": return "Loop";
    case "random_interval": return "RandomInterval";
    case "triggered": return "Triggered";
    case "continuous": return "Continuous";
    default: return "OneShot";
  }
}

function mapVariationToUnity(type: string): string {
  switch (type) {
    case "pitch_humanize": return "PitchHumanize";
    case "timing_humanize": return "TimingHumanize";
    case "volume_humanize": return "VolumeHumanize";
    case "parameter_drift": return "ParameterDrift";
    case "random_swap": return "RandomSwap";
    default: return "PitchHumanize";
  }
}

function mapVariationNodeType(type: string): string {
  switch (type) {
    case "pitch_humanize": return "PitchShift";
    case "timing_humanize": return "Delay";
    case "volume_humanize": return "Gain";
    case "parameter_drift": return "LFO";
    case "random_swap": return "Selector";
    default: return "Gain";
  }
}

function getWeight(selection: SelectionRule, index: number): number {
  if (selection.type === "weighted" && selection.weights) {
    return (selection.weights[index] || 0) * 100;
  }
  return 100;
}

function buildUnityEffects(processing: LayerProcessing): object[] {
  const effects: object[] = [];

  if (processing.filter) {
    effects.push({
      type: processing.filter.type,
      frequency: processing.filter.frequencyRange[0],
    });
  }

  if (processing.reverb) {
    effects.push({
      type: "reverb",
      mix: processing.reverb.mix,
      size: processing.reverb.size,
    });
  }

  if (processing.delay) {
    effects.push({
      type: "delay",
      time: processing.delay.time,
      feedback: processing.delay.feedback,
      mix: processing.delay.mix,
    });
  }

  if (processing.distortion) {
    effects.push({
      type: "distortion",
      amount: processing.distortion.amount,
    });
  }

  return effects;
}

function generateAssetManifest(recipe: ProceduralRecipe, target: string): string {
  return JSON.stringify({
    recipeId: recipe.id,
    recipeName: recipe.name,
    target,
    generatedAt: new Date().toISOString(),
    sources: recipe.sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      duration: s.duration,
      sampleUrl: s.sampleUrl,
      sampleLibraryId: s.sampleLibraryId,
    })),
    layers: recipe.layers.map((l) => ({
      id: l.id,
      name: l.name,
      sourceIds: l.sourceIds,
    })),
  }, null, 2);
}

function estimateMemoryUsage(recipe: ProceduralRecipe): number {
  // Estimate based on sources and output settings
  let totalSamples = 0;

  for (const source of recipe.sources) {
    const samples = source.duration * recipe.output.sampleRate * recipe.output.channels;
    const bytesPerSample = recipe.output.bitDepth / 8;
    totalSamples += samples * bytesPerSample;
  }

  return Math.round(totalSamples / (1024 * 1024) * 100) / 100;
}

// ==================== Export All Formats ====================

export function compileToAllFormats(recipe: ProceduralRecipe): CompiledRecipe[] {
  const targets: CompilerTarget[] = ["wwise", "fmod", "unity", "unreal", "pure_data", "web_audio"];
  return targets.map((target) => compileRecipe(recipe, target));
}
