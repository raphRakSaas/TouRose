import { Component, inject, signal } from '@angular/core';

import { SupabaseClientService } from '../core/supabase-client.service';

@Component({
  selector: 'app-dashboard-page',
  template: `
    <section class="mt-6 grid gap-4">
      <h1 class="text-3xl font-semibold">Tableau de bord</h1>
      <p class="max-w-2xl text-[var(--tourose-color-ink-700)]">
        Écran placeholder Phase 0. Les imports, modération et fraîcheur arriveront ensuite.
      </p>
      <dl class="grid gap-2 rounded-xl bg-white/70 p-4 text-sm">
        <div class="flex justify-between gap-4">
          <dt>Client Supabase</dt>
          <dd>{{ supabaseConfigured() ? 'configuré (anon)' : 'variables manquantes' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt>URL</dt>
          <dd class="truncate">{{ supabaseUrl() }}</dd>
        </div>
      </dl>
    </section>
  `,
})
export class DashboardPage {
  private readonly supabaseClient = inject(SupabaseClientService);

  readonly supabaseConfigured = signal(this.supabaseClient.isConfigured);
  readonly supabaseUrl = signal(this.supabaseClient.supabaseUrl);
}
