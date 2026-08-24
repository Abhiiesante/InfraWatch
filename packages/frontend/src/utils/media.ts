/**
 * Resolves media URLs (video files, extracted frame images, thumbnails) to their absolute accessible URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  
  // If already absolute or base64 data URI, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // If starts with local storage key indicator like "local:videos/..."
  if (url.startsWith('local:')) {
    const stripped = url.replace(/^local:/, '');
    const cleanPath = stripped.startsWith('/') ? stripped : `/${stripped}`;
    const backendBase = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000';
    return `${backendBase}/uploads${cleanPath}`;
  }

  // Prepend backend host for relative server uploads
  const backendBase = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:3000';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanUrl}`;
}
