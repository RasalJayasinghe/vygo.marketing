# Marketing Dashboard

Internal marketing dashboard for Vygo. Renders performance views for social posts, EDMs, webinars and podcasts, and includes a Quick Tools side panel for generating webinar briefs and repurposing podcast transcripts.

## Data source

By default the app reads a published Google Sheet as CSV (same as before — no setup needed).

**HubSpot (optional, live data):**
1. In HubSpot: **Development → Keys → Service keys**. Grant `marketing.campaigns.read` (campaigns), plus `content` (emails & landing pages) and `forms` if you want those objects live.
2. Copy `.env.example` to `.env.local` and set:
   - `HUBSPOT_TOKEN` — the service key (server-side only, never `VITE_`-prefixed)
   - `VITE_HUBSPOT_ENABLED=true`
3. For production, add the same two variables in Vercel → Project → Settings → Environment Variables, then redeploy (`VITE_` flags are baked in at build time).
4. Live HubSpot data depends on the service key scopes:
   - `marketing.campaigns.read` — campaign list (this is what the current key can read)
   - `content` — marketing emails and landing pages
   - `forms` — form definitions
   Without `content` / `forms`, the dashboard still loads campaigns and keeps EDMs from the sheet.

## Quick Tools (brief generator)

The side panel ("Quick tools" button, top right) calls Claude via a serverless function to generate:
- **Webinar briefs** — titles, descriptions, landing page copy, LinkedIn posts, EDMs
- **Podcast repurposing** — LinkedIn post + Spotify caption from a pasted transcript

Requires `ANTHROPIC_API_KEY` set in Vercel → Project → Settings → Environment Variables. Without it, the panel will show a clear error rather than failing silently.

## Live site

**Production:** [vygometricsdashboard.vercel.app](https://vygometricsdashboard.vercel.app)

Deployed on Vercel (Vite preset: build `npm run build`, output `dist`).

## Requirements

- Node.js 20+ (CI uses Node 22)

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in keys. `npm run dev` proxies HubSpot
locally. Quick Tools (`/api/generate-brief`) still needs:

```bash
npx vercel dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub repository

Create an empty repository at `https://github.com/rasaljayasingheatvygo/marketingdashboard` (no README/license from GitHub’s wizard), then:

```bash
git remote add origin https://github.com/rasaljayasingheatvygo/marketingdashboard.git   # if not already added
git push -u origin main
```

If the remote already exists but push fails, confirm the repo exists under your account and you are authenticated (`gh auth login` or a [personal access token](https://github.com/settings/tokens)).

## Vercel + Git (recommended)

1. After the repo exists on GitHub, open the [Vercel project](https://vercel.com/) → **Settings** → **Git** → **Connect Git Repository**.
2. Select `rasaljayasingheatvygo/marketingdashboard`.  
   Pushes to `main` will trigger production deploys automatically.

The first CLI deploy may have failed to auto-link that repo if it did not exist yet; reconnecting in the dashboard fixes it.

## Data source

The app fetches CSV from the published Google Sheet. Keep **File → Share → Publish to web** enabled with CSV output if the feed stops updating.

## CI

GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests to `main` / `master`.

## License

ISC
