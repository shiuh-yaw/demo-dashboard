import { isGasSponsorshipError } from "@dynamic-labs-sdk/zerodev";

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

  if (isGasSponsorshipError(error)) {
    return {
      title: "Gas sponsorship unavailable",
      description:
        "This transaction doesn't qualify for gas sponsorship. You'll need to pay gas fees.",
    };
  }

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
    message.includes("insufficient funds") ||
    message.includes("exceeds the balance")
  ) {
    return {
      title: "Insufficient funds",
      description:
        "Your account doesn't have enough balance to cover the transaction amount plus gas fees.",
    };
  }

  if (message.includes("User rejected") || message.includes("user rejected")) {
    return {
      title: "Transaction cancelled",
      description: "You rejected the transaction.",
    };
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
    const shortMessage = (message.split(".")[0] ?? message).split(":")[0]?.trim() ?? message;
    if (shortMessage.length < 80) {
      return { title: shortMessage };
    }
    return {
      title: "Transaction failed",
      description: shortMessage.substring(0, 100) + "...",
    };
  }

  return { title: message };
}
