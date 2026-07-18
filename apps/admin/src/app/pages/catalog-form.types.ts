export type PlaceType =
  | 'monument'
  | 'museum'
  | 'square'
  | 'park'
  | 'walk'
  | 'viewpoint'
  | 'activity'
  | 'cultural_venue'
  | 'historical_site'
  | 'permanent_tip';

export type PlaceStatus =
  'draft' | 'published' | 'temporarily_closed' | 'permanently_closed' | 'archived' | 'hidden';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'postponed' | 'archived' | 'hidden';

export type PriceType = 'free' | 'paid' | 'donation' | 'unknown';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed' | 'unknown';
