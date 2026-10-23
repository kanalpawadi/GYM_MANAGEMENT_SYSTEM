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

> **If you already set the database up with `supabase/schema_complete.sql`**, you only need to run `06` to `11`.
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
- Plan **prices** are fixed in code (`apps/web/src/config/site.ts` and `apps/api/lib/plans.ts`) because the payment server charges them.

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

