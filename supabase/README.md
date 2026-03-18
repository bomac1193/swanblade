# Supabase Setup for Swanblade

## Quick Start

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your credentials
3. Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Run Migrations

Go to SQL Editor in Supabase Dashboard and run these files in order:

1. `migrations/001_profiles.sql` - User profiles + invite system
2. `migrations/002_applications.sql` - Membership applications
3. `migrations/003_sound_library.sql` - Sound library + palettes + usage

## Enable Google OAuth

1. Go to Authentication > Providers
2. Enable Google
3. Add your Google OAuth credentials
4. Set redirect URL to: `https://YOUR_DOMAIN/auth/callback`

## Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles, membership tier, Stripe IDs, invite codes |
| `applications` | Membership applications for review |
| `sounds` | Generated sounds library |
| `palettes` | User sound palettes |
| `usage` | Generation usage tracking |

## RLS Policies

All tables have Row Level Security enabled:
- Users can only access their own data
- Service role (webhooks) has full access
- Applications table allows public inserts (for apply form)

## Membership Tiers

| Tier | Monthly | Invites |
|------|---------|---------|
| `pending` | - | 0 |
| `professional` | $299 | 2 |
| `studio` | $999 | 5 |
| `enterprise` | Custom | 100 |

## Invite Code Format

```
SB-XXXX-XXXX
```

Auto-generated when membership becomes active.
