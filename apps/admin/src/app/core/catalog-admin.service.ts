import { Injectable, inject } from '@angular/core';
import {
  adminEventInputSchema,
  adminPlaceInputSchema,
  type AdminEventInput,
  type AdminPlaceInput,
} from '@tourose/contracts';

import { SupabaseClientService } from './supabase-client.service';

export type AdminPlaceRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  place_type: string;
  status: string;
  city: string | null;
  updated_at: string;
};

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  place_id: string | null;
  updated_at: string;
};

export type AdminOccurrenceRow = {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
};

export type AdminCategoryRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

export type AdminSourceRow = {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
  license_name: string | null;
};

export type AdminAuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export const TOULOUSE_TERRITORY_ID = '11111111-1111-1111-1111-111111111111';

@Injectable({ providedIn: 'root' })
export class CatalogAdminService {
  private readonly supabaseClient = inject(SupabaseClientService);

  async listPlaces(): Promise<AdminPlaceRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('places')
      .select('id, slug, name, summary, place_type, status, city, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminPlaceRow[];
  }

  async getPlace(placeId: string): Promise<AdminPlaceRow | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('places')
      .select('id, slug, name, summary, place_type, status, city, updated_at')
      .eq('id', placeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as AdminPlaceRow | null;
  }

  async savePlace(input: AdminPlaceInput): Promise<string> {
    const client = this.requireClient();
    const payload = adminPlaceInputSchema.parse(input);
    const { data, error } = await client.rpc('admin_save_place', { payload });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async archivePlace(placeRow: AdminPlaceRow): Promise<void> {
    await this.savePlace({
      id: placeRow.id,
      territory_id: TOULOUSE_TERRITORY_ID,
      slug: placeRow.slug,
      name: placeRow.name,
      summary: placeRow.summary ?? undefined,
      place_type: placeRow.place_type as AdminPlaceInput['place_type'],
      status: 'archived',
      city: placeRow.city ?? undefined,
    });
  }

  async listEvents(): Promise<AdminEventRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, slug, title, summary, status, place_id, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminEventRow[];
  }

  async getEvent(eventId: string): Promise<AdminEventRow | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, slug, title, summary, status, place_id, updated_at')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as AdminEventRow | null;
  }

  async saveEvent(input: AdminEventInput): Promise<string> {
    const client = this.requireClient();
    const payload = adminEventInputSchema.parse(input);
    const { data, error } = await client.rpc('admin_save_event', { payload });
    if (error) throw new Error(error.message);
    return data as string;
  }

  async archiveEvent(eventRow: AdminEventRow): Promise<void> {
    await this.saveEvent({
      id: eventRow.id,
      territory_id: TOULOUSE_TERRITORY_ID,
      place_id: eventRow.place_id,
      slug: eventRow.slug,
      title: eventRow.title,
      summary: eventRow.summary ?? undefined,
      status: 'archived',
    });
  }

  async listOccurrences(eventId: string): Promise<AdminOccurrenceRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('event_occurrences')
      .select('id, event_id, starts_at, ends_at, status')
      .eq('event_id', eventId)
      .order('starts_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminOccurrenceRow[];
  }

  async addOccurrence(
    eventId: string,
    startsAtIso: string,
    endsAtIso: string | null,
  ): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.from('event_occurrences').insert({
      event_id: eventId,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      status: 'scheduled',
    });
    if (error) throw new Error(error.message);
  }

  async listCategories(): Promise<AdminCategoryRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('categories')
      .select('id, slug, name, is_active')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminCategoryRow[];
  }

  async saveCategory(input: {
    id?: string;
    slug: string;
    name: string;
    is_active: boolean;
  }): Promise<void> {
    const client = this.requireClient();
    if (input.id) {
      const { error } = await client
        .from('categories')
        .update({
          slug: input.slug,
          name: input.name,
          is_active: input.is_active,
        })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await client.from('categories').insert({
      slug: input.slug,
      name: input.name,
      is_active: input.is_active,
    });
    if (error) throw new Error(error.message);
  }

  async listSources(): Promise<AdminSourceRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('sources')
      .select('id, name, kind, is_active, license_name')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminSourceRow[];
  }

  async saveSource(input: {
    id?: string;
    name: string;
    kind: string;
    is_active: boolean;
    license_name?: string;
  }): Promise<void> {
    const client = this.requireClient();
    if (input.id) {
      const { error } = await client
        .from('sources')
        .update({
          name: input.name,
          kind: input.kind,
          is_active: input.is_active,
          license_name: input.license_name ?? null,
        })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await client.from('sources').insert({
      name: input.name,
      kind: input.kind,
      is_active: input.is_active,
      license_name: input.license_name ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async listAuditLogs(limitCount = 50): Promise<AdminAuditRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limitCount);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminAuditRow[];
  }

  private requireClient() {
    const client = this.supabaseClient.getClient();
    if (!client) {
      throw new Error('Client Supabase non configuré.');
    }
    return client;
  }
}
