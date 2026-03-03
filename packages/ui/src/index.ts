/**
 * @dynamic-demos/ui
 *
 * Shared UI components for all demo apps.
 * Components use CSS variables for theming, compatible with both
 * widget-style (--widget-*) and dashboard-style (--color-earn-*) themes.
 *
 * This package is designed to be open-sourced for use with Dynamic SDK.
 */

// Core components
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
} from "./card";
export { Input, type InputProps } from "./input";
export { Select, type SelectProps } from "./select";
export { Skeleton, type SkeletonProps } from "./skeleton";
export { Spinner, type SpinnerProps } from "./spinner";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
} from "./dialog";

// Widget components (for embedded widget UIs)
export { WidgetCard, type WidgetCardProps } from "./widget-card";
export { ListRow, type ListRowProps } from "./list-row";
export {
  ScrollableWithFade,
  type ScrollableWithFadeProps,
} from "./scrollable-with-fade";
export { ErrorCard, type ErrorCardProps } from "./error-card";
export { LoadingCard, type LoadingCardProps } from "./loading-card";

// Utility components
export { Tooltip, type TooltipProps } from "./tooltip";
export {
  CopyButton,
  type CopyButtonProps,
  type CopyButtonSize,
} from "./copy-button";
export {
  ErrorBanner,
  type ErrorBannerProps,
  type ErrorBannerType,
} from "./error-banner";

// Login components
export {
  LoginForm,
  OAuthCompletingCard,
  type LoginFormProps,
} from "./login-form";

// Card components
export {
  StableCoinCard,
  type StableCoinCardProps,
  type StableCoinCardVariant,
} from "./stable-coin-card";
export {
  VisaIcon,
  VisaIconWhite,
  MastercardIcon,
  MastercardIconWhite,
  type CardType,
} from "./credit-card-icons";

// Branding components
export { DynamicLogo, type DynamicLogoProps } from "./dynamic-logo";
export { KrakenLogo, type KrakenLogoProps } from "./kraken-logo";
export {
  PoweredByFooter,
  type PoweredByFooterProps,
} from "./powered-by-footer";

// Providers
export { ThemeProvider, type ThemeProviderProps } from "./theme-provider";
