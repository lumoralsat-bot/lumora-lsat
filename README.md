# Lumora LSAT — AI-Powered LSAT Mastery

> Adaptive practice questions, argument sparring, full timed sections, and personalized study plans — all AI-generated, never repeated.

---

## 🚀 Deploy in 4 Steps (~10 minutes total)

This guide takes you from the zip file to a live public URL. No coding experience required.

---

### STEP 1 — Upload the code to GitHub (3 minutes)

GitHub is a free service that stores your code. Vercel (your host) reads from it.

1. Go to **[github.com](https://github.com)** and create a free account (or sign in).
2. Click the **green "New"** button on the left sidebar (or go to github.com/new).
3. Name your repository: `lumora-lsat` — leave everything else as default.
4. Click **"Create repository"**.
5. On the next page, click **"uploading an existing file"** (the link in the middle of the page).
6. **Drag and drop the entire `lumora-lsat` folder's contents** into the upload area.
   - Upload ALL files: `package.json`, `vite.config.js`, `index.html`, `vercel.json`, `.gitignore`, and the `src/` folder containing `App.jsx` and `main.jsx`
7. Scroll down, click **"Commit changes"** (the green button).

✅ Your code is now on GitHub.

---

### STEP 2 — Deploy to Vercel (2 minutes)

Vercel is a free hosting platform. It reads your GitHub code and publishes it as a live website.

1. Go to **[vercel.com](https://vercel.com)** and click **"Sign Up"**.
2. Choose **"Continue with GitHub"** — this links your accounts automatically.
3. Once signed in, click **"Add New Project"** (top right).
4. You'll see your `lumora-lsat` repository listed. Click **"Import"** next to it.
5. Vercel auto-detects it's a Vite/React project. **Don't change any settings.**
6. Click **"Deploy"**.
7. Wait ~60 seconds. Vercel builds and deploys your app.

✅ You now have a live URL like: `https://lumora-lsat-abc123.vercel.app`

**Share this link with anyone for testing — it works on any device, no login needed.**

---

### STEP 3 — Connect your custom domain (5 minutes)

Do this after you've bought a domain (e.g., `getlumora-lsat.com` on Namecheap for ~$12/year).

#### In Vercel:
1. Go to your project dashboard on Vercel.
2. Click **"Settings"** → **"Domains"**.
3. Type your domain (e.g., `getlumora-lsat.com`) and click **"Add"**.
4. Vercel will show you two DNS records to add. They look like this:
   ```
   Type: A      Name: @      Value: 76.76.21.21
   Type: CNAME  Name: www    Value: cname.vercel-dns.com
   ```
   Copy these — you'll need them in the next step.

#### In Namecheap (or your registrar):
1. Log into Namecheap → go to **"Domain List"** → click **"Manage"** next to your domain.
2. Click the **"Advanced DNS"** tab.
3. Delete any existing A records or CNAME records for `@` and `www`.
4. Click **"Add New Record"** and add the two records Vercel gave you.
5. Click the checkmark to save each one.
6. DNS propagation takes **5–30 minutes**. Then your domain is live.

✅ Your app is now live at your custom domain with HTTPS automatically enabled.

---

### STEP 4 — Add your Anthropic API key (required for AI features)

The app calls the Anthropic API to generate questions. You need an API key.

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and sign up / log in.
2. Click **"API Keys"** → **"Create Key"** → copy the key (starts with `sk-ant-...`).
3. In Vercel, go to your project → **"Settings"** → **"Environment Variables"**.
4. Add a new variable:
   - **Name:** `VITE_ANTHROPIC_API_KEY`
   - **Value:** paste your API key
5. Click **"Save"**, then go to **"Deployments"** and click **"Redeploy"**.

> **Note on API costs:** Anthropic charges per question generated. At current rates (~$0.003 per question), 1,000 questions costs about $3. For early testing this is negligible. When you add paid subscriptions later, your revenue covers this easily.

---

## 📁 Project Structure

```
lumora-lsat/
├── index.html          # App entry point
├── package.json        # Dependencies
├── vite.config.js      # Build config
├── vercel.json         # Routing config for Vercel
├── .gitignore          # Files excluded from GitHub
└── src/
    ├── main.jsx        # React mount point
    └── App.jsx         # The entire Lumora LSAT application
```

---

## 🧪 For Early Testers

Send testers your Vercel URL (`https://lumora-lsat-abc123.vercel.app`) before your domain is set up. It works immediately on:
- Desktop browsers (Chrome, Safari, Firefox, Edge)
- iPhone and Android (mobile-responsive)
- No account or download required

---

## 💳 Adding Payments Later (Stripe)

When you're ready to monetize, the integration is straightforward:

1. Create a [Stripe](https://stripe.com) account.
2. Add a `/subscribe` page that hits Stripe's checkout API.
3. Use Stripe webhooks to set a `isPaid` flag in your user database.
4. Gate the app behind a login + payment check.

This is a future step — the app is fully functional without it for beta testing.

---

## 🔄 Updating the App

Every time you want to push an update:
1. Open your `lumora-lsat` repository on GitHub.
2. Click on the file you want to update (e.g., `src/App.jsx`).
3. Click the **pencil icon** (Edit).
4. Make your changes.
5. Click **"Commit changes"**.

Vercel automatically detects the change and redeploys in ~60 seconds. Your live site updates with zero downtime.

---

## 📞 Support

Built with React + Vite + Anthropic Claude API.
Questions? Extend this app by opening it in Claude and describing what you want to change.
