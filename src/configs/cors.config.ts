export const corsConfig = {
  // TODO: restrict origin in production
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders:
    'Content-Type, Accept, Authorization, Locale, isLocalized, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  exposedHeaders: ['Content-Length', 'X-RateLimit-Remaining'],
  preflightContinue: false,
};
