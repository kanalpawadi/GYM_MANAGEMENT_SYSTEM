import { describe, expect, it } from 'vitest';
import { friendlyOAuthError, oauthErrorFromUrl } from './authErrors';

describe('oauthErrorFromUrl', () => {
  it('returns null when the URL has no error', () => {
    expect(oauthErrorFromUrl('', '')).toBeNull();
    expect(oauthErrorFromUrl('?next=/portal', '#access_token=abc')).toBeNull();
  });

  it('reads errors from the query string or the hash', () => {
    expect(oauthErrorFromUrl('?error=access_denied', '')).toMatch(/cancelled/);
    expect(oauthErrorFromUrl('', '#error=server_error&error_description=Unable%20to%20exchange%20external%20code')).toMatch(/Client ID or Secret/);
  });
});

describe('friendlyOAuthError', () => {
  it.each([
    ['server_error', 'Database error saving new user', /migration 08/],
    ['invalid_request', 'bad_oauth_state: OAuth callback with invalid state / flow state not found', /tap "Continue with Google" again/],
    ['validation_failed', 'Unsupported provider: provider is not enabled', /not set up yet/],
    ['weird', 'Something odd', /Google sign-in failed: Something odd/],
  ])('%s / %s', (code, description, expected) => {
    expect(friendlyOAuthError(code, description)).toMatch(expected);
  });
});
