/**
 * Polymarket utilities
 */

export function calculateTimeRemaining(endDate: string): string {
  try {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      return "Closed";
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return "Unknown";
  }
}
