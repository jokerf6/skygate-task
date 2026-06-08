export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

export enum UploadTypes {
  IMAGE = 'image',
  VIDEO = 'video',
  ATTACHMENT = 'attachment',
  MANY = 'many',
}

export const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.msi',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.php',
  '.phtml',
  '.js',
  '.mjs',
  '.cjs',
  '.jsp',
  '.asp',
  '.aspx',
  '.jar',
  '.war',
  '.py',
  '.rb',
  '.pl',
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.m4v',
]);
