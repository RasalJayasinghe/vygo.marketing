# Marketing Dashboard

Internal marketing dashboard for Vygo. Renders performance views for social posts, EDMs, webinars and podcasts, and includes tools for generating webinar briefs and repurposing podcast transcripts.

## Data source

By default the app reads a published Google Sheet as CSV (no setup needed). Keep **File → Share → Publish to web** enabled with CSV output if the feed stops updating.

**HubSpot (optional, live data):**
1. In HubSpot: **Development → Keys → Service keys**. Grant `marketing.campaigns.read` (campaigns), plus `content` (emails & landing pages) and `forms` if you want those objects live.
2. Copy `.env.example` to `.env.local` and set:
   - `HUBSPOT_TOKEN` — the service key (server-side only, never `VITE_`-prefixed)
   - `VITE_HUBSPOT_ENABLED=true`
3. For production, add the same two variables in Netlify → **Site configuration → Environment variables**, then redeploy (`VITE_` flags are baked in at build time).
4. Live HubSpot data depends on the service key scopes:
   - `marketing.campaigns.read` — campaign list
   - `content` — marketing emails and landing pages
   - `forms` — form definitions
   Without `content` / `forms`, the dashboard still loads campaigns and keeps EDMs, webinars, and social from the sheet.

## Quick Tools

Calls Claude via a Netlify Function to generate:
- **Webinar briefs** — titles, descriptions, landing page copy, LinkedIn posts, EDMs
- **Podcast repurposing** — LinkedIn post + Spotify caption from a pasted transcript

Requires `ANTHROPIC_API_KEY` in Netlify environment variables.

## Requirements

- Node.js 20+ (CI uses Node 22)

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in keys. `npm run dev` proxies HubSpot locally. To run Netlify Functions (briefs, Zoom, Slack) as well:

```bash
npx netlify dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub repository

```bash
git remote add origin https://github.com/rasaljayasingheatvygo/marketingdashboard.git   # if not already added
git push -u origin main
```

## Netlify + Git

1. Open [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Select the GitHub repo `rasaljayasingheatvygo/marketingdashboard`.
3. Build settings are in `netlify.toml` (`npm run build`, publish `dist`).
4. Add environment variables (`HUBSPOT_TOKEN`, `VITE_HUBSPOT_ENABLED`, `ANTHROPIC_API_KEY`, and optional Slack/Zoom keys), then deploy.

Pushes to `main` trigger production deploys automatically.

## CI

GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests to `main` / `master`.

## License

ISC
