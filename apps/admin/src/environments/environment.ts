import { generatedLocalConfig } from './local.generated';

export const environment = {
  production: false,
  supabaseUrl: generatedLocalConfig.supabaseUrl,
  supabaseAnonKey: generatedLocalConfig.supabaseAnonKey,
  /** Local-only default; override via generated config / secrets in prod. */
  importCronSecret: generatedLocalConfig.importCronSecret ?? 'local-import-secret',
};
