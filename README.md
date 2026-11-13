# 🌾 AgriDirect — Modern Farmer-to-Buyer Web Application

A complete redesign built with **React 19**, **Vite**, **Framer Motion** (for smooth sliding animations and page transitions), **Lucide Icons**, and **Recharts**.

---

## 🚀 Features

- **Smooth Sliding Animations**: Page transitions, staggered card reveals, interactive hover effects, and animated charts powered by Framer Motion.
- **Farmer Dashboard**: Real-time sales KPIs, 6-month revenue trends, stock alerts, and quick actions.
- **Harvest Listings CRUD**: Add, edit, pause, and delete crop listings with automatic unit detection.
- **Fair-Price Intelligence**: Automatic comparison of farmer asking rates against 24-month regional APMC Mandi benchmarks.
- **Sales & Orders Ledger**: Record offline cash sales, manage marketplace orders, update statuses, and export to CSV.
- **Buyer Marketplace**: Filter by crop category, price, and location; place purchase orders directly.
- **Market Price Trends**: Interactive APMC charts across 5 major Mandi hubs (Nashik, Pune, Indore, Raipur, Azadpur) with 6/12/24-month time horizons.
- **Vercel-Ready**: Preconfigured `vercel.json` with SPA routing rewrites.

---

## 💻 How to Run Locally

### 1. Navigate to the React App
```bash
cd farmer-app
```

### 2. Install Dependencies (if not already installed)
```bash
pnpm install
# or: npm install
```

### 3. Start the Development Server
```bash
pnpm run dev
# or: npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🔑 Demo Accounts

Use any of these preset demo credentials:

| Role | Email | Password |
|---|---|---|
| **Farmer** | `ramesh@demo.com` | `demo1234` |
| **Farmer** | `anita@demo.com` | `demo1234` |
| **Buyer** | `sunita@demo.com` | `demo1234` |

---

## ☁️ Deploy to Vercel

### Option 1: Deploy with Vercel CLI (Fastest)

1. Install Vercel CLI globally (if needed):
   ```bash
   npm i -g vercel
   ```
2. Navigate to the app directory:
   ```bash
   cd farmer-app
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. For production release:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub / Vercel Web Dashboard

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository.
3. In **Project Settings**:
   - **Root Directory**: Select `farmer-app`
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm run build` (or `npm run build`)
   - **Output Directory**: `dist`
4. Click **Deploy**! The included `farmer-app/vercel.json` will automatically handle SPA client-side routing.
