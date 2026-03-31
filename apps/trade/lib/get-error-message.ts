/**
 * Parse error into structured title and description
 */

export interface ParsedError {
  title: string;
  description?: string;
}

export function parseError(
  error: unknown,
  defaultMessage = "Something went wrong. Please try again.",
): ParsedError {
  if (!error) return { title: "" };

  let message = "";

  if (typeof error === "object" && error !== null && "message" in error) {
    message = (error as { message: string }).message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    return { title: defaultMessage };
  }

  if (message === 'request/body/email must match format "email"') {
    return { title: "Invalid email address" };
  }

  if (message.includes("rate limit")) {
    return {
      title: "Too many attempts",
      description: "Please try again later.",
    };
  }

  if (message.includes("invalid otp") || message.includes("Invalid OTP")) {
    return { title: "Invalid verification code" };
  }

  return { title: message || defaultMessage };
}
