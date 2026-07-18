import { Injectable, inject, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';

import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly userSignal = signal<User | null>(null);
  private initialized = false;

  readonly session = this.sessionSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const client = this.supabaseClient.getClient();
    if (!client) {
      return;
    }

    const { data } = await client.auth.getSession();
    this.sessionSignal.set(data.session);
    this.userSignal.set(data.session?.user ?? null);

    client.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      this.userSignal.set(session?.user ?? null);
    });
  }

  isAdmin(): boolean {
    const appMetadata = this.userSignal()?.app_metadata as { role?: string } | undefined;
    return appMetadata?.role === 'admin';
  }

  hasAuthenticatedSession(): boolean {
    return this.sessionSignal() !== null && this.isAdmin();
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<{ errorMessage: string | null }> {
    const client = this.supabaseClient.getClient();
    if (!client) {
      return { errorMessage: 'Client Supabase non configuré (lance `pnpm dev:up`).' };
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      return { errorMessage: error.message };
    }

    this.sessionSignal.set(data.session);
    this.userSignal.set(data.user);

    const role = (data.user.app_metadata as { role?: string } | undefined)?.role;
    if (role !== 'admin') {
      await client.auth.signOut();
      this.sessionSignal.set(null);
      this.userSignal.set(null);
      return { errorMessage: 'Compte sans rôle admin.' };
    }

    return { errorMessage: null };
  }

  async signOut(): Promise<void> {
    const client = this.supabaseClient.getClient();
    if (client) {
      await client.auth.signOut();
    }
    this.sessionSignal.set(null);
    this.userSignal.set(null);
  }
}
