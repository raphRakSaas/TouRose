import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen">
      <header class="flex items-center justify-between px-6 py-4">
        <a
          routerLink="/dashboard"
          class="brand text-2xl text-[var(--tourose-color-brick-700)] no-underline"
        >
          TouRose Admin
        </a>
        <nav class="flex gap-4 text-sm">
          <a
            routerLink="/dashboard"
            routerLinkActive="font-semibold"
            class="text-[var(--tourose-color-ink-700)]"
          >
            Tableau de bord
          </a>
          <a routerLink="/login" class="text-[var(--tourose-color-garonne-500)]">Connexion</a>
        </nav>
      </header>
      <main class="px-6 pb-10">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShellComponent {}
