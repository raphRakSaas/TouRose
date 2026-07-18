import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { PlaceStatus, PlaceType, PriceType, IndoorOutdoor } from './catalog-form.types';

import { CatalogAdminService, TOULOUSE_TERRITORY_ID } from '../core/catalog-admin.service';

@Component({
  selector: 'app-place-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="mt-6 grid max-w-2xl gap-4">
      <a routerLink="/places" class="text-sm text-[var(--tourose-color-garonne-500)]">← Lieux</a>
      <h1 class="text-3xl font-semibold">{{ isEdit() ? 'Éditer un lieu' : 'Nouveau lieu' }}</h1>
      <form
        class="grid gap-3 rounded-xl bg-white/70 p-4"
        [formGroup]="placeForm"
        (ngSubmit)="onSubmit()"
      >
        <label class="grid gap-1 text-sm">
          Nom
          <input class="rounded-md border border-black/10 px-3 py-2" formControlName="name" />
        </label>
        <label class="grid gap-1 text-sm">
          Slug
          <input class="rounded-md border border-black/10 px-3 py-2" formControlName="slug" />
        </label>
        <label class="grid gap-1 text-sm">
          Résumé
          <textarea
            class="rounded-md border border-black/10 px-3 py-2"
            rows="3"
            formControlName="summary"
          ></textarea>
        </label>
        <label class="grid gap-1 text-sm">
          Type
          <select class="rounded-md border border-black/10 px-3 py-2" formControlName="place_type">
            @for (option of placeTypeOptions; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          Statut
          <select class="rounded-md border border-black/10 px-3 py-2" formControlName="status">
            @for (option of placeStatusOptions; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1 text-sm">
            Latitude
            <input
              type="number"
              step="any"
              class="rounded-md border border-black/10 px-3 py-2"
              formControlName="latitude"
            />
          </label>
          <label class="grid gap-1 text-sm">
            Longitude
            <input
              type="number"
              step="any"
              class="rounded-md border border-black/10 px-3 py-2"
              formControlName="longitude"
            />
          </label>
        </div>
        <label class="grid gap-1 text-sm">
          Ville
          <input class="rounded-md border border-black/10 px-3 py-2" formControlName="city" />
        </label>
        @if (errorMessage()) {
          <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
        }
        @if (successMessage()) {
          <p class="text-sm text-[var(--tourose-color-success)]">{{ successMessage() }}</p>
        }
        <button
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          [disabled]="placeForm.invalid || isSubmitting()"
        >
          {{ isSubmitting() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </form>
    </section>
  `,
})
export class PlaceFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly placeTypeOptions: PlaceType[] = [
    'monument',
    'museum',
    'square',
    'park',
    'walk',
    'viewpoint',
    'activity',
    'cultural_venue',
    'historical_site',
    'permanent_tip',
  ];
  readonly placeStatusOptions: PlaceStatus[] = [
    'draft',
    'published',
    'temporarily_closed',
    'permanently_closed',
    'archived',
    'hidden',
  ];

  private editingId: string | null = null;

  readonly placeForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    summary: [''],
    place_type: ['park' as PlaceType, Validators.required],
    status: ['draft' as PlaceStatus, Validators.required],
    latitude: [43.6045],
    longitude: [1.444],
    city: ['Toulouse'],
    price_type: ['free' as PriceType],
    indoor_outdoor: ['outdoor' as IndoorOutdoor],
  });

  constructor() {
    const placeId = this.route.snapshot.paramMap.get('placeId');
    if (placeId && placeId !== 'new') {
      this.isEdit.set(true);
      this.editingId = placeId;
      void this.loadPlace(placeId);
    }

    this.placeForm.controls.name.valueChanges.subscribe((name) => {
      if (!this.isEdit() && name) {
        this.placeForm.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const raw = this.placeForm.getRawValue();
    try {
      const savedId = await this.catalogAdmin.savePlace({
        id: this.editingId ?? undefined,
        territory_id: TOULOUSE_TERRITORY_ID,
        slug: raw.slug,
        name: raw.name,
        summary: raw.summary || undefined,
        place_type: raw.place_type,
        status: raw.status,
        latitude: raw.latitude,
        longitude: raw.longitude,
        city: raw.city || undefined,
        price_type: raw.price_type,
        indoor_outdoor: raw.indoor_outdoor,
      });
      this.successMessage.set(
        raw.status === 'published'
          ? 'Lieu publié — visible sur mobile et le site.'
          : 'Lieu enregistré.',
      );
      if (!this.editingId) {
        await this.router.navigate(['/places', savedId]);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadPlace(placeId: string): Promise<void> {
    try {
      const placeRow = await this.catalogAdmin.getPlace(placeId);
      if (!placeRow) {
        this.errorMessage.set('Lieu introuvable');
        return;
      }
      this.placeForm.patchValue({
        name: placeRow.name,
        slug: placeRow.slug,
        summary: placeRow.summary ?? '',
        place_type: placeRow.place_type as PlaceType,
        status: placeRow.status as PlaceStatus,
        city: placeRow.city ?? 'Toulouse',
      });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Chargement impossible');
    }
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
