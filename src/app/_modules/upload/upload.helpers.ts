import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

const SAFE_SEGMENT_REGEX = /^[a-zA-Z0-9._\-\/]+$/;

/**
 * Validates a relative path segment against traversal attacks and invalid characters.
 * Throws BadRequestException on any violation.
 */
export function sanitizeSegment(input: string, fieldName: string): string {
  if (!input || typeof input !== 'string') {
    throw new BadRequestException(`${fieldName} is required`);
  }
  if (input.includes('\\')) {
    throw new BadRequestException(`${fieldName} contains invalid path separator`);
  }
  if (!SAFE_SEGMENT_REGEX.test(input)) {
    throw new BadRequestException(`${fieldName} contains invalid characters`);
  }
  if (input.startsWith('/')) {
    throw new BadRequestException(`${fieldName} cannot start with '/'`);
  }
  if (input.split('/').some((seg) => seg === '..' || seg === '.')) {
    throw new BadRequestException(`${fieldName} contains invalid path segments`);
  }
  return input;
}

/**
 * Safely joins a base directory with a relative path, ensuring the result
 * stays within the base directory (path traversal protection).
 */
export function safeJoin(baseDir: string, relativePath: string): string {
  const base = path.resolve(baseDir);
  const target = path.resolve(baseDir, relativePath);

  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new BadRequestException('Invalid path: outside base directory');
  }

  return target;
}