import { buildPublicCatalogUrl } from './public-urls';

describe('buildPublicCatalogUrl', () => {
  it('construit l’URL événement', () => {
    expect(buildPublicCatalogUrl('event', 'concert-test')).toContain(
      '/catalogue/evenements/concert-test',
    );
  });

  it('construit l’URL lieu', () => {
    expect(buildPublicCatalogUrl('place', 'jardin')).toContain('/catalogue/lieux/jardin');
  });
});
