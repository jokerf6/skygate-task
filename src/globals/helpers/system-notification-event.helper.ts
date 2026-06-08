import { EVENTS } from '@prisma/client';

type RequestLike = {
  method: string;
  originalUrl: string;
};

const SYSTEM_NOTIFICATION_ROUTE_PATTERNS: Array<{
  event: EVENTS;
  method: string;
  patterns: RegExp[];
}> = [
  {
    event: EVENTS.LOGIN,
    method: 'post',
    patterns: [/^\/auth\/login\/[^/]+$/i],
  },
  {
    event: EVENTS.CREATE_ORDER,
    method: 'post',
    patterns: [/^\/orders?(\/|$)/i, /^\/checkout(\/|$)/i],
  },
];

export function resolveSystemNotificationEvent(
  request: RequestLike,
): EVENTS | undefined {
  const requestPath = normalizeRequestPath(request.originalUrl);
  const method = request.method.toLowerCase();

  const match = SYSTEM_NOTIFICATION_ROUTE_PATTERNS.find(
    (route) =>
      route.method === method &&
      route.patterns.some((pattern) => pattern.test(requestPath)),
  );

  return match?.event;
}

function normalizeRequestPath(originalUrl: string): string {
  const path = originalUrl.split('?')[0] ?? '';
  return path.replace(/^\/api\/v1/i, '');
}
