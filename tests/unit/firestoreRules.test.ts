import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

describe('firestore security rules', () => {
  it('keeps all app data under the signed-in user document tree', () => {
    expect(rules).toContain('match /users/{userId}');
    expect(rules).toContain('match /{document=**}');
  });

  it('requires authentication and matching uid for owner access', () => {
    expect(rules).toContain('request.auth != null');
    expect(rules).toContain('request.auth.uid == userId');
    expect(rules).toContain('allow read, write: if isOwner(userId)');
  });

  it('does not expose broad public access', () => {
    expect(rules).not.toMatch(/allow\s+(read|write|read,\s*write):\s*if\s+true/);
    expect(rules).not.toMatch(/allow\s+(read|write|read,\s*write):\s*if\s+request\.auth\s*==\s*null/);
  });
});
