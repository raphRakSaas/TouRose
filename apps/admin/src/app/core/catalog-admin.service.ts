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

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as AdminPlaceRow[];
  }

  async getPlace(placeId: string): Promise<AdminPlaceRow | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('places')
      .select('id, slug, name, summary, place_type, status, city, updated_at')
      .eq('id', placeId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data as AdminPlaceRow | null;
  }

  async savePlace(input: AdminPlaceInput): Promise<string> {
    const client = this.requireClient();
    const payload = adminPlaceInputSchema.parse(input);
    const { data, error } = await client.rpc('admin_save_place', { payload });
    if (error) {
      throw new Error(error.message);
    }
    return data as string;
  }

  async listEvents(): Promise<AdminEventRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, slug, title, summary, status, place_id, updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as AdminEventRow[];
  }

  async getEvent(eventId: string): Promise<AdminEventRow | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, slug, title, summary, status, place_id, updated_at')
      .eq('id', eventId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data as AdminEventRow | null;
  }

  async saveEvent(input: AdminEventInput): Promise<string> {
    const client = this.requireClient();
    const payload = adminEventInputSchema.parse(input);
    const { data, error } = await client.rpc('admin_save_event', { payload });
    if (error) {
      throw new Error(error.message);
    }
    return data as string;
  }

  private requireClient() {
    const client = this.supabaseClient.getClient();
    if (!client) {
      throw new Error('Client Supabase non configuré.');
    }
    return client;
  }
}
