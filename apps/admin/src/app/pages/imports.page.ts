import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ImportAdminService, type ImportErrorRow, type ImportRunRow } from '../core/import-admin.service';

@Component({
  selector: 'app-imports-page',
  imports: [DatePipe],
  template: `
    <section class="mt-6 grid gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-3xl font-semibold">Imports</h1>
          <p class="mt-1 text-sm text-[var(--tourose-color-ink-500)]">
            Fraîcheur OpenAgenda — runs et erreurs (pipeline Phase 2).
          </p>
        </div>
        <button
          type="button"
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white disabled:opacity-50"
          [disabled]="isTriggering()"
          (click)="onTriggerImport()"
        >
          {{ isTriggering() ? 'Import…' : 'Lancer import (local)' }}
        </button>
      </div>

      @if (statusMessage()) {
        <p class="rounded-lg bg-white/70 px-4 py-3 text-sm">{{ statusMessage() }}</p>
      }
      @if (errorMessage()) {
        <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
      }

      <div class="grid gap-2">
        <h2 class="text-xl font-semibold">Derniers runs</h2>
        <ul class="grid gap-2">
          @for (runRow of runs(); track runRow.id) {
            <li>
              <button
                type="button"
                class="w-full rounded-lg bg-white/70 px-4 py-3 text-left text-sm hover:bg-white"
                (click)="onSelectRun(runRow.id)"
              >
                <span class="font-semibold">{{ runRow.status }}</span>
                · {{ runRow.started_at | date: 'short' }}
                · fetch {{ runRow.fetched_count }}
                · +{{ runRow.created_count }} / ~{{ runRow.updated_count }} / skip
                {{ runRow.skipped_count }}
                · err {{ runRow.error_count }}
                <span class="mt-1 block text-xs text-[var(--tourose-color-ink-500)]">
                  {{ runRow.correlation_id }} — {{ runRow.message ?? '' }}
                </span>
              </button>
            </li>
          } @empty {
            <li class="text-sm text-[var(--tourose-color-ink-500)]">Aucun run pour l’instant.</li>
          }
        </ul>
      </div>

      @if (selectedRunId()) {
        <div class="grid gap-2">
          <h2 class="text-xl font-semibold">Erreurs / alertes du run</h2>
          <ul class="grid gap-2">
            @for (errorRow of errors(); track errorRow.id) {
              <li class="rounded-lg bg-white/70 px-4 py-3 text-sm">
                <strong>{{ errorRow.error_code }}</strong>
                @if (errorRow.external_id) {
                  · {{ errorRow.external_id }}
                }
                <span class="mt-1 block">{{ errorRow.message }}</span>
              </li>
            } @empty {
              <li class="text-sm text-[var(--tourose-color-ink-500)]">Aucune erreur sur ce run.</li>
            }
          </ul>
        </div>
      }
    </section>
  `,
})
export class ImportsPage {
  private readonly importAdmin = inject(ImportAdminService);

  readonly runs = signal<ImportRunRow[]>([]);
  readonly errors = signal<ImportErrorRow[]>([]);
  readonly selectedRunId = signal<string | null>(null);
  readonly isTriggering = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  constructor() {
    void this.reloadRuns();
  }

  async onSelectRun(runId: string): Promise<void> {
    this.selectedRunId.set(runId);
    try {
      this.errors.set(await this.importAdmin.listErrorsForRun(runId));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Chargement erreurs impossible');
    }
  }

  async onTriggerImport(): Promise<void> {
    this.isTriggering.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    try {
      const result = await this.importAdmin.triggerOpenAgendaImport();
      this.statusMessage.set(
        `Run ${result.importRunId} — ${result.status} (mode ${result.mode}, fetch ${result.fetchedCount})`,
      );
      await this.reloadRuns();
      if (result.importRunId) {
        await this.onSelectRun(result.importRunId);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Import impossible');
    } finally {
      this.isTriggering.set(false);
    }
  }

  private async reloadRuns(): Promise<void> {
    try {
      this.runs.set(await this.importAdmin.listRuns());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Chargement runs impossible');
    }
  }
}
