/**
 * UI Components
 *
 * Dashboard-specific components with fixed styling for internal admin use.
 * Uses shared components where styling is compatible.
 */

// Shared components from @dynamic-demos/ui
export {
  Button,
  type ButtonVariant,
  type ButtonSize,
  type ButtonProps,
  Input,
  type InputProps,
  Select,
  type SelectProps,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Skeleton,
  type SkeletonProps,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  type DialogContentProps,
} from "@dynamic-demos/ui";

// Dashboard-specific components (fixed styling for internal admin)
export {
  DashboardButton,
  DashboardLinkButton,
  type DashboardButtonVariant,
  type DashboardButtonSize,
} from "./dashboard-button";
export { Checkbox } from "./checkbox";
export { ConfirmModal } from "./confirm-modal";
