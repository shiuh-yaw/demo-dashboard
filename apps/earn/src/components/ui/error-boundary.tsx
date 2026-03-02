"use client";

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@dynamic-demos/ui";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ReactNode;
  /** Custom error handler */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show reset button */
  showReset?: boolean;
  /** Custom reset handler */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and handling React errors.
 *
 * Wraps components to prevent the entire app from crashing when an error occurs.
 * Provides a fallback UI with an option to retry.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error) => console.error("Caught:", error)}
 *   showReset
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Something went wrong</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          {this.props.showReset !== false && (
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Modal-specific error boundary with appropriate styling
 */
export function ModalErrorBoundary({
  children,
  onError,
  onReset,
}: {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}): ReactNode {
  return (
    <ErrorBoundary
      onError={onError}
      onReset={onReset}
      showReset
      fallback={
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-lg">
              Unable to load
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              There was a problem loading this content. Please close and try
              again.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
