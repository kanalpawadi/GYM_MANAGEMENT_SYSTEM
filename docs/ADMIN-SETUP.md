# Logins, roles and the Website Editor: going live

## 1. Connect the real Supabase project
In `apps/web/.env` (and in your hosting provider's environment settings) set:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

The current value is a placeholder, so nobody can log in until this is set.

In Supabase → Authentication → URL Configuration, add your site's `/login` and `/reset-password` pages as redirect URLs.

## 2. Apply the database migrations (in order)
Run each file in `supabase/migrations/` in the Supabase SQL editor, or with `supabase db push`:

1. `01_initial_schema.sql`
2. `02_secure_profile_roles.sql`: new sign-ups are always members.
3. `03_super_admin_role.sql`: adds the Super Admin role. Run it on its own.
4. `04_roles_plans_content.sql`: role rules, trainer assignment, diet/workout plans, website content table, image bucket.
5. `05_photos_and_progress.sql`: profile photos (`avatars` bucket), the My Trainer card, and private body-progress photos (`progress-photos` bucket).
6. `06_fix_signup_trigger.sql`: safer sign-up when a phone number is already used.
7. `07_role_chain_and_gym_ops.sql`: role chain, profile fields, premium/normal members, plan requests and approval, discount, invoices, QR and selfie attendance, website-edit approval, notifications, water tracking.
8. `08_google_signin_profiles.sql`: Google sign-in creates a member profile with the Google name and photo, and repairs accounts that signed in but got no profile.
9. `09_member_registration_approval.sql`: new members fill a registration form and wait for the owner's approval before they can open their dashboard (section 17).
10. `10_chat_and_notices.sql`: one-to-one chat and the notice board (section 18).
11. `11_delete_member.sql`: the Gym Owner / Super Admin can permanently delete a member (section 21).
12. `12_supplements.sql`: the members' supplement log (section 22).
13. `13_assign_membership.sql`: staff change a member's plan; the owner can set custom plans and amounts (section 25).
14. `14_payment_receipts.sql`: money received with notes, part payments, receipts, and total paid / remaining (section 26).
15. `15_supplement_sales_charges_past_attendance.sql`: supplement sales with payment, "Add amount due", and adding past visits (section 27).
16. `16_plans_cancel_bills_no_date_limits.sql`: owner-managed subscription plans, cancelling a supplement sale's bill, and no date limits (section 28).
17. `17_cancel_payment_with_reason.sql`: the owner deletes a payment entered by mistake, with a reason (section 29).
18. `18_membership_expiry_and_staff_progress.sql`: ended plans go back to admission approval, 5-day renewal reminders, and staff adding progress photos (section 31).

> **If you already set the database up with `supabase/schema_complete.sql`**, you only need to run `06` to `18`.
> Until `07` is run, the new screens show "This feature needs the latest database update".

## 3. Make yourself Super Admin
1. Sign up on the website with your own email and confirm it.
2. In the Supabase SQL editor run:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

## 4. Give everyone else their role
| Who | How |
|---|---|
| Gym owner | They sign up. You set their role to **Gym Owner** in Admin → Users & Roles. |
| Trainer | They sign up. You or the owner set their role to **Trainer**. |
| Member | They sign up; members are the default. Assign a trainer in Users & Roles. |

Rules enforced by the database:
- Nobody can change their own role.
- Only the Super Admin can grant or remove Gym Owner / Super Admin.
- Only staff can assign trainers.

## 5. Diet and workout plans
- A trainer sees only the members assigned to them (Trainer Panel).
- **Diet Plan** / **Workout Plan** saves the plan. The member sees it under **Portal → My Diet & Workout**.
- Saving again replaces the plan. Older plans are kept as history.

## 6. Photos
- **Profile photo:** everyone can add one. Members use Portal → My Profile; trainers tap the camera on the Trainer Panel; admins use the sidebar. Photos are public (they appear in the portal and to trainers) and are limited to 3 MB.
- **My Trainer:** members see their assigned trainer's photo, name, phone and WhatsApp on the Dashboard and the My Diet & Workout page.
- **Body progress photos:** members log weight, measurements and front/side photos under Portal → Body Metrics.
  - Photos go to the private `progress-photos` bucket and are shown only through links that expire after 1 hour.
  - Who can see them: the member, their assigned trainer (Trainer Panel → View Progress & Photos), and the owner, manager and Super Admin. Receptionists cannot.
  - Only the member can add or delete entries.

## 7. Website Editor (Super Admin)
**Admin → Website Editor** edits:
- gym details
- home page
- about page
- plan names and features
- trainers
- programs
- gallery
- transformations
- FAQ
- offer banner
- blog

How it behaves:
- Images upload to the `site-media` storage bucket, max 5 MB each.
- **Reset to Original** returns a section to the built-in content.
- Plans and prices are no longer in the Website Editor. The owner manages them in **Admin → Subscription Plans** (section 28).

To let the Gym Owner edit content too:
- In `04_roles_plans_content.sql`, change `can_edit_content()` to `('super_admin', 'owner')`.
- Set `CONTENT_EDITOR_ROLES` in `apps/web/src/config/roles.ts` to match.

## 8. Demo role switcher
The one-click role buttons on the Login page only appear in local development (`npm run dev`). They are removed from production builds.

## 9. Google sign-in (one-time setup)
Members and staff can use **Continue with Google** on the Login and Sign Up pages. New Google users start as Members.

1. **Create a Google sign-in key.**
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
2. **Add the redirect address.** Under **Authorised redirect URIs**, add the callback URL shown in Supabase:
   - Supabase → **Authentication → Providers → Google**
   - it looks like `https://<your-project>.supabase.co/auth/v1/callback`
3. **Paste the keys into Supabase.**
   - Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Providers → Google**.
   - Turn Google on and save.
4. **Check the site addresses.** In Supabase → **Authentication → URL Configuration**, your website's `/login` page must be in the redirect URLs.

Until this is done, the Google button says "Google sign-in is not set up yet" and people use email and password.

### If Google sign-in shows an error
The Login page now says what went wrong. Match the message:

| Message on the Login page | Fix |
|---|---|
| "…the gym needs to run the latest database update (migration 08)" | Run `supabase/migrations/08_google_signin_profiles.sql` in the Supabase SQL editor. |
| "…the Google Client ID or Secret in Supabase is wrong" | Copy the **Client secret** again from Google Cloud → Credentials into Supabase → Providers → Google, with no spaces. Make sure the Client ID and secret come from the same OAuth client. |
| "Google sign-in was cancelled…" when nobody cancelled | Google Cloud → **OAuth consent screen**: press **Publish app**, or add the person under **Test users**. |
| "…opened in a different browser. Please tap Continue with Google again" | Finish the sign-in in the same browser tab. Also check the Site URL below. |
| "Another RV Fitness account already uses …" | That email already has an email/password account. Sign in with email and password. |
| You land back on the **home page** or **localhost** instead of the portal | Supabase → **Authentication → URL Configuration**: set **Site URL** to your live website. Under **Redirect URLs** add `https://<your-site>/login` and `http://localhost:5173/login`. |

Google Cloud **Authorised redirect URIs** must contain only the Supabase callback (`https://<your-project>.supabase.co/auth/v1/callback`), not your website address.

## 10. Role chain: who can change what
**Super Admin > Gym Owner > Manager > Receptionist > Trainer > Member.**

Anyone can open and change the dashboards of people below them:
- **Super Admin:** everyone, including the owner.
- **Owner:** managers, receptionists, trainers and members.
- **Trainers:** members' profiles, diet and workout plans, progress and attendance.

How to open someone's dashboard:
- Admin → Members → **Open**
- Admin → Users & Roles → **Open dashboard**
- Trainer Panel → **Open**

Database rules enforce the same chain, so nobody can change someone at or above their level.

## 11. Plans: requests, approval, payments and invoices
1. **Request.** The member opens **Portal → Renew / Change Plan**, picks a plan and how they will pay (desk or online), and sends a request.
   - The price is decided by the database, including any discount.
2. **Approve.** The owner or staff open **Admin → Plan Requests** and choose one of:
   - **Approve · Paid Cash** / **Approve · Paid UPI**: the membership starts and a paid invoice is created.
   - **Approve · Payment Due**: the membership starts and the payment shows as due until you mark it paid (Financials or the member's page).
   - **Decline**, with an optional note.
3. **Notify.** The member gets a notification (bell icon) either way.
4. **Invoices.** Every paid payment has an invoice page with **Print / Save as PDF** and **Download HTML**.

Online card/UPI payment needs Razorpay; until it is connected, online-preference requests are approved with **Payment Due**.

## 12. Discount switch
Admin → Gym Settings → **Discount**. Only the owner or Super Admin can change it.

When it is on:
- the website shows the offer strip and pop-up
- every plan shows the discounted price
- plan requests are charged the discounted price

## 13. Premium and normal members
Change a member's type on their dashboard (Overview → **Member type**). Only staff can change it.

- **Premium:** gets a personal diet and workout plan from their trainer.
- **Normal:** sees the gym's **common plan**, set in the Trainer Panel → **Common Diet / Common Workout**.

## 14. Attendance
- **QR scan:** the member opens **Portal → Digital QR Card**. The trainer or front desk opens **Scanner** (Admin or Trainer Panel) and scans it.
  - The code changes every 30 seconds, so screenshots stop working.
  - If there's no QR, search the member by name, phone or member ID and press **Check in**.
- **Selfie check-in:** Admin → Gym Settings → **Selfie check-in (geofencing)**.
  1. Stand inside the gym and tap **Use my current location**.
  2. Set the allowed distance (for example 100 m) and save.
  3. Turn it on.

  Members can then check in with a selfie from **Portal → Attendance** when no trainer is free.
- **Limits:** phone locations can be faked with special apps. The selfie is kept so staff can review check-ins.

## 15. Website edits by the owner
The owner has the Website Editor too.

The Super Admin decides in Gym Settings → **Owner's website changes need approval**:
- **Off:** the owner's changes go live immediately.
- **On:** the owner's saves become "submitted for approval", and the Super Admin sees them at the top of the Website Editor with **Review / Approve / Decline**.

## 16. Daily plan pop-up and reminders
- **The pop-up.** When a member opens their dashboard, a once-a-day card shows today's meals, today's workout and a water tracker.
- **Reminders.** **Remind me** turns on Google-style browser notifications for meal times and water (every 2 hours, 7 AM–9 PM).
  - They work while the site is open, or installed on the phone's home screen.
  - Notifications while the browser is fully closed need a push service, which is not set up yet.

## 17. New member registration and approval
Every new account, whether email or Google, must be approved by the gym owner before it can use the member portal.

1. **Register.** On first sign-in, the member sees **Member Registration** and fills in their details:
   - name
   - mobile number and date of birth (required)
   - blood group, height, weight
   - medicines and health notes

   They press **Submit for Approval**.
2. **Wait.** The member sees **Waiting for approval**. They can edit their details, check the status, or visit the website, but cannot open the dashboard, request a plan or check in.
3. **Approve.** The owner (and Super Admin) gets a notification. They open **Admin → Approvals → New member registrations** and press one of:
   - **Approve Member:** the member's dashboard opens straight away and they get a welcome notification.
   - **Ask to Fix Details:** write a note. The member sees it, corrects the form and sends it again.

Good to know:
- Only the owner and Super Admin can approve. Managers, receptionists and trainers cannot.
- When you make someone a trainer or other staff in **Users & Roles**, they don't need member approval.
- **Existing accounts when you run migration 09:**
  - Staff, and members with any membership, payment, plan request or check-in, stay approved.
  - Members who had only signed in are asked to register.
- The database enforces all of this, so it cannot be skipped from the browser.

## 18. Chat and notice board
### One-to-one chat
Where to find it:
- **Members:** the round gold **chat button** at the bottom-right of every portal page (it opens a popup), or **Chat in app** on the My Trainer card
- **Trainers:** Trainer Panel → **Messages**
- **Staff:** Admin → **Messages**
- **Message** on each row of Admin → Members and the Trainer Panel list, or on a member's dashboard, opens a chat with that person.

Who can chat with whom:
- Members see their own trainer plus the owner, manager and receptionist. They can also reply to anyone who messaged them first.
- Trainers and staff can chat with any approved member and with each other.
- Members cannot message other members. Members waiting for registration approval cannot chat yet.

Privacy:
- Chats are private. Only the two people in a chat can read it, not even the owner or Super Admin.
- Messages cannot be edited or deleted.

How it works:
- Unread counts show in the menu, and **Seen** shows when your last message has been read.
- New messages appear within a few seconds.
- For instant delivery, check that Supabase → **Database → Replication / Publications → supabase_realtime** includes the `messages` table. Migration 10 adds it for you.

### Notice board
- **Post:** trainers and staff (receptionist, manager, owner, Super Admin) use Portal/Trainer Panel/Admin → **Notice Board**. They write a title and the notice, and can **Pin to top** or set a **Show until** date.
- **Read:** everyone sees notices, including members, trainers and staff. The newest current notices also show on the member dashboard.
- **Notify:** everyone gets a bell notification when a new notice is posted.
- **Edit and delete:** trainers can unpin or delete their own notices. Managers, the owner and Super Admin can manage any notice.
- **Expiry:** expired notices disappear for members. Staff still see them, faded, so they can delete them.

## 19. Health assistant (Grok AI)
Members open the chat button and pick **Health Assistant**. Trainers and staff can use it from the member portal too.

**What it answers:**
- It only answers fitness, workouts, diet and nutrition, water, sleep, recovery and gym questions.
- Anything else (homework, coding, news, jokes and so on) gets a polite "I can only help with health and fitness" reply.
- It is not a doctor. It won't diagnose or change medicines, and for emergencies it tells people to call 108 / 112.

**One-time setup:**
1. Create an API key at [console.x.ai](https://console.x.ai).
2. In the **API** project on Vercel → Settings → Environment Variables, add `XAI_API_KEY` = your key. Optionally add `XAI_MODEL` (default `grok-3-mini`).
3. Redeploy the API project.

**Using Groq instead of Grok** (key starts with `gsk_`, from [console.groq.com](https://console.groq.com/keys)): set `XAI_API_KEY` = the Groq key, `XAI_BASE_URL` = `https://api.groq.com/openai/v1` and `XAI_MODEL` = `llama-3.3-70b-versatile`. No code change is needed.

For local testing, put the same lines in `apps/api/.env`. Never put the key in the website (`apps/web`) or in the code: anyone could read it there.

**Safeguards:**
- Only signed-in, approved members and staff can use it.
- Each person is limited to 20 questions per 10 minutes, to keep Grok costs low.
- The conversation is kept only in that browser tab and is sent to Grok to get an answer.

## 20. Exports (CSV, PDF, HTML)
**Admin → Members** and both reports in **Admin → Reports** have an **Export** menu:
- **CSV:** opens in Excel or Google Sheets.
- **PDF:** opens a print-ready page. Choose **Save as PDF** in the print window. If nothing opens, allow pop-ups for the site.
- **HTML:** a web page file you can open in any browser or email.

The member export uses your current filter (All / Premium / Normal) and search.

## 21. Deleting a member
Only the **Gym Owner** and **Super Admin** can delete. Open the member (Admin → Members → **Open**) and scroll to **Delete member**, then type the member's name to confirm. **This cannot be undone.**

**Deleted for ever:**
- their login (they can no longer sign in), profile and health details
- memberships, plan requests and attendance
- diet and workout plans, body metrics and water logs
- profile photo, body-progress photos and attendance selfies
- chats (both sides) and notifications

**Kept, for your accounts and GST records:**
- payments and invoices, labelled **Deleted member · RVF-xxxx**
- the invoice number, amount, plan and plan dates

Revenue reports and exports stay correct.

Rules:
- Only members can be deleted. To remove a trainer or other staff, first change their role to Member in Users & Roles.
- Nobody can delete their own account.
- The delete runs inside the database, so these rules cannot be bypassed.

## 22. Supplements
Members open **Portal → Supplements** (under **More** on phones):
- **Note a supplement:** name, brand, dose, when they take it, and the date.
- **I bought this:** also add the price, quantity, shop and bill / invoice number.

The history shows the total spent. **Statement / invoice** downloads the log as:
- **CSV**, for Excel or Google Sheets
- **HTML**, a web page
- **Minified HTML**, the same page as a smaller file

The member's trainer and gym staff see it on the member's page → **Supplements** tab. Entries are deleted if the member is deleted.

## 23. Generate payment
In **Portal → Payments & Invoices**, members press **Generate payment** and pick a plan. The price includes any discount.

1. The bill goes to **Admin → Approvals** like a renewal request.
2. After approval, the member pays at the front desk.
3. Staff mark it paid and the invoice appears.

**Pay online** shows as *coming soon*. It will take card / UPI payments once the gym's Razorpay account is connected; see DEPLOY.md, Step 5.

## 24. Photos and the header Login button
- **Photos:** tap any profile photo (member list, member page, My Trainer card, approvals, scanner) to see it full size. Tap again or press Esc to close.
- **Login button:** on phones, the gold button next to the ☰ menu is **Login**, or **My Portal** when signed in. **Book Free Trial** is inside the ☰ menu.

## 25. Change a member's plan (and custom plans)
Open the member (Admin → Members → **Open**, or Trainer Panel → **Open**). In **Membership**, press **Change plan**:

1. **Pick a plan:** Monthly, Six Month or Yearly at the standard price (with any discount).
2. **Starts on:** today by default; it can be up to one month back.
3. **Payment:** **Paid cash**, **Paid UPI** or **Payment due**. A payment and invoice are created. Due payments can be marked paid later in Financials or on the member's Payments tab.
4. **Note:** optional, e.g. "Diwali offer".

**Owner only (Gym Owner and Super Admin):**
- **Custom plan:** your own name (e.g. "Student monthly"), length in months or days, and amount.
- **Custom amount:** change the amount of a standard plan.

Trainers, receptionists and managers can change plans, but only at the standard price.

If the new plan starts before the current one ends, the current plan ends the day before. If it hadn't started yet, it is cancelled. The member gets a notification.

## 26. Money received, receipts and what is left
Open the member → **Payments** tab:

- **Totals:** at the top you see **Total billed**, **Total paid** and **Remaining**.
- **Record payment received** (front desk, manager, owner, Super Admin):
  1. **Money is for:** a due bill, or **Something else** (personal training, locker...). For something else, type what it is for.
  2. **Amount:** it starts at what is left on the bill. Enter less for a **part payment**, e.g. ₹1,000 now and ₹500 later.
  3. **Paid by:** cash or UPI, plus a **note** (e.g. "Paid by brother, UPI ref 4521").
  4. Press **Save & make receipt**.
- **Receipts:** every amount gets a numbered receipt (RCPT-2026-00001). Open it from **Money received** to **Print / Save as PDF** or **Download HTML**. It shows the bill total, paid so far and remaining.
- **Bill status:** a part-paid bill shows **Part paid · ₹500 left**. Once the receipts reach the total, it becomes **Paid** and gets its invoice number.

Bills paid in other ways also get a receipt automatically: approvals, Change plan, and the quick **Paid CASH / Paid UPI** buttons.

Members see the same totals and their receipts in **Portal → Payments & Invoices**. Trainers can see the totals but cannot record money.

## 27. Supplement sales, amounts due and attendance since 2023
### Supplement sold at the gym
Front desk, manager, owner or Super Admin open the member → **Supplements**:
1. Fill in the supplement and tick **I bought this**.
2. **Bought from:**
   - **The gym:** enter the price, then choose **Paid cash**, **Paid UPI** or **Pay later**.
     - Paid: a paid bill and a receipt appear in Payments.
     - Pay later: the amount is added as due in Payments and the member is notified. Take the money later with **Record payment received**; part payments are fine.
   - **Somewhere else:** just a note with the shop. No gym bill.

Members and trainers can still note supplements, but without the payment option.

### Add amount due
Member → **Payments** → **Add amount due**: what it is for (e.g. "Locker (Nov)"), the amount and an optional note. It shows as a due bill, is included in **Remaining**, and the member gets a notification.

### Attendance since 2023
- **Member:** **Portal → Attendance** shows every visit from **January 2023**. Use the month and year boxes to jump back. The calendar doesn't go before January 2023.
- **Staff and trainers:** on the member's **Attendance** tab, tap a past day to **add a visit** (for records from before the app), or tap a green day to **remove** a wrong one. Visits can be added from 1 Jan 2023 up to today.

**Note:** if Payments shows "No money received yet" for bills that are already paid, run migration `14`. It creates receipts for past payments.

## 28. Subscription plans, cancelled supplement bills, workout fallback and dates
### Subscription plans (Gym Owner and Super Admin)
**Admin → Subscription Plans:**
- **Add plan:** name, months, price, description, features (one per line), badge, display order, and highlight.
- **Edit:** change the price, length or text. New prices apply to new requests and **Change plan**; existing memberships and bills keep their price.
- **Remove:** hides the plan from the website and plan requests. Members already on it keep their membership. Removed plans are listed underneath with **Restore**.

The website's Plans page, the home page, member plan requests, Generate payment and Change plan all use these plans, and the discount switch still applies. Migration 16 starts you with Monthly ₹1,500, Six Month ₹7,500 and Yearly ₹12,000.

### Deleting a supplement sale
When staff delete a supplement entry that was sold at the gym, its bill is **cancelled** too. It shows as "Cancelled" in Payments and invoices, and is left out of the totals. If the member had already paid, give the money back; the receipt stays for your records.

Members can't delete gym-sale entries.

### Workout / diet plan falls back to the common plan
On a member's page → **Diet & Workout**, **Delete plan** removes their personal plan, which is kept in history. The member then automatically follows the gym's **common** diet or workout plan.

### No date limits
Any date is accepted for:
- the attendance calendar and adding visits (any month, past or future)
- plan start dates in Change plan
- supplement dates
- dates of birth (the date only has to be a real date)

## 29. Deleting a payment entered by mistake
Only the **Gym Owner** and **Super Admin** can do this.

1. Open the member → **Payments**.
2. Each payment row has a 🗑 **delete** button. Press it on the wrong entry, e.g. the second of two identical ₹2,500 payments.
3. Choose a reason (*Same amount entered twice*, *Wrong member*, *Wrong amount*, *Entered by mistake*) or type your own. **A reason is required.**
4. Press **Delete payment**.

What happens:
- The entry shows as **Cancelled** with its reason, and is left out of **Total billed**, **Total paid** and **Remaining**.
- Its receipts are marked **void** with the reason, and the receipt page shows "VOID RECEIPT".
- **Kept for the accounts:** the entry is not erased, so invoice numbers stay in order. It records who deleted it, when, and why. The member also sees "Cancelled · Reason: …".

## 30. AI trainer "Coach RV" (English, हिंदी, मराठी)
The assistant in the member chat (**AI Trainer** tab) acts only as an RV Fitness gym trainer:
- **Topics:** workouts with sets × reps, diet, water, sleep, recovery and motivation.
- **Everything else:** it politely says it can only help with training.
- **Safety:** it is not a doctor. It won't diagnose or change medicines, and for emergencies it tells people to call 108 / 112.

**Languages:** members tap **English**, **हिंदी** or **मराठी** at the top of the chat. The greeting, suggestions and replies switch to that language, and the choice is remembered. If a member writes in another of the three languages, or in Hinglish, Coach RV answers in the same style.

### Switch it on (one time)
The AI only answers once a key is set on the **API** project in Vercel → Settings → Environment Variables:

| Name | Value (Groq, free tier) |
|---|---|
| `XAI_API_KEY` | your Groq key from console.groq.com/keys (starts with `gsk_`) |
| `XAI_BASE_URL` | `https://api.groq.com/openai/v1` |
| `XAI_MODEL` | `llama-3.3-70b-versatile` (handles Hindi and Marathi) |

Then **Redeploy** the API project.

Using a Grok key from console.x.ai (starts with `xai-`) instead? Set only `XAI_API_KEY`.

Until a key is set, the chat says "The health assistant is not set up yet".

## 31. Plan expiry, reminders, progress by staff, height in feet, Samsung scanning
### When a plan ends: admission again
The day after a member's last plan day, if they have no plan covering today or later:
- their ID goes back for approval
- the next time they open the portal they see the **admission form**, like a first registration, with "Your membership ended on …"
- they check their details and press **Submit for Approval**
- the owner approves them in **Admin → Approvals**, and they can then renew

The member and the owner both get a notification.

The check runs whenever a member opens the portal, and once per visit when staff open the admin panel. If your Supabase project has **pg_cron** turned on (Database → Extensions), it also runs every night at 00:05.

### Recharge-style reminders
With **5 days or fewer** left on a plan:
- a notification goes out once a day ("Your plan ends in 3 days")
- the portal shows a yellow **Renew now** banner

### Body progress by trainer, owner and Super Admin
On a member's page → **Progress**, staff see the same **Body Composition Audit / Progress Tracker** as the member. They can **Log Progress & Photos** for the member, and the entries appear on the member's Body Metrics page.

### Height in feet
In profile and registration forms, tap **feet** next to Height and type feet and inches (e.g. 5 ft 7 in). It is saved as centimetres (170.2 cm).

### Medicines & health
This section is hidden on the member's own profile. Staff still see and edit it on the member's page → **Profile**.

### Scanning on Samsung phones
The scanner now:
- picks the phone's main back camera
- uses Android's built-in QR reader
- keeps the picture sharp with continuous focus

If a QR still isn't read, choose another lens from the **Camera** list under the picture, or use **Scan from photo**. Ask the member to turn their screen brightness up. The member's QR is now larger, with a white border.

### AI trainer says "Could not reach the health assistant"
The API only accepts the website address set in **`ALLOWED_ORIGIN`**. In Vercel → the **API** project → Settings → Environment Variables, set:

`ALLOWED_ORIGIN` = `https://rv-fitness-five.vercel.app` (your website address, no slash at the end)

Then redeploy the API project. The same setting fixes the website's contact and visit-booking forms.

