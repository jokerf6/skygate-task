declare global {
  function env(key: keyof typeof process.env);

  namespace Express {
    interface Request {
      isLocalized?: boolean;
    }
  }
}

export {};
