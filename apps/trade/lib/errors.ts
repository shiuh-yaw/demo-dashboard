/**
 * Custom Error Classes
 *
 * Application-specific errors that map to HTTP status codes.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code?: string) {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}
