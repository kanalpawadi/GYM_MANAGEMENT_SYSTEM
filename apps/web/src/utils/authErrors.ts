/**
 * After Google sign-in, Supabase sends errors back to /login in the query string
 * or the URL hash (?error=...&error_description=...). Turns them into guidance
 * people can act on. Returns null when there is no error in the URL.
 */
export function oauthErrorFromUrl(search: string, hash: string): string | null {
  const params = new URLSearchParams(search);
  const fromHash = new URLSearchParams(hash.replace(/^#/, ''));
  const code = params.get('error') ?? fromHash.get('error');
  const description = params.get('error_description') ?? fromHash.get('error_description') ?? '';
  if (!code && !description) return null;
  return friendlyOAuthError(code ?? '', description);
}

export function friendlyOAuthError(code: string, description: string): string {
  const text = `${code} ${description}`.toLowerCase();
  if (text.includes('database error saving new user') || text.includes('database error')) {
    return 'Google sign-in worked, but your gym profile could not be created. The gym needs to run the latest database update (migration 08). Please try again later or use email and password.';
  }
  if (text.includes('unable to exchange external code') || text.includes('invalid_client') || text.includes('unauthorized_client')) {
    return 'Google sign-in is not set up correctly (the Google Client ID or Secret in Supabase is wrong). Please use email and password for now.';
  }
  if (text.includes('access_denied') || text.includes('cancel')) {
    return 'Google sign-in was cancelled. If you did not cancel, your Google account may not be allowed yet. Please use email and password or contact the gym.';
  }
  if (text.includes('provider is not enabled')) {
    return 'Google sign-in is not set up yet. Please use email and password.';
  }
  if (text.includes('redirect') || text.includes('flow state')) {
    return 'Google sign-in took too long or was opened in a different browser. Please tap "Continue with Google" again.';
  }
  if (text.includes('email') && text.includes('already')) {
    return 'An account with this email already exists. Please sign in with your email and password.';
  }
  return `Google sign-in failed: ${description || code}. Please try again or use email and password.`;
}
