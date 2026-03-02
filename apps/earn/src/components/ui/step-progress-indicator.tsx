"use client";

import { CheckCircle2 } from "lucide-react";

interface StepProgressIndicatorProps {
  /** Total number of steps */
  totalSteps: number;
  /** Current step (1-indexed) */
  currentStep: number;
  /** Class name for additional styling */
  className?: string;
}

/**
 * A reusable step progress indicator component.
 * Shows completed, active, and pending states for multi-step flows.
 */
export function StepProgressIndicator({
  totalSteps,
  currentStep,
  className = "",
}: StepProgressIndicatorProps) {
  return (
    <div className={`flex items-center justify-center py-3 ${className}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            {/* Step circle */}
            <div
              className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted
                  ? "bg-emerald-600 text-white"
                  : isActive
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                stepNumber
              )}
            </div>
            
            {/* Connector line (not after last step) */}
            {stepNumber < totalSteps && (
              <div
                className={`w-10 h-0.5 ${
                  isCompleted ? "bg-emerald-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
