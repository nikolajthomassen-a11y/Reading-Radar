# Reading Radar — bookshelf-to-recommendations app

Point your iPhone camera at a bookshelf → the app reads the spines with AI → builds your library → generates personal book recommendations. Includes "More like this", "Already read" and "Bought it" on every pick.

This is a mobile web app: friends open a link in Safari, tap **Share → Add to Home Screen**, and it behaves like an app (icon, full screen, camera access). No App Store, no TestFlight.

## What's in this folder

- `public/index.html` — the whole app (front end)
- `public/manifest.json`, `public/icon.png` — home-screen app icon & settings
- `netlify/functions/scan.mjs` — serverless function: photo → book list (calls the Claude API)
- `netlify/functions/recommend.mjs` — serverless function: library → taste profile + picks
- `netlify.toml` — tells Netlify where everything lives

Your Claude API key lives **only** in Netlify's server settings — friends never see it and it is never in the app's code.

## Setup (about 15 minutes)

### 1. Get a Claude API key
1. Go to https://console.anthropic.com and sign in / create an account.
2. Add a small amount of credit under **Billing** — $5 is plenty to start.
3. Under **API Keys**, create a key and copy it (starts with `sk-ant-`).

### 2. Put this folder on GitHub
(Netlify needs a Git repo to run the serverless functions.)
1. Go to https://github.com → **New repository** → name it e.g. `reading-radar` → Create.
2. On the empty repo page, click **"uploading an existing file"**.
3. Drag **the contents of this folder** (netlify.toml, the `public` and `netlify` folders) into the upload area, keeping the folder structure, and commit.

### 3. Create the site on Netlify
1. In Netlify: **Add new site → Import an existing project → GitHub** → pick your `reading-radar` repo.
2. Leave build settings as they are (no build command needed — `netlify.toml` handles it) → **Deploy**.
3. Go to **Site configuration → Environment variables** and add:
   - `ANTHROPIC_API_KEY` = your key from step 1 *(required)*
   - `APP_PASSCODE` = any word you choose *(recommended — only people with this code can use the app, so strangers can't spend your API credit)*
   - `CLAUDE_MODEL` = a model ID, if you ever want to change it *(optional; default is claude-haiku-4-5 — fast and cheap)*
4. **Deploys → Trigger deploy** once more so the functions pick up the variables.

### 4. Share with friends
Send them the site URL and the passcode. On iPhone: open in Safari → **Share → Add to Home Screen**. First launch: enter the passcode, scan a shelf, go to Picks.

## Updating the app later
Edit or replace files in the GitHub repo (the web editor is fine) — Netlify redeploys automatically. Or ask Claude for a new version of a file and upload it to the repo.

## Costs (rough)
With the default model: a shelf scan ≈ 1–2 øre / a fraction of a cent; one recommendation batch ≈ the same. $5 of credit covers hundreds of scans and batches. Set a spending limit in the Anthropic console if you want a hard cap.

## Known prototype limits
- "New & upcoming" picks come from the AI's knowledge, which trails the very latest releases by some months. (A live "search the web for new releases" upgrade is possible later.)
- Each phone keeps its own library (stored in the browser). Clearing Safari website data erases it. Real accounts/sync would be the next step after testing.
- Spine reading is good but not perfect — that's why the app asks you to confirm the scanned list before adding it.
