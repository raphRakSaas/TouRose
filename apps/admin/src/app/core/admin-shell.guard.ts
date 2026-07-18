import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from './auth-session.service';

/**
 * UX-only shell guard. Real authorization is enforced by Supabase RLS and server roles.
 */
export const adminShellGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (authSession.hasLocalDemoSession()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
