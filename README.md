# Smart Meter Communication Dashboard
### Tata Power DDL - Data & Frontend Internship Project

A React + TypeScript dashboard for monitoring smart meter communication, ageing buckets, meter-type performance, and daily operational updates. The app includes a working authentication flow, CSV upload support, light/dark mode, and an admin panel for managing dashboard data.

## Features

- Dashboard overview with KPI cards and charts
- District-wise communication ageing view
- Meter type breakdown and performance charts
- Daily updates timeline
- Light and dark theme support
- Authentication with signup and sign-in
- Sign in using either email or employee ID
- CSV upload for district data in the admin panel
- Persistent data using `localStorage`
- Responsive layout for desktop and mobile

## Authentication

The app uses a local demo authentication system.

### Sign up
- Full name
- Email address
- Employee ID
- Password
- Confirm password

Department is not required.

### Sign in
You can sign in using either:
- the email address used at signup, or
- the employee ID used at signup

### Demo account
If you want to test immediately, use:
- Email: `aman.yadav@tatapower.com`
- Employee ID: `TM123456`
- Password: `TataPower1`

## Admin Panel

Open the admin panel from the dashboard header and enter:
- Password: `tpddl2025`

Admin actions:
- Add, edit, and delete districts
- Edit meter type data
- Add daily updates
- Upload CSV files to update district data

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the development server
```bash
npm run dev
```

Open the app in your browser at the local Vite URL shown in the terminal.

## Production Build

```bash
npm run build
```

This creates the production output in the `dist` folder.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- localStorage for persistence

## Project Structure

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── assets/
├── components/
│   └── auth/
└── context/
```

## Notes

- The dashboard data is stored in the browser, so refresh keeps your changes.
- CSV imports update the main dashboard immediately after upload.
- Routes such as `/signin`, `/signup`, and `/dashboard` are handled client-side.

Built by Aman Yadav for Tata Power DDL internship work.
