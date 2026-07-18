import { generatedLocalConfig } from './local.generated';

export const environment = {
  production: false,
  supabaseUrl: generatedLocalConfig.supabaseUrl,
  supabaseAnonKey: generatedLocalConfig.supabaseAnonKey,
};
