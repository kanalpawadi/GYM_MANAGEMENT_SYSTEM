// Website content stored in Supabase (`site_content` table + `site-media` bucket).
// Anyone can read; only content editors can write (enforced by RLS).
import { supabase } from '../lib/supabase';
import type { SectionKey } from '../content/sections';
import { friendlyError } from './portal';

export const MEDIA_BUCKET = 'site-media';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function fetchSavedContent(): Promise<Partial<Record<SectionKey, Record<string, unknown>>>> {
  const { data, error } = await supabase.from('site_content').select('key, value');
  if (error) throw new Error(friendlyError(error.message));
  return Object.fromEntries((data ?? []).map((row: { key: string; value: Record<string, unknown> }) => [row.key, row.value]));
}

export async function saveSection(key: SectionKey, value: unknown, editorId?: string): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .upsert({ key, value, updated_by: editorId ?? null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(friendlyError(error.message));
}

/** Removes saved edits so the section shows the built-in content again. */
export async function resetSection(key: SectionKey): Promise<void> {
  const { error } = await supabase.from('site_content').delete().eq('key', key);
  if (error) throw new Error(friendlyError(error.message));
}

export async function uploadSiteImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB. Please choose a smaller one.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const { error } = await bucket.upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw new Error(friendlyError(error.message));
  return bucket.getPublicUrl(path).data.publicUrl;
}
