## Swanblade

A minimal Next.js studio that takes a written prompt plus synthesis parameters and returns freshly rendered audio. The `/api/generate-sound` route can talk to OpenAI's new audio-preview models or Stability's Stable Audio endpoint.

## Prerequisites

- Node.js 20+
- An OpenAI API key (for `gpt-4o-audio-preview`), or a Stability API key if you prefer Stable Audio.

## Environment variables

Create `.env.local` with whichever providers you want to enable:

```bash
# choose "openai", "stability", "elevenlabs", or "mock".
# If omitted, Swanblade will auto-select OpenAI when an OPENAI_API_KEY is set.
AUDIO_PROVIDER=openai

# OpenAI sound design
OPENAI_API_KEY=sk-...
# Optional overrides
OPENAI_AUDIO_MODEL=gpt-4o-audio-preview
OPENAI_AUDIO_VOICE=alloy
OPENAI_AUDIO_FORMAT=wav # wav, mp3, aac, flac, opus, pcm16

# (optional) Stability Stable Audio
STABILITY_API_KEY=stability-...
STABILITY_AUDIO_MODEL=stable-audio
STABILITY_AUDIO_FORMAT=wav
STABILITY_AUDIO_ENDPOINT=https://api.stability.ai/v2beta/stable-audio/text-to-audio
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, type a description like "granular riser with metallic swells", and Swanblade will render a new waveform using the configured provider.

## API quick check

You can verify the API without the UI:

```bash
curl -X POST http://localhost:3000/api/generate-sound \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Lush ambience with distant thunder and modular synth pads",
    "parameters": {
      "type": "Ambience",
      "moodTags": ["Moody","Wide"],
      "lengthSeconds": 12,
      "intensity": 65,
      "texture": 55,
      "brightness": 35,
      "noisiness": 20,
      "bpm": 90,
      "key": "D minor",
      "seed": 512
    }
  }'
```

The response contains a `data:` URL with the generated audio. Use the browser UI or save the base64 payload to inspect the output.
