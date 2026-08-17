/** Central registry of curated infrastructure photography (Unsplash) */
/** ALL images below have been manually verified to load correctly */

const VERIFIED_GENERAL = [
  'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop', // Wind turbines on green hills
  'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1920&auto=format&fit=crop', // Wind farm at orange sunset
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop', // Solar panels blue sky
  'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1920&auto=format&fit=crop', // Large solar farm
  'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop', // Power transmission lines at sunset
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1920&auto=format&fit=crop', // Industrial welder sparks
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1920&auto=format&fit=crop', // Engineering workspace
] as const;

export const INFRA_IMAGES = {
  general: VERIFIED_GENERAL,
  solar: [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1920&auto=format&fit=crop',
  ],
  wind: [
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1920&auto=format&fit=crop',
  ],
  tower: [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop',
  ],
  pipeline: [
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1920&auto=format&fit=crop',
  ],
  bridge: [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop',
  ],
  loginHero: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop',
  registerHero: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1920&auto=format&fit=crop',
} as const;

/** Map an asset type string to the correct image set */
export function getAssetTypeImages(type?: string): readonly string[] {
  if (!type) return INFRA_IMAGES.general;
  const lower = type.toLowerCase();
  if (lower.includes('solar') || lower.includes('panel')) return INFRA_IMAGES.solar;
  if (lower.includes('wind') || lower.includes('turbine')) return INFRA_IMAGES.wind;
  if (lower.includes('tower') || lower.includes('transmission') || lower.includes('power')) return INFRA_IMAGES.tower;
  if (lower.includes('pipeline') || lower.includes('pipe') || lower.includes('refinery')) return INFRA_IMAGES.pipeline;
  if (lower.includes('bridge') || lower.includes('dam')) return INFRA_IMAGES.bridge;
  return INFRA_IMAGES.general;
}

/** Get a single thumbnail for an asset type */
export function getAssetThumbnail(type?: string): string {
  const images = getAssetTypeImages(type);
  return images[0] || INFRA_IMAGES.general[0];
}
