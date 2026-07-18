import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

export type ImportRunRow = {
  id: string;
  source_id: string;
  status: string;
  correlation_id: string;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  message: string | null;
};

export type ImportErrorRow = {
  id: string;
  import_run_id: string;
  external_id: string | null;
  error_code: string;
  message: string;
  created_at: string;
};

export type ImportTriggerResult = {
  ok: boolean;
  importRunId: string;
  status: string;
  mode: string;
  fetchedCount: number;
};

@Injectable({ providedIn: 'root' })
export class ImportAdminService {
  private readonly supabaseClient = inject(SupabaseClientService);

  async listRuns(limitCount = 20): Promise<ImportRunRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('import_runs')
      .select(
        'id, source_id, status, correlation_id, started_at, finished_at, fetched_count, created_count, updated_count, skipped_count, error_count, message',
      )
      .order('started_at', { ascending: false })
      .limit(limitCount);
    if (error) throw new Error(error.message);
    return (data ?? []) as ImportRunRow[];
  }

  async listErrorsForRun(importRunId: string): Promise<ImportErrorRow[]> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('import_errors')
      .select('id, import_run_id, external_id, error_code, message, created_at')
      .eq('import_run_id', importRunId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ImportErrorRow[];
  }

  async triggerOpenAgendaImport(): Promise<ImportTriggerResult> {
    const client = this.requireClient();
    const session = await client.auth.getSession();
    const accessToken = session.data.session?.access_token;
    if (!accessToken) {
      throw new Error('Session admin requise pour lancer un import.');
    }

    const importSecret = environment.importCronSecret;
    const response = await fetch(`${environment.supabaseUrl}/functions/v1/import-openagenda`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: environment.supabaseAnonKey,
        'x-tourose-import-secret': importSecret,
      },
      body: JSON.stringify({ trigger: 'admin' }),
    });

    const body = (await response.json()) as ImportTriggerResult & { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? `Import HTTP ${response.status}`);
    }
    return body;
  }

  private requireClient() {
    const client = this.supabaseClient.getClient();
    if (!client) {
      throw new Error('Client Supabase non configuré.');
    }
    return client;
  }
}
