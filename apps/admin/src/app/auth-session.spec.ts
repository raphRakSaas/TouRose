import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AuthSessionService } from './core/auth-session.service';

describe('AuthSessionService', () => {
  it('tracks a local demo session', () => {
    TestBed.configureTestingModule({});
    const authSession = TestBed.inject(AuthSessionService);
    authSession.clearLocalDemoSession();
    expect(authSession.hasLocalDemoSession()).toBe(false);
    authSession.markLocalDemoSession('admin@tourose.local');
    expect(authSession.hasLocalDemoSession()).toBe(true);
  });
});
