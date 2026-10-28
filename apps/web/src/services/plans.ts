// Subscription plans the Gym Owner manages (supabase/migrations/16_...sql).
import { supabase } from '../lib/supabase';
import { friendlyError } from './portal';
import type { MembershipPlan } from '../config/site';

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

export interface SubscriptionPlan {
  code: string;
  title: string;
  months: number;
  price: number;
  description: string | null;
  features: string[];
  badge: string | null;
  highlight: boolean;
  sort: number;
  active: boolean;
}

/** Website / portal shape (same as the built-in plans). */
export const toSitePlan = (p: SubscriptionPlan): MembershipPlan => ({
  id: p.code,
  title: p.title,
  months: p.months,
  price: Number(p.price),
  description: p.description ?? '',
  features: Array.isArray(p.features) ? p.features : [],
  badge: p.badge ?? '',
  highlight: p.highlight,
});

/** Active plans for the website (everyone). The owner can ask for removed ones too. */
export async function listSubscriptionPlans(includeRemoved = false): Promise<SubscriptionPlan[]> {
  let q = supabase.from('subscription_plans').select('*');
  if (!includeRemoved) q = q.eq('active', true);
  const rows = (unwrap(await q.order('sort', { ascending: true })) ?? []) as SubscriptionPlan[];
  return [...rows].sort((a, b) => a.sort - b.sort || a.months - b.months);
}

/** "Three Months" -> "three-months" (plan codes are simple and never change). */
export const planCode = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'plan';

export type PlanInput = Omit<SubscriptionPlan, 'code' | 'active'>;

function check(p: PlanInput) {
  if (!p.title.trim()) throw new Error('Give the plan a name.');
  if (!Number.isInteger(p.months) || p.months < 1 || p.months > 60) throw new Error('Months must be between 1 and 60.');
  if (!(p.price >= 0)) throw new Error('Enter the price.');
}

export async function createSubscriptionPlan(p: PlanInput, authorId: string, existingCodes: string[]): Promise<string> {
  check(p);
  let code = planCode(p.title);
  for (let n = 2; existingCodes.includes(code); n++) code = `${planCode(p.title).slice(0, 36)}-${n}`;
  unwrap(
    await supabase
      .from('subscription_plans')
      .insert({ ...p, title: p.title.trim(), code, active: true, updated_by: authorId })
      .select('code'),
  );
  return code;
}

export async function updateSubscriptionPlan(code: string, p: PlanInput, authorId: string): Promise<void> {
  check(p);
  const rows = unwrap(
    await supabase
      .from('subscription_plans')
      .update({ ...p, title: p.title.trim(), updated_by: authorId, updated_at: new Date().toISOString() })
      .eq('code', code)
      .select('code'),
  ) as { code: string }[] | null;
  if (!rows || rows.length === 0) throw new Error('Only the gym owner can change plans.');
}

/** Remove (hide from website and requests) or restore a plan. Members on it keep their membership. */
export async function setSubscriptionPlanActive(code: string, active: boolean, authorId: string): Promise<void> {
  const rows = unwrap(
    await supabase.from('subscription_plans').update({ active, updated_by: authorId, updated_at: new Date().toISOString() }).eq('code', code).select('code'),
  ) as { code: string }[] | null;
  if (!rows || rows.length === 0) throw new Error('Only the gym owner can change plans.');
}
