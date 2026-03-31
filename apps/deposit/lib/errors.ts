/**
 * Custom errors mapped to HTTP status codes.
 *
 * `withApiHandler` (see `api-response.ts`) catches these and returns
 * the corresponding status code + optional machine-readable `code`.
 *
 * NOTE: `Object.setPrototypeOf` ensures `instanceof` works correctly
 * when targeting ES5 — without it the prototype chain can break.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — client sent invalid data. */
export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
    this.name = "ValidationError";
  }
}

/** 401 — missing or invalid auth token. */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", code?: string) {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}
