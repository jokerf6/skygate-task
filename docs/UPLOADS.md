# Upload Architecture

This document explains the upload flow, local storage behavior, and the S3-compatible contract used by the application.

## Upload Decorators and Interceptors

All file upload behavior is centralized in `src/decorators/api/upload-file.decorator.ts`.

### File naming

Uploaded files are named with a pattern that preserves uniqueness and future S3 compatibility:

## S3 Compatibility Strategy

The upload system is intentionally designed so the frontend does not need to change when S3 is enabled later.

### What is already compatible with S3

- the API uses a single upload contract for both local and remote storage
- returned paths are stable and portable
- uploaded files are stored under a logical object key path, not a hardcoded absolute path
- the media controller exposes files through a normalized path format

### Local fallback behavior

When `AWS_MEDIA=false` or AWS credentials are not provided, uploads remain local.

The code path still preserves the same semantics as S3:

- field names stay the same
- returned media path is a relative object key
- the controller can later switch to an S3 `getObject` strategy without changing the API shape

## Media Delivery

The media controller is implemented in `src/_modules/media/media.controller.ts`.

### Normalization

The controller normalizes the requested path so both of these inputs work:

- `/uploads/image.png`
- `uploads/image.png`

It resolves the requested file against `UPLOADS_PATH` and delivers it via `res.sendFile(...)`.

### Future S3 migration

Because the route normalizes object keys instead of using absolute filesystem paths, migrating to S3 will require only the storage backend implementation, not the upload API contract.

## File Validation

Upload validation is applied at multiple layers:

- Multer filters for MIME type, extension, and file size
- DTO/file validators for additional application-level constraints
- required-file validation interceptor to enforce mandatory upload fields

This multi-layer strategy keeps the upload surface secure, predictable, and ready for future cloud storage support.
