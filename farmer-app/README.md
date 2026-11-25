# 🌾 AgriDirect (`farmer-app`)

Frontend-only React 19 + Vite 8 application for direct farmer-to-buyer produce trading and APMC Mandi price benchmarking, persisted in browser `localStorage`.

## Local Development

```bash
cd farmer-app
npm install
npm run dev
```

## Scripts

- `npm run dev` — Start local dev server (`http://localhost:5173`)
- `npm run lint` — Run `oxlint`
- `npm test` — Run `node --test tests/app.test.mjs`
- `npm run build` — Generate production build in `dist/`
- `npm run preview` — Preview production build

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Farmer | `ramesh@demo.com` | `demo1234` |
| Farmer | `anita@demo.com` | `demo1234` |
| Buyer | `sunita@demo.com` | `demo1234` |
| Admin | `admin@demo.com` | `demo1234` |

## Vercel Deployment

`vercel.json` configures SPA rewrites (`/(.*)` → `/index.html`). Set **Root Directory** to `farmer-app`, **Build Command** to `npm run build`, and **Output Directory** to `dist`.
