/**
 * UI Components
 *
 * Re-exports from shared @dynamic-demos/ui package for common components.
 * App-specific components are exported from their local files.
 */

// Shared components from @dynamic-demos/ui
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  Input,
  type InputProps,
  Skeleton,
  type SkeletonProps,
  Spinner,
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
} from "@dynamic-demos/ui";

// App-specific components (unique to earn)
export { Alert } from "./alert";
export { Label } from "./label";
export { OptionCard } from "./option-card";
export { Popover, PopoverTrigger, PopoverContent } from "./popover";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { StepProgressIndicator } from "./step-progress-indicator";
export { ErrorBoundary } from "./error-boundary";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";
