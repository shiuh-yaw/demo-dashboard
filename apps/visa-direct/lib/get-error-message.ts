export interface ParsedError {
  title: string;
  description?: string;
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = "Something went wrong. Please try again.",
): string {
  const parsed = parseError(error, defaultMessage);
  return parsed.description
    ? `${parsed.title}: ${parsed.description}`
    : parsed.title;
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

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("ETIMEDOUT")
  ) {
    return {
      title: "Network error",
      description: "Unable to connect to the network. Please try again.",
    };
  }

  if (message.length > 100) {
    const shortMessage =
      (message.split(".")[0] ?? message).split(":")[0]?.trim() ?? message;
    if (shortMessage.length < 80) {
      return { title: shortMessage };
    }
    return {
      title: "Request failed",
      description: shortMessage.substring(0, 100) + "...",
    };
  }

  return { title: message };
}
