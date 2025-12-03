# Swanblade Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Audio Provider

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and choose your audio provider.

### 3. Suno AI Setup (Recommended for Vocals/Choir)

**Option A: AIML API (Easiest)**

1. Sign up at [https://aimlapi.com/app/sign-up](https://aimlapi.com/app/sign-up)
2. Get your API key
3. Add to `.env.local`:

```bash
AUDIO_PROVIDER=suno
AIML_API_KEY=your_api_key_here
SUNO_INSTRUMENTAL=false  # Keep vocals enabled
```

**Option B: Self-Hosted (Advanced)**

1. Clone and run [suno-api](https://github.com/gcui-art/suno-api):

```bash
git clone https://github.com/gcui-art/suno-api.git
cd suno-api
# Follow their setup instructions
npm run dev
```

2. Get your Suno cookie from browser DevTools
3. Add to `.env.local`:

```bash
AUDIO_PROVIDER=suno
SUNO_API_ENDPOINT=http://localhost:3000
SUNO_COOKIE=your_suno_cookie_here
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### 🎵 Suno AI Integration
- **Best for**: Vocals, choir, singing, full songs
- **Prompt example**: "Beautiful angel choir singing and bells swirling in 8D sound"
- Automatically enhances prompts with vocal production keywords

### 📚 Sound Library
- **Save sounds**: Click "💾 Save to Library" after generation
- **Auto-grouping**: Sounds are automatically organized by type and mood
- **Like/Unlike**: Mark your favorites with ❤️
- **Download**: Get high-quality audio files
- **Rename**: Click on sound names to edit
- **Search & Filter**: Find sounds by name, prompt, or tags

### 🎨 Organization Features
- **Auto-groups** by:
  - Sound type (FX, Ambience, Musical, etc.)
  - Mood tags (Futuristic, Dark, Bright, etc.)
  - Custom groups
- **Sort by**:
  - Date (newest first)
  - Name (A-Z)
  - Liked first
  - Type
  - Group
- **Filter by**:
  - All sounds
  - Liked only
  - Specific groups

## Prompting Tips for Vocals

When using Suno for vocals/choir:

✅ **Good prompts**:
- "Ethereal angel choir with crystalline harmonies and cathedral reverb"
- "Gospel choir singing uplifting melodies with rich vocal layers"
- "Medieval monks chanting in Latin with deep resonant voices"
- "Pop song with female vocals, catchy melody, upbeat production"

❌ **Avoid**:
- "Just make some sounds" (too vague)
- Extremely short prompts (add detail!)

## Library Storage

- Sounds are stored in `.swanblade-library/`
- Audio files: `.swanblade-library/audio/`
- Metadata: `.swanblade-library/library.json`

**Backup**: Just copy the `.swanblade-library/` folder!

## Alternative Providers

If you want to use other providers for different sound types:

- **Stability AI**: Excellent for sound effects and instrumental music
- **ElevenLabs**: Great for sound effects and environmental sounds
- **Replicate/fal.ai**: MusicGen for instrumental tracks
- **OpenAI**: Decent for narration and simple sounds (not great for choir)

Change `AUDIO_PROVIDER` in `.env.local` to switch between them.

## Troubleshooting

### "No vocals in my generated sound"
- Make sure `SUNO_INSTRUMENTAL=false` in `.env.local`
- Add explicit vocal keywords: "with vocals", "singing", "choir"
- Use Suno provider (not OpenAI or Stability)

### "Suno generation times out"
- Suno can take 30-120 seconds for complex prompts
- Check your API key is valid
- Try a shorter duration (10-30 seconds)

### "Library not saving sounds"
- Check file permissions on project directory
- Ensure `.swanblade-library/` can be created
- Check browser console for errors

## API Keys

Where to get API keys:

- **AIML API**: [aimlapi.com/app/sign-up](https://aimlapi.com/app/sign-up)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Stability**: [platform.stability.ai/account/keys](https://platform.stability.ai/account/keys)
- **ElevenLabs**: [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
- **Replicate**: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- **fal.ai**: [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)

## Questions?

Check the official docs:
- [Suno API Docs](https://docs.sunoapi.org/)
- [AIML API Docs](https://docs.aimlapi.com/)
