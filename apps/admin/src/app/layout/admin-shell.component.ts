import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthSessionService } from '../core/auth-session.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen">
      <header class="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <a
          routerLink="/dashboard"
          class="brand text-2xl text-[var(--tourose-color-brick-700)] no-underline"
        >
          TouRose Admin
        </a>
        <nav class="flex flex-wrap items-center gap-4 text-sm">
          <a
            routerLink="/dashboard"
            routerLinkActive="font-semibold"
            class="text-[var(--tourose-color-ink-700)]"
            >Tableau de bord</a
          >
          <a
            routerLink="/places"
            routerLinkActive="font-semibold"
            class="text-[var(--tourose-color-ink-700)]"
            >Lieux</a
          >
          <a
            routerLink="/events"
            routerLinkActive="font-semibold"
            class="text-[var(--tourose-color-ink-700)]"
            >Événements</a
          >
          <button
            type="button"
            class="text-[var(--tourose-color-garonne-500)]"
            (click)="onSignOut()"
          >
            Déconnexion
          </button>
        </nav>
      </header>
      <main class="px-6 pb-10">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShellComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  async onSignOut(): Promise<void> {
    await this.authSession.signOut();
    await this.router.navigateByUrl('/login');
  }
}
