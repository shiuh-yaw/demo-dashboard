/**
 * @dynamic-demos/rain/client
 *
 * Client-side (React) Rain helpers. Separate entry from the package root so
 * the server-side Rain SDK (root export) stays free of React / Dynamic client
 * deps. Consumers must provide `react` and `@dynamic-labs-sdk/react-hooks`.
 */

export {
  useRainCardStore,
  rainCardRef,
  RAIN_CARD_METADATA_KEY,
  type RainCard,
  type RainCardStore,
} from "./use-rain-card-store";
