import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CatalogAdminService, type AdminSourceRow } from '../core/catalog-admin.service';

@Component({
  selector: 'app-sources-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mt-6 grid gap-4">
      <h1 class="text-3xl font-semibold">Sources</h1>
      <form class="grid max-w-xl gap-3 rounded-xl bg-white/70 p-4" [formGroup]="sourceForm" (ngSubmit)="onSubmit()">
        <label class="grid gap-1 text-sm"
          >Nom <input class="rounded-md border border-black/10 px-3 py-2" formControlName="name"
        /></label>
        <label class="grid gap-1 text-sm">
          Type
          <select class="rounded-md border border-black/10 px-3 py-2" formControlName="kind">
            <option value="editorial">editorial</option>
            <option value="open_data">open_data</option>
            <option value="api">api</option>
            <option value="other">other</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm"
          >Licence
          <input class="rounded-md border border-black/10 px-3 py-2" formControlName="license_name"
        /></label>
        <label class="flex items-center gap-2 text-sm"
          ><input type="checkbox" formControlName="is_active" /> Active</label
        >
        @if (errorMessage()) {
          <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
        }
        <button class="rounded-md bg-[var(--tourose-color-garonne-500)] px-4 py-2 text-white" type="submit">
          Ajouter
        </button>
      </form>
      <ul class="grid gap-2">
        @for (sourceRow of sources(); track sourceRow.id) {
          <li class="rounded-lg bg-white/70 px-4 py-3 text-sm">
            <strong>{{ sourceRow.name }}</strong> · {{ sourceRow.kind }} ·
            {{ sourceRow.license_name ?? 'sans licence' }}
          </li>
        }
      </ul>
    </section>
  `,
})
export class SourcesPage {
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sources = signal<AdminSourceRow[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly sourceForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    kind: ['editorial', Validators.required],
    license_name: [''],
    is_active: [true],
  });

  constructor() {
    void this.reload();
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    const raw = this.sourceForm.getRawValue();
    try {
      await this.catalogAdmin.saveSource({
        ...raw,
        license_name: raw.license_name || undefined,
      });
      this.sourceForm.reset({ name: '', kind: 'editorial', license_name: '', is_active: true });
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur');
    }
  }

  private async reload(): Promise<void> {
    this.sources.set(await this.catalogAdmin.listSources());
  }
}
