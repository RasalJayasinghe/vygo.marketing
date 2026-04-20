# Marketing Dashboard

Internal marketing metrics dashboard for Vygo. It reads a published Google Sheet as CSV and renders performance views for social posts, EDMs, and webinars.

## Requirements

- Node.js 20+ (CI uses 22)

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

## Deploy (Vercel)

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), **Add New Project** → import this repo.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build` · Output directory: `dist`.
5. Deploy. No environment variables are required for the default sheet URL baked into the app.

After the first deploy, every push to `main` triggers a production deployment when the Git integration is connected.

## Data source

The app fetches CSV from the published Google Sheet. Ensure the sheet stays **File → Share → Publish to web** with CSV output if the feed stops updating.

## License

ISC
