# 💰 WhatsApp Money Tracker Bot

A WhatsApp bot that tracks money balance between you and your friend.
Both of you can text the bot and it auto-replies with updated balance.

---

## How It Works

```
You or friend → texts bot number → bot updates balance → replies to BOTH of you
```

**Commands:**
| Command | What it does |
|---|---|
| `sent 500` | Record you sent ₹500 |
| `sent 500 dinner` | Same with a note |
| `received 300` | Record ₹300 received |
| `received 300 rent` | Same with a note |
| `balance` | Check current balance |
| `history` | Last 5 transactions |
| `help` | Show all commands |

---

## Setup Guide (Step by Step)

### Step 1 — Meta Developer Setup (Free)

1. Go to https://developers.facebook.com
2. Click **My Apps** → **Create App**
3. Choose **Other** → **Business**
4. Give it any name (e.g. MoneyBot)
5. On left sidebar: **Add Product** → find **WhatsApp** → click **Set Up**
6. Go to **WhatsApp → API Setup**
7. Note down:
   - **Phone Number ID** (looks like: 123456789012345)
   - **Temporary access token** (long string starting with EAA...)
8. Under "To", add your personal number to test

---

### Step 2 — Deploy to Railway (Free)

1. Go to https://railway.app
2. Sign up with GitHub (free)
3. Click **New Project** → **Deploy from GitHub repo**
4. Upload this folder OR connect GitHub repo
5. Railway will auto-detect Node.js and deploy

**Set Environment Variables in Railway:**
Go to your project → Variables → Add these:

```
VERIFY_TOKEN    = mybot123
ACCESS_TOKEN    = (paste your token from Meta)
PHONE_ID        = (paste your Phone Number ID)
MY_NUMBER       = 91XXXXXXXXXX   ← your number with country code, no +
FRIEND_NUMBER   = 91XXXXXXXXXX   ← friend's number same format
CURRENCY        = ₹
```

6. After deploy, copy your Railway URL (e.g. `https://moneybot.up.railway.app`)

---

### Step 3 — Connect Webhook to Meta

1. Go back to Meta Developer → WhatsApp → Configuration
2. **Webhook URL:** `https://your-railway-url.up.railway.app/webhook`
3. **Verify Token:** `mybot123` (must match your VERIFY_TOKEN)
4. Click **Verify and Save**
5. Under **Webhook Fields** → subscribe to **messages**

---

### Step 4 — Get a Permanent Token

The temporary token expires in 24 hours. To get a permanent one:

1. Go to https://business.facebook.com
2. Settings → System Users → Add System User (Admin role)
3. Generate token → select your WhatsApp app → give `whatsapp_business_messaging` permission
4. Copy that token → paste into Railway as `ACCESS_TOKEN`

---

### Step 5 — Add Your Spare Number

1. In Meta Developer → WhatsApp → API Setup
2. Click **Add phone number**
3. Enter your spare SIM number
4. Verify with OTP

---

## That's it! 🎉

Now text your bot number:
- `sent 500` → bot replies to both you and your friend with updated balance
- `balance` → get current balance anytime
- `history` → see last 5 transactions

---

## Files

| File | Purpose |
|---|---|
| `index.js` | Main bot server |
| `.env.example` | Config template (rename to .env) |
| `balance.json` | Auto-created, stores balance data |
| `package.json` | Node dependencies |
