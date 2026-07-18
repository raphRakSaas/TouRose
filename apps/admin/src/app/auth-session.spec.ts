import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AuthSessionService } from './core/auth-session.service';
import { SupabaseClientService } from './core/supabase-client.service';

describe('AuthSessionService', () => {
  it('reports no admin session by default', async () => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService, SupabaseClientService],
    });
    const authSession = TestBed.inject(AuthSessionService);
    await authSession.initialize();
    expect(authSession.hasAuthenticatedSession()).toBe(false);
  });
});
