import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CatalogAdminService, type AdminCategoryRow } from '../core/catalog-admin.service';

@Component({
  selector: 'app-categories-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mt-6 grid gap-4">
      <h1 class="text-3xl font-semibold">Catégories</h1>
      <form class="grid max-w-xl gap-3 rounded-xl bg-white/70 p-4" [formGroup]="categoryForm" (ngSubmit)="onSubmit()">
        <label class="grid gap-1 text-sm"
          >Nom <input class="rounded-md border border-black/10 px-3 py-2" formControlName="name"
        /></label>
        <label class="grid gap-1 text-sm"
          >Slug <input class="rounded-md border border-black/10 px-3 py-2" formControlName="slug"
        /></label>
        <label class="flex items-center gap-2 text-sm"
          ><input type="checkbox" formControlName="is_active" /> Active</label
        >
        @if (errorMessage()) {
          <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
        }
        <button class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white" type="submit">
          Ajouter
        </button>
      </form>
      <ul class="grid gap-2">
        @for (categoryRow of categories(); track categoryRow.id) {
          <li class="rounded-lg bg-white/70 px-4 py-3 text-sm">
            <strong>{{ categoryRow.name }}</strong> · {{ categoryRow.slug }} ·
            {{ categoryRow.is_active ? 'active' : 'inactive' }}
          </li>
        }
      </ul>
    </section>
  `,
})
export class CategoriesPage {
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly formBuilder = inject(FormBuilder);
  readonly categories = signal<AdminCategoryRow[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    is_active: [true],
  });

  constructor() {
    void this.reload();
    this.categoryForm.controls.name.valueChanges.subscribe((name) => {
      if (name) {
        this.categoryForm.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    const raw = this.categoryForm.getRawValue();
    try {
      await this.catalogAdmin.saveCategory(raw);
      this.categoryForm.reset({ name: '', slug: '', is_active: true });
      await this.reload();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Erreur');
    }
  }

  private async reload(): Promise<void> {
    this.categories.set(await this.catalogAdmin.listCategories());
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
