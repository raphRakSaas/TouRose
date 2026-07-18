import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { CatalogAdminService, type AdminAuditRow } from '../core/catalog-admin.service';

@Component({
  selector: 'app-audit-page',
  imports: [DatePipe],
  template: `
    <section class="mt-6 grid gap-4">
      <h1 class="text-3xl font-semibold">Journal d’audit</h1>
      <p class="text-sm text-[var(--tourose-color-ink-700)]">
        Créations, publications et archivages enregistrés côté serveur.
      </p>
      @if (errorMessage()) {
        <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
      }
      <div class="overflow-x-auto rounded-xl bg-white/70">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-black/10">
              <th class="px-4 py-3">Quand</th>
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Entité</th>
            </tr>
          </thead>
          <tbody>
            @for (logRow of logs(); track logRow.id) {
              <tr class="border-b border-black/5">
                <td class="px-4 py-3">{{ logRow.created_at | date: 'short' }}</td>
                <td class="px-4 py-3">{{ logRow.action }}</td>
                <td class="px-4 py-3">{{ logRow.entity_type }} · {{ logRow.entity_id }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AuditPage {
  private readonly catalogAdmin = inject(CatalogAdminService);
  readonly logs = signal<AdminAuditRow[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.catalogAdmin
      .listAuditLogs()
      .then((rows) => this.logs.set(rows))
      .catch((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'Erreur');
      });
  }
}
