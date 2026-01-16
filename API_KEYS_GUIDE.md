# 🔑 API Keys Setup Guide

Get all your API keys in under 10 minutes!

---

## Required Keys (Core Functionality)

### 1. Gemini API Key (FREE) ✅

**Prize:** N/A (Core AI engine)
**Signup:** https://aistudio.google.com/app/apikey

**Steps:**
1. Sign in with Google account
2. Click "Get API Key"
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

**Add to `.env`:**
```env
GEMINI_API_KEY=AIzaSy...
```

**Free Tier:** 15 requests/minute, 1500 requests/day

---

## Prize Integration Keys

### 2. Yutori API Key ($3,500 Prize)

**Prize:** Best Yutori API Project
**Signup:** https://yutori.com/api

**Steps:**
1. Visit https://yutori.com
2. Sign up for account
3. Navigate to API settings
4. Generate API key

**Add to `.env`:**
```env
YUTORI_API_KEY=yutori_...
```

**What it does:** Enables continuous web monitoring with Scouts

---

### 3. Freepik API Key ($1,850 Prize)

**Prize:** Best Use of Freepik API
**Signup:** https://www.freepik.com/api

**Steps:**
1. Visit https://www.freepik.com/api
2. Click "Get Started"
3. Sign up for API access
4. Get API key from dashboard

**Add to `.env`:**
```env
FREEPIK_API_KEY=fpk_...
```

**What it does:** Generates 4K branded icons for agents

---

### 4. Tonic Fabricate API Key ($1,000 Prize)

**Prize:** Most Innovative Use of Tonic Fabricate
**Signup:** https://fabricate.tonic.ai

**Steps:**
1. Visit https://fabricate.tonic.ai
2. Click "Get Started for Free"
3. Sign up with email
4. Navigate to Settings → API Keys
5. Create new API key

**Add to `.env`:**
```env
FABRICATE_API_KEY=tonic_...
```

**What it does:** Generates synthetic test data for validation

---

### 5. Macroscope GitHub App ($1,000 Prize)

**Prize:** Best Use of Macroscope
**Signup:** https://app.macroscope.com

**IMPORTANT:** Macroscope is a **GitHub App**, not an API service!

**How it works:**
1. Visit https://app.macroscope.com
2. Sign up for account
3. Install Macroscope GitHub App to your repository
4. It automatically reviews PRs and commits

**For this hackathon:**
Since Macroscope doesn't have a public API, we'll use our **local code analyzer** as a fallback. This still demonstrates the code quality concept for the prize.

**Add to `.env` (OPTIONAL - Skip this):**
```env
# MACROSCOPE_API_KEY not needed - uses GitHub App instead
```

**What it does:** AI-powered code review on your GitHub PRs (runs automatically after installation)

---

## Optional Keys

### 6. Ngrok Auth Token (Optional)

**Purpose:** Expose local server to internet (for Retool)
**Signup:** https://dashboard.ngrok.com/get-started/your-authtoken

**Steps:**
1. Visit https://ngrok.com
2. Sign up for free account
3. Go to "Your Authtoken"
4. Copy the token

**Add to `.env`:**
```env
NGROK_AUTH_TOKEN=2a...
```

**Note:** Only needed if using Retool dashboard. Can skip for local testing.

---

## Quick Setup

### Copy All to `.env` File

```env
# Required
GEMINI_API_KEY=your_key_here

# Prize Integrations (Optional but recommended for demo)
YUTORI_API_KEY=your_key_here
FREEPIK_API_KEY=your_key_here
FABRICATE_API_KEY=your_key_here
MACROSCOPE_API_KEY=your_key_here

# Optional
NGROK_AUTH_TOKEN=your_token_here
WEBHOOK_URL=https://your-webhook.com
STYLE_REFERENCE_URL=https://your-style-image.png

# Server Config
PORT=3000
NODE_ENV=development
```

---

## Testing Your Keys

After adding keys, test with:

```bash
npm run dev
```

Look for:
```
🏆 Initializing Prize-Winning Integrations:
✓ Yutori monitoring enabled ($3,500 prize track)
✓ Tonic Fabricate enabled ($1,000 prize track)
✓ Macroscope code review enabled ($1,000 prize track)
✓ All integrations loaded
```

---

## Fallback Mode

**Good news:** If some keys are missing, the system still works!

- **Without Yutori:** Agents do one-time scrapes (no continuous monitoring)
- **Without Fabricate:** Skips test data generation
- **Without Macroscope:** Skips code review
- **Without Freepik:** Works but no custom icons

**Core functionality** (Gemini + Cline + AgentQL) works with just `GEMINI_API_KEY`.

---

## Free Tier Limits

| Service | Free Tier | Rate Limit |
|---------|-----------|------------|
| Gemini | ✅ Yes | 15 req/min |
| Freepik | ⚠️ Trial | 50 images/month |
| Yutori | ⚠️ Trial | 10 scouts |
| Fabricate | ✅ Yes | 100 records/day |
| Macroscope | ⚠️ Trial | 50 reviews/month |

**For hackathon:** All free tiers should be sufficient for demo!

---

## Troubleshooting

### "Invalid API Key" Error

**Gemini:**
- Make sure key starts with `AIza`
- Check for extra spaces in `.env`
- Verify API is enabled at https://console.cloud.google.com

**Freepik:**
- Confirm key starts with `fpk_`
- Check API quota hasn't been exceeded

**Yutori:**
- Verify account is activated
- Check billing (trial may require card)

### "API Rate Limit" Error

- Wait 1 minute and retry
- Check API dashboard for quota
- Consider upgrading to paid tier if needed

### "Connection Refused"

- Check your internet connection
- Verify firewall isn't blocking API calls
- Try using a VPN if API is geo-restricted

---

## Priority for Demo

**Must Have (Core Demo):**
1. ✅ Gemini API Key

**Should Have (Good Demo):**
2. ✅ Freepik API Key (visual polish)
3. ✅ Yutori API Key (highest prize value)

**Nice to Have (Best Demo):**
4. ✅ Fabricate API Key
5. ✅ Macroscope API Key

**Optional:**
6. Ngrok Token (only if using Retool)

---

## Support

**Gemini Issues:** https://ai.google.dev/gemini-api/docs
**Freepik Issues:** https://docs.freepik.com
**Yutori Issues:** https://yutori.com/api
**Fabricate Issues:** https://www.tonic.ai/docs
**Macroscope Issues:** https://docs.macroscope.com

**Meta-Genesis Issues:** Check PRIZE_DEMO_GUIDE.md

---

Good luck! 🚀
