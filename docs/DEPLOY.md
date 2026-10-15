# Deploying RV Fitness, Narsobawadi

## 1. Verify locally

```bash
npm install
npm run verify
```

This runs TypeScript checks, 75 automated tests (63 web + 12 API) and both production builds.

## 2. Website (`apps/web`) — Vercel or Netlify

| Setting | Value |
| --- | --- |
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Output directory | `dist` |

SPA routing is already configured: `apps/web/vercel.json` (Vercel) and `apps/web/public/_redirects` (Netlify).

Environment variables (see `apps/web/.env.example`):

- `VITE_API_BASE_URL` — the deployed API URL, e.g. `https://api.example.com/api/v1`. **Required**: without it the contact and visit-booking forms post to `localhost` and fail.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — the real Supabase project.

## 3. API (`apps/api`) — Vercel

| Setting | Value |
| --- | --- |
| Root directory | `apps/api` |
| Framework | Next.js |

Environment variables (see `apps/api/.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN` (the website URL, for CORS), plus the Razorpay / Resend / cron keys if those features are used.

## 4. Database (Supabase)

Run `supabase/migrations/01_initial_schema.sql`, then `supabase/seed.sql` (seeds the real Monthly ₹1,500 / Six Month ₹7,500 / Yearly ₹12,000 plans and gym contact details).

## 5. Pre-launch checklist

- [ ] Set the real domain in `apps/web/public/sitemap.xml` and `robots.txt` (currently `rvfitnessgym.in`).
- [ ] Add the Instagram handle in `apps/web/src/config/site.ts` (`instagram`); the footer link stays hidden until it's set.
- [ ] Confirm gym timings with the client (`hours` in `site.ts`).
- [ ] If the gym is GST-registered, set `gstRate` in `site.ts` and add the GSTIN in Admin → Settings.
- [ ] Remove or confirm the `RVFIT20` 20% offer banner/popup (`components/layout/OfferBanner.tsx`) and coupon codes — these are sample promotions.
- [ ] Replace sample trainers, transformations, blog posts, gallery photos and class schedule with real content.
- [ ] The member/admin portal currently uses **demo login** (role switcher, mock data) and **simulated Razorpay payments**. Wire up real Supabase Auth and Razorpay before promoting the portal to members.
- [ ] The API returns "success" even when the database insert fails (dev fallback). Make sure Supabase env vars are set so enquiries are actually saved.
