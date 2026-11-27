# ClockMe

Track your shifts and see exactly what you'll be paid, with Polo the mascot.

- `index.html`: the whole app (one file: layout, styles and code)
- `api/read-rota.js`: reads a rota photo or text on the server (needs `ANTHROPIC_API_KEY`)
- `manifest.webmanifest`, `sw.js`, `icons/`: install to the home screen and open offline
- `vercel.json`: security headers and caching

Hosted on Vercel. Every push to `main` deploys automatically.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns on reading rota photos. Without it the app asks people to paste the rota as text. |
| `CLOCKME_MODEL` | Optional. The Claude model used for rota reading. |
