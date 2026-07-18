import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogAdminService, type AdminPlaceRow } from '../core/catalog-admin.service';

@Component({
  selector: 'app-places-list-page',
  imports: [RouterLink],
  template: `
    <section class="mt-6 grid gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-3xl font-semibold">Lieux</h1>
        <a
          routerLink="/places/new"
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white no-underline"
        >
          Nouveau lieu
        </a>
      </div>
      @if (errorMessage()) {
        <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
      }
      <div class="overflow-x-auto rounded-xl bg-white/70">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-black/10">
              <th class="px-4 py-3">Nom</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Statut</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (placeRow of places(); track placeRow.id) {
              <tr class="border-b border-black/5">
                <td class="px-4 py-3">
                  <div class="font-medium">{{ placeRow.name }}</div>
                  <div class="text-xs text-[var(--tourose-color-ink-700)]">{{ placeRow.slug }}</div>
                </td>
                <td class="px-4 py-3">{{ placeRow.place_type }}</td>
                <td class="px-4 py-3">{{ placeRow.status }}</td>
                <td class="px-4 py-3 text-right">
                  <a
                    [routerLink]="['/places', placeRow.id]"
                    class="mr-3 text-[var(--tourose-color-garonne-500)]"
                    >Éditer</a
                  >
                  @if (placeRow.status !== 'archived') {
                    <button
                      type="button"
                      class="text-[var(--tourose-color-danger)]"
                      (click)="onArchive(placeRow)"
                    >
                      Archiver
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class PlacesListPage {
  private readonly catalogAdmin = inject(CatalogAdminService);
  readonly places = signal<AdminPlaceRow[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async onArchive(placeRow: AdminPlaceRow): Promise<void> {
    try {
      await this.catalogAdmin.archivePlace(placeRow);
      await this.load();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Archivage impossible');
    }
  }

  private async load(): Promise<void> {
    try {
      this.places.set(await this.catalogAdmin.listPlaces());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur de chargement');
    }
  }
}
