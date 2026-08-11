/** Central registry of curated infrastructure photography (Unsplash) */

export const INFRA_IMAGES = {
  // Solar
  solar: [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1920&auto=format&fit=crop',
  ],
  // Wind
  wind: [
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1920&auto=format&fit=crop',
  ],
  // Transmission / Power
  tower: [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548613053-22087c765729?q=80&w=1920&auto=format&fit=crop',
  ],
  // Pipeline / Industrial
  pipeline: [
    'https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1920&auto=format&fit=crop',
  ],
  // Bridge / Dam / Infrastructure
  bridge: [
    'https://images.unsplash.com/photo-1563200922-0941913dfbc5?q=80&w=1920&auto=format&fit=crop', // Hoover Dam
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1920&auto=format&fit=crop',
  ],
  // General / mixed infrastructure
  general: [
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop', // Wind
    'https://images.unsplash.com/photo-1563200922-0941913dfbc5?q=80&w=1920&auto=format&fit=crop', // Dam
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1920&auto=format&fit=crop', // Towers
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop', // Solar
    'https://images.unsplash.com/photo-1548613053-22087c765729?q=80&w=1920&auto=format&fit=crop', // Power Station
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1920&auto=format&fit=crop', // Solar Array 2
  ],
  // Login hero
  loginHero: 'https://images.unsplash.com/photo-1563200922-0941913dfbc5?q=80&w=1920&auto=format&fit=crop',
  // Register hero
  registerHero: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1920&auto=format&fit=crop',
} as const;

/** Map an asset type string to the correct image set */
export function getAssetTypeImages(type?: string): readonly string[] {
  if (!type) return INFRA_IMAGES.general;
  const lower = type.toLowerCase();
  if (lower.includes('solar') || lower.includes('panel')) return INFRA_IMAGES.solar;
  if (lower.includes('wind') || lower.includes('turbine')) return INFRA_IMAGES.wind;
  if (lower.includes('tower') || lower.includes('transmission') || lower.includes('power') || lower.includes('substation'))
    return INFRA_IMAGES.tower;
  if (lower.includes('pipeline') || lower.includes('pipe') || lower.includes('refinery') || lower.includes('industrial'))
    return INFRA_IMAGES.pipeline;
  if (lower.includes('bridge') || lower.includes('dam') || lower.includes('tunnel'))
    return INFRA_IMAGES.bridge;
  return INFRA_IMAGES.general;
}

/** Get a single thumbnail for an asset type */
export function getAssetThumbnail(type?: string): string {
  const images = getAssetTypeImages(type);
  return images[0];
}
