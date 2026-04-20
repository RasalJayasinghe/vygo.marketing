# Marketing Dashboard

Internal marketing metrics dashboard for Vygo. It reads a published Google Sheet as CSV and renders performance views for social posts, EDMs, and webinars.

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
