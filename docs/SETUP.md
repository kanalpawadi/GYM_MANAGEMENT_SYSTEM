# RV-Fitness Gym Setup & Deployment Guide

This guide provides step-by-step instructions to set up, run, and deploy the RV-Fitness Gym monorepo locally and to production.

---

## 1. Prerequisites
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher
- **Supabase Account**: [supabase.com](https://supabase.com)
- **Razorpay Developer Account**: [razorpay.com](https://razorpay.com)

---

## 2. Environment Variables (.env)

### `apps/web/.env`
```env
VITE_SUPABASE_URL=https://vfkkjbycfcndipwrjtat.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_RAZORPAY_KEY_ID=rzp_test_rvfitnessgym123
```

### `apps/api/.env`
```env
NEXT_PUBLIC_SUPABASE_URL=https://vfkkjbycfcndipwrjtat.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=rzp_test_rvfitnessgym123
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
RESEND_API_KEY=re_your_resend_api_key
CRON_SECRET=rv_gym_cron_secret_321
ALLOWED_ORIGIN=http://localhost:5173
```

---

## 3. Database Migration & Seeding (Supabase)

1. Connect to your Supabase PostgreSQL instance:
```bash
psql "postgresql://postgres:[PASSWORD]@db.vfkkjbycfcndipwrjtat.supabase.co:5432/postgres" -f supabase/migrations/01_initial_schema.sql
psql "postgresql://postgres:[PASSWORD]@db.vfkkjbycfcndipwrjtat.supabase.co:5432/postgres" -f supabase/seed.sql
```

2. Verify RLS policies and trigger functions (`on_auth_user_created`, `generate_gst_invoice`, `expire_memberships_job`).

---

## 4. Local Development

```bash
# 1. Install root & workspace dependencies
npm install

# 2. Run React Web Frontend (Vite)
npm run dev:web
# Server running at: http://localhost:5173

# 3. Run Next.js API Server (Route Handlers)
npm run dev:api
# API server running at: http://localhost:3000/api/v1
```

---

## 5. Webhook & Cron Setup

- **Razorpay Webhook**: Point Razorpay test webhook to `https://your-api-domain.com/api/v1/payments/webhook` with event `payment.captured`.
- **Daily Cron Job**: Schedule an automated POST request to `https://your-api-domain.com/api/v1/cron/expiry-check` with header `x-cron-secret: your_cron_secret`.
