# Smart Meter Communication Dashboard
### Tata Power DDL — Data & Frontend Internship Project

---

## 🚀 Setup in VS Code (3 steps)

### Step 1 — Install Node.js (if not already)
Download from: https://nodejs.org  
Choose **LTS version** → install → restart VS Code

### Step 2 — Open project in VS Code
1. Unzip the folder
2. Open VS Code
3. File → Open Folder → select `smart-meter-dashboard` 
4. Open Terminal: View → Terminal (or Ctrl+`)

### Step 3 — Install & Run
```bash
npm install
npm run dev
```

Open browser: **http://localhost:5173**

---

## 📁 File Structure

```
smart-meter-dashboard/
├── src/
│   ├── App.tsx          ← MAIN DASHBOARD (all code here)
│   ├── main.tsx         ← React entry point
│   └── index.css        ← Tailwind + global styles
├── public/
│   └── favicon.svg
├── index.html
├── package.json         ← dependencies
├── vite.config.ts       ← Vite config
├── tsconfig.json        ← TypeScript config
├── tailwind.config.js   ← Tailwind config
└── postcss.config.js
```

---

## 🔐 Admin Panel

Click **⚙️ Admin** button (top right)  
Password: **tpddl2025**

Features:
- Add / Edit / Delete districts
- Edit meter type data
- Log daily updates
- All data saved in localStorage (persists on refresh)

---

## 📦 Tech Stack (Resume-ready)

| Tech | Version | Purpose |
|------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Recharts | 2 | Charts (Bar, Pie, Radar) |
| Tailwind CSS | 3 | Styling |
| Vite | 5 | Dev server + build |
| localStorage | — | Data persistence |

---

## 🏗️ Build for Production

```bash
npm run build
```

Output goes to `/dist` folder — deploy to Vercel, Netlify, or GitHub Pages.

### Deploy to Vercel (free)
```bash
npm install -g vercel
vercel
```

---

## 📊 Data Source

- **File:** `Meters_Communication_Last_Status_Detail_Report_2025-12-26.zip` 
- **Records:** 6,46,302 smart meters
- **Districts:** 12 (BADLI, BAWANA, CIVIL LINES, KESHAVPURAM, KIRARI, MANGOL PURI, MODEL TOWN, MOTI NAGAR, NARELA, PITAMPURA, ROHINI, SHALIMAR BAGH)
- **Meter Types:** SP, PPWC, LTCT, HT, DT
- **Sources:** L+G (Landis+Gyr), FG (Genus)

---

## 🎓 Interview Points

1. **TypeScript** — 12 interfaces, typed props, `keyof DistrictRow` for sort keys
2. **Recharts** — BarChart, PieChart, RadarChart, stacked bars, custom tooltips
3. **useMemo** — filtered + sorted table data optimization
4. **useCallback** — stable handler references for localStorage writes
5. **Admin CRUD** — full add/edit/delete on districts, meter types, updates
6. **Responsive** — Tailwind grid, mobile-first, sticky header + tabs

---

## 🌟 Features

- **Real-time Dashboard** - Live data visualization with instant updates
- **Light/Dark Theme** - Professional theme toggle with persistence
- **CSV Upload** - Import district data with validation
- **Authentication** - Employee login/registration system
- **Responsive Design** - Works seamlessly on all devices
- **Data Persistence** - LocalStorage integration
- **Interactive Charts** - Bar, Pie, and Radar charts
- **Admin Panel** - Complete CRUD operations
- **Professional UI** - Modern, clean interface

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Amanyadav0315/smart_meter_dashboard.git
   cd smart-meter-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   Navigate to `http://localhost:5173` 

---

## 📱 Live Demo

**🌐 Access the dashboard**: https://dhruv1955.github.io/smart-meter-dashboard/

---

Built by **Aman Yadav** · IIIT Agartala · Tata Power DDL Internship Dec 2025–Jan 2026
