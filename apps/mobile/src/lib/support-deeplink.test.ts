import { routeForSupportDeepLink } from '@/src/lib/support-deeplink';

describe('routeForSupportDeepLink', () => {
  it('routes stripe success return to the thank-you screen', () => {
    expect(routeForSupportDeepLink('tourose:///support/success')).toBe('/support/success');
    expect(routeForSupportDeepLink('tourose://support/success?session_id=cs_test')).toBe(
      '/support/success',
    );
  });

  it('routes cancel return to the cancel screen', () => {
    expect(routeForSupportDeepLink('tourose:///support/cancel')).toBe('/support/cancel');
  });

  it('ignores unrelated deep links', () => {
    expect(routeForSupportDeepLink('tourose:///(tabs)/for-me')).toBeNull();
  });
});
