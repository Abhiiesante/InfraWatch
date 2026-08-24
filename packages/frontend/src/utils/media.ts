/**
 * Resolves media URLs (video files, extracted frame images, thumbnails) to their accessible URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';

  const trimmed = url.trim();

  // If already absolute HTTP(S) or base64 data URI, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If starts with local storage key indicator like "local:videos/..."
  if (trimmed.startsWith('local:')) {
    const stripped = trimmed.replace(/^local:/, '');
    const cleanPath = stripped.startsWith('/') ? stripped : `/${stripped}`;
    return `/uploads${cleanPath}`;
  }

  // Ensure clean relative path for Vite proxy / static backend serving
  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return cleanUrl;
}
