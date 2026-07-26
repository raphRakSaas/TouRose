const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const compactDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const verifiedDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
});

export function formatEventDateTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }
  return dateFormatter.format(new Date(isoDate));
}

export function formatEventDateLong(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }
  return shortDateFormatter.format(new Date(isoDate));
}

export function formatPriceType(priceType: string): string {
  switch (priceType) {
    case 'free':
      return 'Gratuit';
    case 'paid':
      return 'Payant';
    case 'donation':
      return 'Prix libre';
    default:
      return priceType;
  }
}

export function formatPriceBadge(priceType: string): { label: string; tone: 'free' | 'paid' } {
  if (priceType === 'free') {
    return { label: 'Gratuit', tone: 'free' };
  }
  if (priceType === 'donation') {
    return { label: 'Prix libre', tone: 'paid' };
  }
  if (priceType === 'paid') {
    return { label: 'Payant', tone: 'paid' };
  }
  return { label: formatPriceType(priceType), tone: 'paid' };
}

export function formatEventDateCompact(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }

  const eventDate = new Date(isoDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const dayDiff = Math.round((eventDayStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return 'Ce soir';
  }
  if (dayDiff === 1) {
    return 'Demain';
  }

  return compactDateFormatter.format(eventDate);
}

export function formatEventDateCard(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function formatEventSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): { dateLabel: string; timeLabel: string } | null {
  if (!startsAt) {
    return null;
  }

  const startDate = new Date(startsAt);
  const dateLabel = shortDateFormatter.format(startDate);
  const startTime = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  let timeLabel = startTime;

  if (endsAt) {
    const endTime = new Date(endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    timeLabel = `${startTime} — ${endTime}`;
  }

  return { dateLabel, timeLabel };
}

export function formatEventPriceDisplay(priceType: string): string {
  if (priceType === 'free') {
    return 'Entrée libre / Gratuit';
  }
  return formatPriceType(priceType);
}

export function formatIndoorOutdoor(value: string): string | null {
  switch (value) {
    case 'indoor':
      return 'En intérieur';
    case 'outdoor':
      return 'En plein air';
    case 'mixed':
      return 'Intérieur & extérieur';
    default:
      return null;
  }
}

export function formatCategoryLabel(categorySlug: string): string {
  const words = categorySlug.replaceAll('_', ' ').split(' ');
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function formatLastVerifiedAt(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

export function formatVerifiedAt(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }

  const verifiedDate = new Date(isoDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const verifiedDayStart = new Date(
    verifiedDate.getFullYear(),
    verifiedDate.getMonth(),
    verifiedDate.getDate(),
  );

  if (verifiedDayStart.getTime() === todayStart.getTime()) {
    return "Vérifié aujourd'hui";
  }

  return `Vérifié le ${verifiedDateFormatter.format(verifiedDate)}`;
}

export function formatPlaceType(placeType: string): string {
  switch (placeType) {
    case 'cultural_venue':
      return 'Lieu culturel';
    case 'discovery':
      return 'Découverte';
    case 'park':
      return 'Parc';
    case 'museum':
      return 'Musée';
    default:
      return placeType.replaceAll('_', ' ');
  }
}
