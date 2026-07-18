import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogAdminService, type AdminEventRow } from '../core/catalog-admin.service';

@Component({
  selector: 'app-events-list-page',
  imports: [RouterLink],
  template: `
    <section class="mt-6 grid gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-3xl font-semibold">Événements</h1>
        <a
          routerLink="/events/new"
          class="rounded-md bg-[var(--tourose-color-garonne-500)] px-4 py-2 text-white no-underline"
        >
          Nouvel événement
        </a>
      </div>
      @if (errorMessage()) {
        <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
      }
      <div class="overflow-x-auto rounded-xl bg-white/70">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-black/10">
              <th class="px-4 py-3">Titre</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (eventRow of events(); track eventRow.id) {
              <tr class="border-b border-black/5">
                <td class="px-4 py-3">
                  <div class="font-medium">{{ eventRow.title }}</div>
                  <div class="text-xs text-[var(--tourose-color-ink-700)]">{{ eventRow.slug }}</div>
                </td>
                <td class="px-4 py-3">{{ eventRow.status }}</td>
                <td class="px-4 py-3 text-right">
                  <a
                    [routerLink]="['/events', eventRow.id]"
                    class="text-[var(--tourose-color-garonne-500)]"
                    >Éditer</a
                  >
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class EventsListPage {
  private readonly catalogAdmin = inject(CatalogAdminService);
  readonly events = signal<AdminEventRow[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.events.set(await this.catalogAdmin.listEvents());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur de chargement');
    }
  }
}
