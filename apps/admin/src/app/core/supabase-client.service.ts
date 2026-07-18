import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly supabaseUrl = environment.supabaseUrl;
  readonly anonKey = environment.supabaseAnonKey;
  readonly isConfigured =
    this.anonKey.length > 0 &&
    !this.anonKey.includes('replace') &&
    !this.anonKey.includes('changeme');

  private client: SupabaseClient | null = null;

  getClient(): SupabaseClient | null {
    if (!this.isConfigured) {
      return null;
    }
    if (!this.client) {
      this.client = createClient(this.supabaseUrl, this.anonKey);
    }
    return this.client;
  }
}
