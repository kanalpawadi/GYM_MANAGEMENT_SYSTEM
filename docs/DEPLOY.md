# Deploying RV Fitness on Vercel

The project has two parts. Each is a separate (free) Vercel project from the same GitHub repository.

| Part | Folder | What it is | Example URL |
|---|---|---|---|
| **Website + portal** | `apps/web` | React app: public site, login, member, trainer and admin panels | `https://rv-fitness.vercel.app` |
| **API** | `apps/api` | Next.js API: contact form, visit booking, plans, payments webhook | `https://rv-fitness-api.vercel.app` |

The database, logins and photo storage are in **Supabase**, which is already set up.

---

## Before you start

1. **Check everything builds and passes** (from the repository root):
   ```bash
   npm install
   npm run verify
   ```
2. **Push the code to GitHub.** Vercel deploys from GitHub (`kanalpawadi/GYM_MANAGEMENT_SYSTEM`).
3. **Have your keys ready** from Supabase → **Project Settings → API**:
   - Project URL (e.g. `https://pqddtgnurpjmcmhtmnfc.supabase.co`)
   - `anon` public key: used by the website
   - `service_role` secret key: used **only** by the API, never in the website

---

## Step 1: deploy the API (`apps/api`)

1. Go to <https://vercel.com/new> and **Import** the GitHub repository.
2. Set up the project:

   | Setting | Value |
   |---|---|
   | Project name | `rv-fitness-api` |
   | Framework preset | **Next.js** |
   | Root directory | **`apps/api`** (click *Edit* and choose the folder) |
   | Build / install commands | leave the defaults |

3. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role** key |
   | `ALLOWED_ORIGIN` | the website URL from Step 2, e.g. `https://rv-fitness.vercel.app` (no slash at the end). If you don't know it yet, put a placeholder and update it after Step 2. |
   | `RAZORPAY_WEBHOOK_SECRET` | only once Razorpay is set up (see Step 5) |
   | `RAZORPAY_KEY_ID` | only once Razorpay is set up |

4. Click **Deploy**. Note the URL, e.g. `https://rv-fitness-api.vercel.app`.
5. **Check it:** open `https://rv-fitness-api.vercel.app/api/v1/plans`. You should see the three plans as JSON.

---

## Step 2: deploy the website (`apps/web`)

1. <https://vercel.com/new> → **Import** the **same** repository again.
2. Set up the project:

   | Setting | Value |
   |---|---|
   | Project name | `rv-fitness` |
   | Framework preset | **Vite** |
   | Root directory | **`apps/web`** |
   | Build command | `npm run build` (already set in `apps/web/vercel.json`) |
   | Output directory | `dist` |

3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase **anon** public key |
   | `VITE_API_BASE_URL` | the API URL from Step 1 **plus `/api/v1`**, e.g. `https://rv-fitness-api.vercel.app/api/v1` |

4. Click **Deploy**. Note the URL, e.g. `https://rv-fitness.vercel.app`.
5. **Back in the API project:** set `ALLOWED_ORIGIN` to this website URL, then **Deployments → ⋯ → Redeploy**. Without this, the contact and visit forms are blocked by the browser (CORS).

Page links like `/plans` or `/portal/dashboard` work on refresh because `apps/web/vercel.json` already sends every route to the app.

---

## Step 3: tell Supabase your website address

Supabase → **Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://rv-fitness.vercel.app` |
| Redirect URLs (add both) | `https://rv-fitness.vercel.app/login` and `https://rv-fitness.vercel.app/reset-password` |

This makes the sign-up confirmation and **Forgot password** emails link back to your live site.

---

## Step 4: test the live site end to end

- [ ] Home page loads with photos; the menu works on a phone.
- [ ] **Contact → Send Enquiry** shows a success message, and the enquiry appears in Supabase → Table editor → `leads`.
- [ ] **Book Your Gym Visit** on the home page works; check the `trial_bookings` table.
- [ ] **Login** as Super Admin, Owner and a trainer: each lands on the right panel.
- [ ] **Forgot password** sends an email whose link opens `/reset-password` on the live site.
- [ ] **Super Admin → Website Editor:** change a line of text and save; it shows on the public page.
- [ ] **Trainer** saves a diet plan; the member sees it under **My Diet & Workout**.
- [ ] The Login page does **not** show the "Instant Dev Role Demo Selector" (it only appears when running locally).

---

## Step 5: Razorpay (when you have the owner's account)

Payments stay **simulated** until this is done; no money moves.

1. **Keys:** in Razorpay → Settings → API Keys, create keys. Add `RAZORPAY_KEY_ID` (and the key secret, when real checkout is built) to the **API** project's environment variables.
   - **Never paste the secret into the code or into chat.**
2. **Webhook:** in Razorpay → Webhooks:
   - add `https://rv-fitness-api.vercel.app/api/v1/payments/webhook` with a secret of your choice
   - put the same value in `RAZORPAY_WEBHOOK_SECRET` (API project) and redeploy
   - the API rejects any webhook without a valid signature
3. The real checkout flow (creating orders and activating memberships) still has to be built. See section 15 of `PROJECT-DOCUMENTATION.md`.

---

## Custom domain (optional)

To use your own domain (e.g. `rvfitnessgym.in`):
1. Vercel → website project → **Settings → Domains**, then add the domain and follow the DNS instructions.
2. Update the domain in three places:
   - `ALLOWED_ORIGIN` (API project)
   - Supabase **Site URL** and **Redirect URLs**
   - `apps/web/public/sitemap.xml` and `robots.txt`

---

## Updating the site later

Every push to the `main` branch on GitHub redeploys both projects automatically. Pull requests get their own preview links.

> Preview links have a different address. Forms on a preview site are blocked by CORS unless you temporarily set `ALLOWED_ORIGIN` to that preview URL.

## Troubleshooting

| Problem | Fix |
|---|---|
| Contact / visit form says it can't reach the server | `VITE_API_BASE_URL` is missing or wrong (it must end in `/api/v1`), or `ALLOWED_ORIGIN` on the API doesn't exactly match the website URL. Redeploy after changing variables. |
| Form says "We couldn't send your enquiry right now" | The API can't write to Supabase: check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the API project. |
| Login does nothing / console says "Supabase is not configured" | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the website project and redeploy. |
| Reset-password email opens localhost | Set the Supabase **Site URL** and **Redirect URLs** (Step 3). |
| 404 when refreshing a page like `/plans` | Root directory must be `apps/web`, so that `vercel.json` is used. |
