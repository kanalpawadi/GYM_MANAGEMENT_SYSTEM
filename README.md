# 🏋️‍♂️ RV-Fitness Gym Platform

A production-grade, dark-first website and full-stack gym management platform for **RV-Fitness Gym** (India). Built with modern high-performance web standards, robust role-based access control (RBAC), and automated GST billing.

---

## 🌟 Key Features

### 🌐 1. Public Website & Fitness Calculators
- **Modern Dark & Yellow Design System**: Black base (`#0A0A0A`, `#1A1A1A`), yellow highlights (`#FFD400`), typography (`Bebas Neue` & `Poppins`).
- **13 Complete Pages**: Home, About, Programs, Trainers, Plans, Schedule, Gallery (Lightbox), Transformations, Blog, BlogDetail, FAQ (Searchable Accordion), Contact, Policies, 404.
- **4 Interactive Fitness Calculators**: BMI Index & Category, TDEE & Calorie Deficit/Surplus Target, Body Fat % (US Navy formula), Ideal Weight (Devine & Robinson formulas).
- **Lead CRM & Trial Pass Forms**: 10-digit Indian phone validation (`/^[6-9]\d{9}$/`), honeypot spam protection, and automated email confirmation alerts.
- **Floating Action Toolbar**: Floating WhatsApp CTA (`+91 98765 43210`) and Instant Call Button.

### 👤 2. Member Portal
- **Role-Based Authentication**: Supabase Auth integration with custom user profile triggers and instant 1-click role preview switcher.
- **Member Overview Dashboard**: Active plan countdown, attendance streak counter (14 Days Flame), next booked class indicator, and quick actions.
- **Digital QR Membership Card**: Contactless entry card with rotating security token (`QRCodeSVG`).
- **Razorpay Payments & GST Invoices**: Membership checkout with coupon discount validation (`RVFIT20`, `FLAT500`), 18% GST calculation, Razorpay order integration, and downloadable PDF/text tax receipts.
- **Attendance & Class Reservations**: Monthly attendance calendar view, group class seat reservation & waitlist toggle.
- **Progress Tracker**: Weight and body fat metric logging with interactive **Recharts** line graph visualizations.

### 🛡️ 3. Admin Dashboard & Trainer Panel
- **Collapsible Admin Sidebar**: Access restricted via security definer roles (`is_admin()`, `is_staff()`).
- **Overview KPIs**: Active members, new joins, memberships expiring in 7 days, daily & monthly revenue, today's check-ins count.
- **Member Management**: Filterable member CRUD table with search by phone/name, status badges, and one-click CSV export.
- **Lead CRM Kanban**: Pipeline board (`New` -> `Contacted` -> `Trial` -> `Converted` / `Lost`).
- **Reception Scanner Terminal**: Digital QR webcam scanner simulation with big visual result screen (**GREEN "WELCOME - ACTIVE PASS"** / **RED "EXPIRED"**).
- **Financial Ledger & Expenses**: Record cash/UPI counter payments, pending dues, and track monthly operating expenses.
- **Automated Cron Jobs**: Background cron endpoints (`/api/v1/cron/expiry-check`, `/api/v1/cron/reminders`, `/api/v1/cron/daily-report`) with secret header protection.
- **Trainer Panel**: Assigned member list, assign workout schedules, customize diet macro plans, and track athlete measurements.

---

## 🏗️ Monorepo Architecture

```text
rv-fitness/
├── apps/
│   ├── web/                     # React 18 + Vite + TypeScript Frontend
│   │   ├── src/
│   │   │   ├── components/      # UI Library, Calculators, Banners, Navbar, Footer
│   │   │   ├── context/         # AuthContext with Demo Role Switcher
│   │   │   ├── pages/
│   │   │   │   ├── public/      # 13 Public Marketing & Calculator Pages
│   │   │   │   ├── auth/        # Login, Signup, ForgotPassword
│   │   │   │   ├── member/      # Member Dashboard, QR Card, Checkout, Invoices, Progress
│   │   │   │   ├── admin/       # Admin Dashboard, Member CRUD, Lead CRM, Scanner, Reports
│   │   │   │   └── trainer/     # Trainer Athlete Panel, Workout & Diet Assigners
│   │   │   └── routes/          # ProtectedRoute Role Guards
│   └── api/                     # Next.js App Router API Server (/api/v1/*)
├── supabase/
│   ├── migrations/              # PostgreSQL DDL, RLS Policies, Triggers & Functions
│   └── seed.sql                 # Seed Content (Plans, Trainers, Classes, FAQs, Blogs)
└── docs/                        # SETUP.md & API.md
```

---

## 🚀 Quick Start Instructions

```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Build production web bundle to verify typescript correctness
npm run build:web

# 3. Launch React Web Frontend (http://localhost:5173)
npm run dev:web

# 4. Launch Next.js API Server (http://localhost:3000/api/v1)
npm run dev:api
```
