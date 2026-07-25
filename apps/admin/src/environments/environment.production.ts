import { productionGeneratedConfig } from './production.generated';

export const environment = {
  production: true,
  supabaseUrl: productionGeneratedConfig.supabaseUrl,
  supabaseAnonKey: productionGeneratedConfig.supabaseAnonKey,
  importCronSecret: productionGeneratedConfig.importCronSecret,
};
