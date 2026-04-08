# ◈ ig-setter

**AI-powered Instagram DM dashboard.** Inbound DMs are handled by Claude in real-time. You see every conversation live, approve AI drafts, or send manual overrides. Pipeline tracking built in.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brodyautomates/ig-setter)

---

## How It Works

```
Instagram DM → Meta Webhook → n8n → Claude AI → Supabase → Dashboard
                                                               ↓
                              Override Send ← Dashboard → n8n → IG Reply
```

1. Someone DMs your Instagram
2. n8n receives the event, generates an AI reply via Claude
3. You see it instantly on your dashboard
4. Click **Send Override** to send your own message, or let the AI handle it

---

## Quick Start

**Full instructions:** [docs/SETUP.md](docs/SETUP.md)

### What you need

| Service | Cost |
|---|---|
| Supabase | Free |
| Vercel | Free |
| n8n | Free (self-host) or $20/mo (cloud) |
| Meta Developer App | Free |
| Claude API | ~$0.001/DM |

### 5-step summary

1. **Supabase** — create project, run `supabase/migrations/001_init.sql`, copy credentials
2. **Meta App** — create app, add Instagram product, generate access token, configure webhook
3. **n8n** — import `n8n/ig-setter-workflow.json`, add credentials, activate
4. **Deploy** — click the Vercel button above, fill in env vars from `.env.example`
5. **Test** — send a DM to your account and watch it appear in real-time

---

## Features

- Real-time conversation feed via Supabase realtime subscriptions
- Claude AI auto-drafts replies on every inbound DM
- Manual override — send your own message and it routes through n8n to Instagram
- Thread status tracking: Active → Qualified → Booked → Closed
- Daily stats: conversations handled, deals closed, revenue
- Connection health banner if any services are misconfigured
- Zero mock data — everything is live

---

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Realtime)
- **n8n** (workflow automation — Meta webhook + Claude + IG send)
- **Claude API** (AI reply generation, called from n8n)
- **Meta Graph API v19.0** (receive and send Instagram DMs)
- **Tailwind CSS** + custom CSS design system

---

## Repo Structure

```
ig-setter/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts    ← receives DM events from n8n
│   │   ├── override/route.ts   ← sends manual override messages
│   │   └── status/route.ts     ← health check for setup banner
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── StatusBanner.tsx         ← shows if any service is not configured
│   ├── StatsBar.tsx             ← live stats from Supabase
│   ├── ThreadFeed.tsx           ← conversation list with realtime updates
│   ├── ConversationChain.tsx    ← message view with realtime updates
│   ├── OverridePanel.tsx        ← manual override with real API call
│   └── DailySummary.tsx         ← today's stats grid
├── lib/
│   └── supabase.ts              ← types, queries, realtime subscriptions
├── supabase/
│   └── migrations/001_init.sql  ← paste into Supabase SQL editor
├── n8n/
│   └── ig-setter-workflow.json  ← import into n8n
├── docs/
│   └── SETUP.md                 ← full setup guide
└── .env.example
```

---

## Setup Guide

See [docs/SETUP.md](docs/SETUP.md) for the complete step-by-step guide covering:
- Meta App creation and webhook configuration
- App Review for production access
- n8n workflow import and credential setup
- Supabase schema setup
- Vercel deployment
- Customising the Claude AI prompt
- Troubleshooting

---

Built by [@brodyautomates](https://instagram.com/brodyautomates)
