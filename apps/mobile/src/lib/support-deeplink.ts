export function isSupportSuccessUrl(url: string): boolean {
  return url.includes('support/success');
}

export function isSupportCancelUrl(url: string): boolean {
  return url.includes('support/cancel');
}

export function routeForSupportDeepLink(url: string): '/support/success' | '/support/cancel' | null {
  if (isSupportSuccessUrl(url)) {
    return '/support/success';
  }
  if (isSupportCancelUrl(url)) {
    return '/support/cancel';
  }
  return null;
}
