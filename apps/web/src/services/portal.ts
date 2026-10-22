// Portal data that lives in Supabase (protected by row level security).
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';

export interface DietMeal {
  time: string;
  name: string;
  items: string;
}

export interface WorkoutDay {
  day: string;
  exercises: string;
}

export interface DietPlan {
  id: string;
  member_id: string;
  title: string;
  meals: DietMeal[];
  notes?: string | null;
  trainer_name?: string | null;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  member_id: string;
  title: string;
  schedule: WorkoutDay[];
  notes?: string | null;
  trainer_name?: string | null;
  created_at: string;
}

const PROFILE_COLUMNS = 'id, full_name, email, phone, role, avatar_url, assigned_trainer_id, membership_tier, member_code, created_at';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/** Turns low-level Supabase/network errors into something a gym owner can act on. */
export function friendlyError(message: string): string {
  if (/invalid input syntax for type uuid/i.test(message)) {
    return 'Invalid ID format.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Cannot reach the database right now. Check your internet connection and try again.';
  }
  if (/profiles_phone_key/i.test(message)) return 'This mobile number is already used by another account.';
  if (/schema cache|does not exist|could not find the function/i.test(message)) {
    return 'This feature needs the latest database update. Please run the newest file in supabase/migrations (see docs/ADMIN-SETUP.md).';
  }
  return message;
}

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) {
    if (/invalid input syntax for type uuid/i.test(error.message)) {
      return null as T;
    }
    throw new Error(friendlyError(error.message));
  }
  return data;
}

// ---- Users & roles ---------------------------------------------------------

export async function listUsers(): Promise<UserProfile[]> {
  return unwrap(await supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at', { ascending: false })) ?? [];
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  unwrap(await supabase.from('profiles').update({ role }).eq('id', userId));
}

export async function assignTrainer(memberId: string, trainerId: string | null): Promise<void> {
  unwrap(await supabase.from('profiles').update({ assigned_trainer_id: trainerId }).eq('id', memberId));
}

/** All members (role chain: trainers and above can see every member). */
export async function listTrainees(_viewer?: UserProfile): Promise<UserProfile[]> {
  return unwrap(await supabase.from('profiles').select(PROFILE_COLUMNS).eq('role', 'member').order('full_name', { ascending: true })) ?? [];
}

// ---- Diet & workout plans --------------------------------------------------

async function latestActive<T>(tableName: 'diet_plans' | 'workout_plans', memberId: string | null): Promise<T | null> {
  let q = supabase.from(tableName).select('*').eq('is_active', true);
  q = memberId ? q.eq('member_id', memberId) : q.eq('is_common', true);
  const rows = unwrap(await q.order('created_at', { ascending: false }).limit(1)) as T[] | null;
  return rows?.[0] ?? null;
}

/**
 * The plans a member should follow: their personal plan from a trainer if they have
 * one (premium members), otherwise the gym's common plan (normal members).
 */
export async function getActivePlans(memberId: string) {
  const [diet, workout, commonDiet, commonWorkout] = await Promise.all([
    latestActive<DietPlan>('diet_plans', memberId),
    latestActive<WorkoutPlan>('workout_plans', memberId),
    latestActive<DietPlan>('diet_plans', null),
    latestActive<WorkoutPlan>('workout_plans', null),
  ]);
  return {
    diet: diet ?? commonDiet,
    workout: workout ?? commonWorkout,
    dietIsCommon: !diet && !!commonDiet,
    workoutIsCommon: !workout && !!commonWorkout,
  };
}

/** Only the member's own personal plans (for the trainer's editor). */
export async function getPersonalPlans(memberId: string) {
  const [diet, workout] = await Promise.all([
    latestActive<DietPlan>('diet_plans', memberId),
    latestActive<WorkoutPlan>('workout_plans', memberId),
  ]);
  return { diet, workout };
}

export async function getCommonPlans() {
  const [diet, workout] = await Promise.all([
    latestActive<DietPlan>('diet_plans', null),
    latestActive<WorkoutPlan>('workout_plans', null),
  ]);
  return { diet, workout };
}

async function replaceCommonPlan(tableName: 'diet_plans' | 'workout_plans', row: Record<string, unknown>) {
  const saved = unwrap(
    await supabase.from(tableName).insert({ ...row, member_id: null, is_common: true, is_active: true }).select().single(),
  ) as { id: string };
  unwrap(await supabase.from(tableName).update({ is_active: false }).eq('is_common', true).eq('is_active', true).neq('id', saved.id));
  return saved;
}

export async function saveCommonDietPlan(plan: { title: string; meals: DietMeal[]; notes?: string }, author: UserProfile) {
  return replaceCommonPlan('diet_plans', { title: plan.title, meals: plan.meals, notes: plan.notes || null, created_by: author.id, trainer_name: author.full_name });
}

export async function saveCommonWorkoutPlan(plan: { title: string; schedule: WorkoutDay[]; notes?: string }, author: UserProfile) {
  return replaceCommonPlan('workout_plans', { title: plan.title, schedule: plan.schedule, notes: plan.notes || null, created_by: author.id, trainer_name: author.full_name });
}

async function replaceActivePlan(tableName: 'diet_plans' | 'workout_plans', memberId: string, row: Record<string, unknown>) {
  // Insert first so a failed save never leaves the member without a plan.
  // Older plans are deactivated rather than deleted, to keep history.
  const saved = unwrap(
    await supabase.from(tableName).insert({ ...row, member_id: memberId, is_active: true }).select().single(),
  ) as { id: string };
  unwrap(
    await supabase.from(tableName).update({ is_active: false }).eq('member_id', memberId).eq('is_active', true).neq('id', saved.id),
  );
  return saved;
}

export async function saveDietPlan(
  memberId: string,
  plan: { title: string; meals: DietMeal[]; notes?: string },
  author: UserProfile,
): Promise<DietPlan> {
  return replaceActivePlan('diet_plans', memberId, {
    title: plan.title,
    meals: plan.meals,
    notes: plan.notes || null,
    created_by: author.id,
    trainer_name: author.full_name,
  }) as Promise<DietPlan>;
}

export async function saveWorkoutPlan(
  memberId: string,
  plan: { title: string; schedule: WorkoutDay[]; notes?: string },
  author: UserProfile,
): Promise<WorkoutPlan> {
  return replaceActivePlan('workout_plans', memberId, {
    title: plan.title,
    schedule: plan.schedule,
    notes: plan.notes || null,
    created_by: author.id,
    trainer_name: author.full_name,
  }) as Promise<WorkoutPlan>;
}

// ---- Profile & photos --------------------------------------------------------

export const AVATAR_BUCKET = 'avatars';
export const PROGRESS_BUCKET = 'progress-photos';

export function validateImage(file: File, maxMb: number) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP photo.');
  }
  if (file.size > maxMb * 1024 * 1024) throw new Error(`Photo is larger than ${maxMb} MB. Please choose a smaller one.`);
}

const fileName = (file: File) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
};

export type ProfileUpdate = Partial<Pick<UserProfile, 'full_name' | 'phone' | 'emergency_contact' | 'health_notes' | 'avatar_url'>>;

export async function updateMyProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  unwrap(await supabase.from('profiles').update(patch).eq('id', userId));
}

/** Uploads a new profile photo and saves its link on the profile. Returns the public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validateImage(file, 3);
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const path = `${userId}/${fileName(file)}`;
  const { error } = await bucket.upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw new Error(friendlyError(error.message));
  const url = bucket.getPublicUrl(path).data.publicUrl;
  await updateMyProfile(userId, { avatar_url: url });
  return url;
}

export interface TrainerContact {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
}

/** The signed-in member's assigned trainer, or null. */
export async function getMyTrainer(): Promise<TrainerContact | null> {
  const rows = unwrap(await supabase.rpc('get_my_trainer')) as TrainerContact[] | null;
  return rows?.[0] ?? null;
}

// ---- Body progress -----------------------------------------------------------

export interface ProgressEntry {
  id: string;
  member_id: string;
  date: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  bicep_cm?: number | null;
  notes?: string | null;
  /** Storage paths inside the private progress-photos bucket (not public URLs). */
  front_photo_url?: string | null;
  side_photo_url?: string | null;
  created_at?: string;
}

export type NewProgressEntry = Pick<ProgressEntry, 'date' | 'weight_kg' | 'body_fat_pct' | 'chest_cm' | 'waist_cm' | 'bicep_cm' | 'notes'>;

export async function listProgress(memberId: string): Promise<ProgressEntry[]> {
  return unwrap(await supabase.from('progress_logs').select('*').eq('member_id', memberId).order('date', { ascending: false })) ?? [];
}

async function uploadProgressPhoto(memberId: string, file: File): Promise<string> {
  validateImage(file, 5);
  const path = `${memberId}/${fileName(file)}`;
  const { error } = await supabase.storage.from(PROGRESS_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(friendlyError(error.message));
  return path;
}

export async function addProgress(
  memberId: string,
  entry: NewProgressEntry,
  photos: { front?: File | null; side?: File | null } = {},
): Promise<ProgressEntry> {
  // Validate both photos before uploading either.
  if (photos.front) validateImage(photos.front, 5);
  if (photos.side) validateImage(photos.side, 5);
  const front = photos.front ? await uploadProgressPhoto(memberId, photos.front) : null;
  const side = photos.side ? await uploadProgressPhoto(memberId, photos.side) : null;
  return unwrap(
    await supabase
      .from('progress_logs')
      .insert({ ...entry, member_id: memberId, front_photo_url: front, side_photo_url: side })
      .select()
      .single(),
  ) as ProgressEntry;
}

export async function deleteProgress(entry: ProgressEntry): Promise<void> {
  unwrap(await supabase.from('progress_logs').delete().eq('id', entry.id));
  const paths = [entry.front_photo_url, entry.side_photo_url].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(PROGRESS_BUCKET).remove(paths);
}

/** Short-lived links for private progress photos, keyed by storage path. */
export async function signProgressPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(PROGRESS_BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) throw new Error(friendlyError(error.message));
  return Object.fromEntries((data ?? []).filter((d: any) => d.signedUrl).map((d: any) => [d.path, d.signedUrl]));
}
