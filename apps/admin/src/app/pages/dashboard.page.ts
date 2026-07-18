import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthSessionService } from '../core/auth-session.service';
import { CatalogAdminService } from '../core/catalog-admin.service';
import { SupabaseClientService } from '../core/supabase-client.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <section class="mt-6 grid gap-4">
      <h1 class="text-3xl font-semibold">Tableau de bord</h1>
      <p class="max-w-2xl text-[var(--tourose-color-ink-700)]">
        Phase 1 — publie un lieu ou un événement, puis vérifie-le sur mobile et le site.
      </p>
      <div class="flex flex-wrap gap-3">
        <a
          routerLink="/places"
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white no-underline"
        >
          Gérer les lieux
        </a>
        <a
          routerLink="/events"
          class="rounded-md bg-[var(--tourose-color-garonne-500)] px-4 py-2 text-white no-underline"
        >
          Gérer les événements
        </a>
      </div>
      <dl class="grid gap-2 rounded-xl bg-white/70 p-4 text-sm">
        <div class="flex justify-between gap-4">
          <dt>Client Supabase</dt>
          <dd>{{ supabaseConfigured() ? 'configuré (anon)' : 'variables manquantes' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt>Session admin</dt>
          <dd>{{ authSession.user()?.email ?? '—' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt>Lieux (tous statuts)</dt>
          <dd>{{ placeCount() ?? '…' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt>Événements (tous statuts)</dt>
          <dd>{{ eventCount() ?? '…' }}</dd>
        </div>
      </dl>
      @if (loadError()) {
        <p class="text-sm text-[var(--tourose-color-danger)]">{{ loadError() }}</p>
      }
    </section>
  `,
})
export class DashboardPage {
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly catalogAdmin = inject(CatalogAdminService);
  readonly authSession = inject(AuthSessionService);

  readonly supabaseConfigured = signal(this.supabaseClient.isConfigured);
  readonly placeCount = signal<number | null>(null);
  readonly eventCount = signal<number | null>(null);
  readonly loadError = signal<string | null>(null);

  constructor() {
    void this.loadCounts();
  }

  private async loadCounts(): Promise<void> {
    try {
      const [places, events] = await Promise.all([
        this.catalogAdmin.listPlaces(),
        this.catalogAdmin.listEvents(),
      ]);
      this.placeCount.set(places.length);
      this.eventCount.set(events.length);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Chargement impossible');
    }
  }
}
