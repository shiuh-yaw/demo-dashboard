"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant - 'widget' for compact style, 'dashboard' for full style */
  variant?: "widget" | "dashboard";
}

/**
 * Card container component.
 * Uses CSS variables for theming.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "dashboard", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-[var(--ui-border,var(--widget-border,var(--color-earn-border,#e1e4ea)))]",
        variant === "widget"
          ? "bg-[var(--widget-background,#ffffff)]"
          : "bg-white",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional title */
  title?: ReactNode;
  /** Optional action (e.g., button) */
  action?: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {title || action ? (
        <>
          {title && (
            <h2 className="text-base font-medium text-[var(--ui-text,var(--widget-foreground,var(--color-earn-text-primary,#0e121b)))]">
              {title}
            </h2>
          )}
          {action}
        </>
      ) : (
        children
      )}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-base font-medium text-[var(--ui-text,var(--widget-foreground,var(--color-earn-text-primary,#0e121b)))]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-5 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
