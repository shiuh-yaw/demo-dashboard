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
export {
  WidgetCard,
  type WidgetCardProps,
  widgetHeaderTrailingIconButtonClassName,
} from "./widget-card";
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
export { KycGate, type KycGateProps } from "./kyc-gate";
export {
  WalletSelectionScreen,
  type WalletSelectionScreenProps,
  type WalletOption,
} from "./wallet-selection-screen";

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

// Layout components
export { AuthLayout, type AuthLayoutProps } from "./auth-layout";

// Scenario-page primitives (demos-surface phase 2 v2)
export {
  ScenarioEyebrow,
  RouteChip,
  ChipArrow,
  ScenarioHero,
  type ScenarioHeroProps,
} from "./scenario-chrome";
export { ScenarioLayout } from "./scenario-layout";
export {
  BookACallButton,
  ScenarioBrandRow,
  ScenarioBrandImage,
  type ScenarioBrandImageProps,
} from "./scenario-brand";

// Site chrome — Dynamic marketing header/footer shared by the dashboard
// landing and demo scenario pages (unthemed by design)
export { SiteHeader, type SiteHeaderProps } from "./site-header";
export { SiteFooter, type SiteFooterProps } from "./site-footer";
export { DEMO_DIRECTORY, type DemoDirectoryEntry } from "./demo-directory";
export {
  BookACallProvider,
  BookACallLink,
  useBookACallHref,
  DEFAULT_BOOK_A_CALL_HREF,
} from "./book-a-call";

// Code panel — integration stepper with tabs and code frames
export {
  CodePanel,
  type CodeStep,
  type CodePanelProps,
} from "./code-panel";
export { CodeFrame, DocsLink } from "./code-panel-atoms";
export { renderProse } from "./render-prose";
export { Stepper } from "./code-panel-stepper";
export { SdkStack, type SdkStackProps } from "./sdk-stack";
export { PanelNotice, type PanelNoticeProps } from "./panel-notice";
export {
  createPanelSectionContext,
  type PanelSectionApi,
} from "./panel-section";
export { ResetThemeButton } from "./reset-theme-button";
export {
  HeaderMenu,
  HeaderMenuRow,
  BookACallMenuRow,
  useHeaderMenu,
  headerMenuRowClassName,
  type HeaderMenuProps,
  type HeaderMenuRowProps,
} from "./header-menu";

// Branding components
export { DynamicLogo, type DynamicLogoProps } from "./dynamic-logo";
export { KrakenLogo, type KrakenLogoProps } from "./kraken-logo";
export {
  FireblocksLogomark,
  type FireblocksLogomarkProps,
  type FireblocksLogomarkVariant,
} from "./fireblocks-logomark";
export {
  PoweredByFooter,
  type PoweredByFooterProps,
} from "./powered-by-footer";

// Providers
export { ThemeProvider, type ThemeProviderProps } from "./theme-provider";
