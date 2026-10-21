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
