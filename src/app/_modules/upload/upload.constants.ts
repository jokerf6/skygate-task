export const UPLOAD_LIMITS = {
  IMAGE: 10 * 1024 * 1024,   // 10 MB
  VIDEO: 500 * 1024 * 1024,  // 500 MB
  DEFAULT: 10 * 1024 * 1024, // 10 MB fallback
} as const;

export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

export const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.msi', '.dll', '.bat', '.cmd', '.sh', '.ps1',
  '.php', '.phtml', '.js', '.mjs', '.cjs', '.jsp', '.asp', '.aspx',
  '.jar', '.war', '.py', '.rb', '.pl',
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.txt',
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v',
]);

export const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v',
]);

export function getMaxBytes(ext: string): number {
  if (VIDEO_EXTENSIONS.has(ext.toLowerCase())) return UPLOAD_LIMITS.VIDEO;
  return UPLOAD_LIMITS.IMAGE;
}