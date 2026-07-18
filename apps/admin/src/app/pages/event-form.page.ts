import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CatalogAdminService,
  TOULOUSE_TERRITORY_ID,
  type AdminOccurrenceRow,
  type AdminPlaceRow,
} from '../core/catalog-admin.service';
import type { EventStatus, IndoorOutdoor, PriceType } from './catalog-form.types';

@Component({
  selector: 'app-event-form-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <section class="mt-6 grid max-w-2xl gap-4">
      <a routerLink="/events" class="text-sm text-[var(--tourose-color-garonne-500)]"
        >← Événements</a
      >
      <h1 class="text-3xl font-semibold">
        {{ isEdit() ? 'Éditer un événement' : 'Nouvel événement' }}
      </h1>
      <form
        class="grid gap-3 rounded-xl bg-white/70 p-4"
        [formGroup]="eventForm"
        (ngSubmit)="onSubmit()"
      >
        <label class="grid gap-1 text-sm">
          Titre
          <input class="rounded-md border border-black/10 px-3 py-2" formControlName="title" />
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
          Lieu associé
          <select class="rounded-md border border-black/10 px-3 py-2" formControlName="place_id">
            <option value="">Aucun</option>
            @for (placeRow of places(); track placeRow.id) {
              <option [value]="placeRow.id">{{ placeRow.name }}</option>
            }
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          Statut
          <select class="rounded-md border border-black/10 px-3 py-2" formControlName="status">
            @for (option of eventStatusOptions; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="grid gap-1 text-sm">
            Début
            <input
              type="datetime-local"
              class="rounded-md border border-black/10 px-3 py-2"
              formControlName="starts_at"
            />
          </label>
          <label class="grid gap-1 text-sm">
            Fin
            <input
              type="datetime-local"
              class="rounded-md border border-black/10 px-3 py-2"
              formControlName="ends_at"
            />
          </label>
        </div>
        <label class="grid gap-1 text-sm">
          URL officielle
          <input
            class="rounded-md border border-black/10 px-3 py-2"
            formControlName="official_url"
          />
        </label>
        @if (errorMessage()) {
          <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage() }}</p>
        }
        @if (successMessage()) {
          <p class="text-sm text-[var(--tourose-color-success)]">{{ successMessage() }}</p>
        }
        <button
          class="rounded-md bg-[var(--tourose-color-garonne-500)] px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          [disabled]="eventForm.invalid || isSubmitting()"
        >
          {{ isSubmitting() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
        @if (isEdit() && editingId()) {
          <a
            class="text-center text-sm text-[var(--tourose-color-garonne-500)]"
            [href]="'http://localhost:4321/catalogue/evenements/' + eventForm.controls.slug.value"
            target="_blank"
            rel="noopener"
            >Prévisualiser public</a
          >
        }
      </form>

      @if (isEdit() && editingId()) {
        <section class="grid gap-3 rounded-xl bg-white/70 p-4">
          <h2 class="text-xl font-semibold">Occurrences</h2>
          <ul class="grid gap-2 text-sm">
            @for (occurrenceRow of occurrences(); track occurrenceRow.id) {
              <li>
                {{ occurrenceRow.starts_at | date: 'short' }}
                @if (occurrenceRow.ends_at) {
                  → {{ occurrenceRow.ends_at | date: 'short' }}
                }
                · {{ occurrenceRow.status }}
              </li>
            }
          </ul>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm"
              >Nouvelle date début
              <input
                type="datetime-local"
                class="rounded-md border border-black/10 px-3 py-2"
                [formControl]="extraOccurrenceStart"
            /></label>
            <label class="grid gap-1 text-sm"
              >Fin
              <input
                type="datetime-local"
                class="rounded-md border border-black/10 px-3 py-2"
                [formControl]="extraOccurrenceEnd"
            /></label>
          </div>
          <button
            type="button"
            class="rounded-md border border-black/10 px-4 py-2"
            (click)="onAddOccurrence()"
          >
            Ajouter une occurrence
          </button>
        </section>
      }
    </section>
  `,
})
export class EventFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalogAdmin = inject(CatalogAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly places = signal<AdminPlaceRow[]>([]);
  readonly occurrences = signal<AdminOccurrenceRow[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly extraOccurrenceStart = new FormControl('', { nonNullable: true });
  readonly extraOccurrenceEnd = new FormControl('', { nonNullable: true });

  readonly eventStatusOptions: EventStatus[] = [
    'draft',
    'published',
    'cancelled',
    'postponed',
    'archived',
    'hidden',
  ];

  readonly eventForm = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    slug: ['', Validators.required],
    summary: [''],
    place_id: [''],
    status: ['draft' as EventStatus, Validators.required],
    starts_at: [''],
    ends_at: [''],
    official_url: [''],
    price_type: ['free' as PriceType],
    indoor_outdoor: ['outdoor' as IndoorOutdoor],
  });

  constructor() {
    void this.catalogAdmin.listPlaces().then((placeRows) => this.places.set(placeRows));

    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId && eventId !== 'new') {
      this.isEdit.set(true);
      this.editingId.set(eventId);
      void this.loadEvent(eventId);
      void this.loadOccurrences(eventId);
    }

    this.eventForm.controls.title.valueChanges.subscribe((title) => {
      if (!this.isEdit() && title) {
        this.eventForm.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const raw = this.eventForm.getRawValue();

    try {
      const savedId = await this.catalogAdmin.saveEvent({
        id: this.editingId() ?? undefined,
        territory_id: TOULOUSE_TERRITORY_ID,
        place_id: raw.place_id || null,
        slug: raw.slug,
        title: raw.title,
        summary: raw.summary || undefined,
        status: raw.status,
        starts_at: raw.starts_at ? new Date(raw.starts_at).toISOString() : undefined,
        ends_at: raw.ends_at ? new Date(raw.ends_at).toISOString() : undefined,
        official_url: raw.official_url || undefined,
        price_type: raw.price_type,
        indoor_outdoor: raw.indoor_outdoor,
      });
      this.successMessage.set(
        raw.status === 'published'
          ? 'Événement publié — visible sur mobile et le site.'
          : 'Événement enregistré.',
      );
      if (!this.editingId()) {
        await this.router.navigate(['/events', savedId]);
      } else {
        await this.loadOccurrences(savedId);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onAddOccurrence(): Promise<void> {
    const eventId = this.editingId();
    if (!eventId || !this.extraOccurrenceStart.value) {
      return;
    }
    try {
      await this.catalogAdmin.addOccurrence(
        eventId,
        new Date(this.extraOccurrenceStart.value).toISOString(),
        this.extraOccurrenceEnd.value
          ? new Date(this.extraOccurrenceEnd.value).toISOString()
          : null,
      );
      this.extraOccurrenceStart.setValue('');
      this.extraOccurrenceEnd.setValue('');
      await this.loadOccurrences(eventId);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Occurrence impossible');
    }
  }

  private async loadEvent(eventId: string): Promise<void> {
    try {
      const eventRow = await this.catalogAdmin.getEvent(eventId);
      if (!eventRow) {
        this.errorMessage.set('Événement introuvable');
        return;
      }
      this.eventForm.patchValue({
        title: eventRow.title,
        slug: eventRow.slug,
        summary: eventRow.summary ?? '',
        place_id: eventRow.place_id ?? '',
        status: eventRow.status as EventStatus,
      });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Chargement impossible');
    }
  }

  private async loadOccurrences(eventId: string): Promise<void> {
    this.occurrences.set(await this.catalogAdmin.listOccurrences(eventId));
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
