// Supplement log (supabase/migrations/12_supplements.sql).
import { supabase } from '../lib/supabase';
import { friendlyError } from './portal';

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

export const TIMES_OF_DAY = [
  { value: 'morning', label: 'Morning' },
  { value: 'pre-workout', label: 'Pre-workout' },
  { value: 'post-workout', label: 'Post-workout' },
  { value: 'with-meal', label: 'With a meal' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'bedtime', label: 'Bedtime' },
] as const;

export type TimeOfDay = (typeof TIMES_OF_DAY)[number]['value'];

export interface SupplementEntry {
  id: string;
  member_id: string;
  taken_on: string;
  supplement: string;
  brand: string | null;
  dose: string | null;
  time_of_day: TimeOfDay | null;
  quantity: string | null;
  price: number | null;
  shop: string | null;
  bill_no: string | null;
  notes: string | null;
  created_at: string;
}

export type SupplementInput = Omit<SupplementEntry, 'id' | 'member_id' | 'created_at'>;

export const timeLabel = (t: string | null) => TIMES_OF_DAY.find((x) => x.value === t)?.label ?? '';

export async function listSupplements(memberId: string): Promise<SupplementEntry[]> {
  return (unwrap(
    await supabase.from('supplement_logs').select('*').eq('member_id', memberId).order('taken_on', { ascending: false }).limit(500),
  ) ?? []) as SupplementEntry[];
}

export async function addSupplement(memberId: string, authorId: string, input: SupplementInput): Promise<void> {
  if (!input.supplement.trim()) throw new Error('Please enter the supplement name.');
  if (input.price != null && (Number.isNaN(input.price) || input.price < 0)) throw new Error('Please check the price.');
  unwrap(
    await supabase
      .from('supplement_logs')
      .insert({ ...input, supplement: input.supplement.trim(), member_id: memberId, created_by: authorId })
      .select('id'),
  );
}

export async function deleteSupplement(id: string): Promise<void> {
  const rows = unwrap(await supabase.from('supplement_logs').delete().eq('id', id).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new Error("You can't delete this entry.");
}

/** Total of the prices entered (purchases only). */
export const totalSpent = (rows: Pick<SupplementEntry, 'price'>[]) => rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
