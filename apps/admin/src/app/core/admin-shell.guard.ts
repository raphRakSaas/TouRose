import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from './auth-session.service';

/**
 * UX-only shell guard. Real authorization is enforced by Supabase RLS (`is_admin()`).
 */
export const adminShellGuard: CanActivateFn = async () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  await authSession.initialize();

  if (authSession.hasAuthenticatedSession()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
