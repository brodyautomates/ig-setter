# ig-setter — Setup Guide

**Version 1.0 | github.com/brodyautomates/ig-setter**

---

## What This Is

**ig-setter** is an open-source Instagram DM management dashboard powered by AI. When someone DMs your Instagram account, Claude AI automatically drafts a reply. You see the conversation in real-time on your dashboard, can approve the AI's draft, or send your own override message. Every deal is tracked by status: Active → Qualified → Booked → Closed.

**Stack:** Next.js · Supabase · n8n · Claude API · Meta Graph API · Vercel

**Cost to run:** Free (Supabase free tier + Vercel free tier + n8n free self-host or $20/mo cloud). Claude API costs ~$0.001 per DM handled.

---

## Architecture Overview

```
Instagram DM received
        ↓
Meta Webhook (HTTP POST)
        ↓
n8n Workflow
   ├── Extracts message + sender
   ├── Fetches IG username via Graph API
   ├── Sends to Claude → generates reply draft
   └── POSTs to Dashboard webhook API
              ↓
         Supabase DB
              ↓
    Next.js Dashboard (live)
         ↓         ↑
  Manual override → n8n → IG Graph API → Reply sent
```

---

## Prerequisites

Before starting, make sure you have:

- [ ] An **Instagram Professional account** (Business or Creator) — free to switch in IG settings
- [ ] A **Facebook Page** connected to your Instagram account
- [ ] A **Meta Developer account** — free at developers.facebook.com
- [ ] A **Supabase account** — free at supabase.com
- [ ] An **n8n account** — free self-host or cloud at app.n8n.cloud
- [ ] An **Anthropic account** — get an API key at console.anthropic.com
- [ ] A **Vercel account** — free at vercel.com (or run locally with `npm run dev`)
- [ ] **Node.js 18+** installed locally

---

## Step 1 — Supabase Setup (5 minutes)

### 1.1 Create a project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Name it `ig-setter`, choose a region close to you, set a strong database password
4. Wait ~2 minutes for it to provision

### 1.2 Run the migration

1. In your Supabase project, go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase/migrations/001_init.sql` from this repo
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** — you should see "Success. No rows returned"

This creates 3 tables (`dm_threads`, `dm_messages`, `daily_stats`), enables realtime, and sets up RLS policies.

### 1.3 Get your credentials

1. Go to **Settings → API** in your Supabase project
2. Copy these three values — you'll need them later:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Keep the service_role key secret. Never paste it into client-side code.

---

## Step 2 — Meta App Setup (20–30 minutes)

This is the most involved step. Follow carefully.

### 2.1 Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select **Business** as the app type
4. Fill in: App Name (`ig-setter`), Contact Email, Business Account (create one if needed)
5. Click **Create App**

### 2.2 Add Instagram Messaging

1. In your app dashboard, click **Add Product**
2. Find **Instagram** and click **Set Up**
3. In the left sidebar under Instagram, click **API setup with Instagram login**
4. Follow the prompts to connect your Instagram Professional account

### 2.3 Generate an Access Token

1. Under Instagram → **Generate access tokens**
2. Click **Generate** next to your Instagram account
3. Copy the token — this is your `INSTAGRAM_ACCESS_TOKEN`

> This is a short-lived token by default. For production, convert it to a long-lived token using the Graph API token exchange endpoint. Instructions: developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived

### 2.4 Get your Instagram User ID

Run this in your terminal (or paste in a browser):

```
https://graph.facebook.com/v19.0/me?fields=id,username&access_token=YOUR_ACCESS_TOKEN
```

Copy the `id` field — this is your `INSTAGRAM_USER_ID`.

### 2.5 Set up the Webhook

You need a publicly accessible URL for Meta to send DM events to. This is your deployed Vercel URL + `/api/webhook`.

**If deploying to Vercel first (recommended):** Complete Step 4 (Deploy), then come back here with your Vercel URL.

1. In your Meta app, go to **Instagram → Webhooks**
2. Click **Add Callback URL**
3. Callback URL: `https://your-app.vercel.app/api/webhook`
4. Verify Token: the value you set for `WEBHOOK_VERIFY_TOKEN` in your `.env.local`
5. Click **Verify and Save**
6. After verification, click **Add Subscriptions** and check **messages**
7. Click **Save**

### 2.6 Request Permissions (for production)

In development mode, the webhook only receives messages from your own account and test users. To receive DMs from real followers:

1. Go to **App Review → Permissions and Features**
2. Request **instagram_manage_messages**
3. Submit a brief description: "This app receives Instagram DMs and displays them in a private dashboard for the account owner to manage."
4. Add your privacy policy URL (required — use a free generator if needed)
5. Submit — approval typically takes 1–5 business days

> **While waiting for approval:** You can fully test the system by messaging your own account from a test user account.

---

## Step 3 — n8n Setup (10 minutes)

### 3.1 Get n8n

**Option A — n8n Cloud (easiest):**
Sign up at [app.n8n.cloud](https://app.n8n.cloud). Free trial available, then $20/mo.

**Option B — Self-host (free):**
```bash
npx n8n
```
Or with Docker: `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`

n8n will be running at `http://localhost:5678`.

> For self-hosted n8n, you need a public URL for Meta to reach your webhook. Use [ngrok](https://ngrok.com) for testing: `ngrok http 5678`. For production, deploy n8n to a VPS or use Railway/Render.

### 3.2 Import the workflow

1. In n8n, click **Workflows → Add Workflow → Import from File**
2. Select `n8n/ig-setter-workflow.json` from this repo
3. Click **Import**

### 3.3 Add credentials

You need to add 2 credentials in n8n:

**Credential 1 — Instagram Access Token**
1. Go to **Credentials → New Credential**
2. Type: **HTTP Query Auth**
3. Name it: `Instagram Access Token`
4. Parameter name: `access_token`
5. Value: your `INSTAGRAM_ACCESS_TOKEN` from Step 2.3
6. Save

**Credential 2 — Anthropic API Key**
1. Go to **Credentials → New Credential**
2. Type: **HTTP Header Auth**
3. Name it: `Anthropic API Key`
4. Header name: `x-api-key`
5. Value: your Anthropic API key (from console.anthropic.com)
6. Save

### 3.4 Set environment variables in n8n

1. Go to **Settings → Environment Variables** (n8n Cloud) or set in your `.env` file (self-hosted)
2. Add:
   - `DASHBOARD_URL` = your Vercel deployment URL (e.g. `https://your-app.vercel.app`)
   - `WEBHOOK_SECRET` = the same random string you set for `WEBHOOK_SECRET` in `.env.local`

### 3.5 Assign credentials to nodes

1. Open the imported workflow
2. Click the **Get IG Username** node → under Credentials, select `Instagram Access Token`
3. Click the **Claude — Generate Reply** node → under Credentials, select `Anthropic API Key`
4. Click the **Send IG Reply** node → under Credentials, select `Instagram Access Token`
5. Save the workflow

### 3.6 Get your webhook URLs

1. Click the **Webhook — Meta IG DM** node
2. Copy the **Production URL** — this is what you paste into Meta's webhook callback URL field in Step 2.5
3. Click the **Webhook — Override** node
4. Copy the **Production URL** — this is your `N8N_OVERRIDE_WEBHOOK_URL`

### 3.7 Activate the workflow

Click the toggle at the top of the workflow to set it to **Active**. The webhook is now live.

### 3.8 Customise the AI prompt

To make Claude sound like you:

1. Open the **Claude — Generate Reply** node
2. Find the `system` field in the JSON body
3. Edit the prompt to match your offer, voice, and closing style
4. Save

---

## Step 4 — Deploy the Dashboard (5 minutes)

### Option A — Vercel (recommended)

**One-click deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brodyautomates/ig-setter)

1. Click the button above
2. Connect your GitHub account
3. Vercel will clone the repo and prompt you for environment variables
4. Add all variables from `.env.example` with your real values
5. Click **Deploy** — your dashboard will be live in ~2 minutes

**Or deploy from the CLI:**

```bash
npm install -g vercel
vercel --prod
```

Follow the prompts, then add env vars in the Vercel dashboard under **Settings → Environment Variables**.

### Option B — Run locally

```bash
git clone https://github.com/brodyautomates/ig-setter.git
cd ig-setter
npm install
cp .env.example .env.local
# Fill in .env.local with your real values
npm run dev
```

Dashboard runs at `http://localhost:3000`.

> For the Meta webhook to reach your local instance, use ngrok: `ngrok http 3000`. Use the ngrok URL as your webhook callback URL in Meta.

---

## Step 5 — Test It (5 minutes)

1. Send a DM to your Instagram account from a test account
2. Within a few seconds, the conversation should appear in your dashboard
3. You'll see the AI's draft reply in the Override panel on the right
4. Either let the AI send it automatically, or type your own message and click **Send Override**

**If the DM doesn't appear:**
- Check the n8n workflow execution log (n8n → Executions)
- Verify the Meta webhook is verified and subscribed to `messages`
- Check Vercel function logs (Vercel dashboard → Functions)

---

## Environment Variables Reference

| Variable | Where to get it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Yes |
| `WEBHOOK_SECRET` | Make up a random string | Yes |
| `WEBHOOK_VERIFY_TOKEN` | Make up a random string | Yes |
| `INSTAGRAM_ACCESS_TOKEN` | Meta Developer Portal → Instagram → Generate Token | Yes |
| `INSTAGRAM_USER_ID` | Graph API → `/me?fields=id` | Yes |
| `N8N_OVERRIDE_WEBHOOK_URL` | n8n → Override webhook node → Production URL | Yes |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Optional* |

*Claude is called from n8n — the Anthropic key goes into n8n credentials, not necessarily here. Add it here only if you extend the app with server-side AI features.

---

## Customising the AI

The AI prompt lives inside the n8n workflow in the **Claude — Generate Reply** node. To change how the AI responds:

1. Open n8n → your workflow → **Claude — Generate Reply** node
2. Edit the `system` field — this is your AI's personality and instructions
3. Edit the `content` field (user message) to include more context if needed
4. Save and re-activate the workflow

**Example prompts by use case:**

**Coaching/consulting closer:**
```
You are a high-ticket sales closer for [NAME]'s coaching business. 
Qualify leads by asking about their current situation and goal. 
Move qualified leads toward booking a 30-minute strategy call.
Keep replies under 3 sentences. Never use emojis. Be direct and confident.
```

**E-commerce / product:**
```
You are a customer service and sales rep for [BRAND]. 
Answer product questions clearly. Offer the payment link when ready to buy.
Upsell to bundles when appropriate. Keep it warm and fast.
```

**Agency / B2B:**
```
You are a business development rep for [AGENCY NAME].
Qualify leads by asking about their business, monthly revenue, and main pain point.
Your goal is to book a 20-minute discovery call. 
Use a consultative tone — ask questions before pitching.
```

---

## Tracking Revenue

The daily stats panel shows revenue. To update it when a deal closes:

1. In Supabase → **Table Editor → daily_stats**
2. Find today's row
3. Update the `revenue` column with the deal value (in whole dollars)
4. The dashboard updates in real-time

(Future version: auto-detect closed deals from DM content and prompt for revenue entry.)

---

## Troubleshooting

### Webhook verification fails
- Check that `WEBHOOK_VERIFY_TOKEN` in `.env.local` exactly matches what you entered in the Meta portal
- Make sure your Vercel deployment is live before attempting verification

### DMs appear in n8n but not the dashboard
- Verify `WEBHOOK_SECRET` matches in both `.env.local` and n8n environment variables
- Check that `DASHBOARD_URL` in n8n doesn't have a trailing slash
- Check Vercel → Functions → `/api/webhook` logs for errors

### "Supabase not configured" banner shows
- Verify all three Supabase env vars are set in Vercel (including service_role key)
- Redeploy after adding env vars

### n8n workflow fails on "Get IG Username"
- Your access token may be expired — regenerate it in the Meta Developer Portal
- Long-lived tokens last 60 days; refresh them before they expire

### Override button fails
- Verify `N8N_OVERRIDE_WEBHOOK_URL` is the Production URL (not Test URL) from n8n
- Make sure the Override webhook node in n8n is active

---

## Going to Production (Meta App Review)

To receive DMs from real followers (not just test users), your Meta app needs approval.

1. Make sure your app is in **Live Mode** (toggle at top of Meta Developer dashboard)
2. Go to **App Review → Permissions and Features**
3. Click **Request** next to `instagram_manage_messages`
4. Fill in:
   - **Detailed description:** Explain you're building a private DM management tool for your own account
   - **Screencast:** Record a 2-minute video showing the dashboard working with test data
   - **Privacy Policy URL:** Required — use a generator if needed (termly.io, freeprivacypolicy.com)
5. Submit

Approval typically takes 1–5 business days. You'll receive an email from Meta.

---

## Support

- GitHub Issues: [github.com/brodyautomates/ig-setter/issues](https://github.com/brodyautomates/ig-setter/issues)
- Built by [@brodyautomates](https://instagram.com/brodyautomates)

---

*ig-setter is open-source and provided as-is. Use in accordance with Meta's Platform Terms of Service.*
