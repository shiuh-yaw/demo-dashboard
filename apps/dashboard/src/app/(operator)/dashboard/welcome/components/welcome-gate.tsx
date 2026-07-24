"use client";

/**
 * Two-step onboarding gate (Phase 2). Step 1 is a static explainer; step 2
 * captures displayName + schedulingUrl by reusing `updateProfile`
 * (`lib/actions/profile.ts`) - `avatarUrl` is intentionally dropped from this
 * step. Both steps are skippable and neither has a required field: "Skip for
 * now" and "Continue" both end by calling `dismissOnboarding()` and routing
 * to `/dashboard`. An invalid `schedulingUrl` never blocks advancing - it
 * mirrors `updateProfile`'s existing behavior of returning an inline error
 * without forcing a retry.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Palette, Share2 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/droplet-client";
import { dismissOnboarding } from "@/lib/actions/onboarding";
import { updateProfile } from "@/lib/actions/profile";
import { toastError } from "@/lib/toast";
import { NO_AUTOFILL } from "@/lib/no-autofill";

export interface WelcomeGateProps {
  displayName: string | null;
  schedulingUrl: string | null;
}

const EXPLAINER_ITEMS = [
  {
    icon: Building2,
    title: "Create prospects",
    description: "Add the accounts you're demoing to, one per prospect.",
  },
  {
    icon: Palette,
    title: "Brand demos",
    description: "Spin up demos themed to each prospect in minutes.",
  },
  {
    icon: Share2,
    title: "Share trackable links",
    description: "Share a link and see when a prospect opens it.",
  },
];

type Step = 1 | 2;

export function WelcomeGate({ displayName, schedulingUrl }: WelcomeGateProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(displayName ?? "");
  const [url, setUrl] = useState(schedulingUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Which action is in flight, so only the pressed button shows its spinner.
  const [pending, setPending] = useState<"skip" | "continue" | null>(null);

  async function finish() {
    await dismissOnboarding();
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSkip() {
    setPending("skip");
    setIsSubmitting(true);
    try {
      await finish();
    } finally {
      setIsSubmitting(false);
      setPending(null);
    }
  }

  async function handleContinue() {
    setPending("continue");
    setIsSubmitting(true);
    try {
      const trimmedName = name.trim();
      const trimmedUrl = url.trim();
      if (trimmedName.length > 0 || trimmedUrl.length > 0) {
        const result = await updateProfile({
          displayName: trimmedName.length > 0 ? trimmedName : null,
          schedulingUrl: trimmedUrl.length > 0 ? trimmedUrl : null,
        });
        // Never block on a validation error (e.g. a non-https scheduling
        // URL) - surface it, then continue the gate regardless.
        if (!result.success) {
          toastError(result.error || "Failed to save profile");
        }
      }
      await finish();
    } finally {
      setIsSubmitting(false);
      setPending(null);
    }
  }

  if (step === 1) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to Dynamic Demos</CardTitle>
          <CardDescription>
            This is where you build and share demos for your prospects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {EXPLAINER_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => void handleSkip()}
          >
            {pending === "skip" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Skip for now
          </Button>
          <Button disabled={isSubmitting} onClick={() => setStep(2)}>
            Get started
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Set up your profile</CardTitle>
        <CardDescription>
          Both fields are optional and you can change them anytime from your
          profile page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-displayName">Display name</Label>
          <Input
            id="onboarding-displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={isSubmitting}
            {...NO_AUTOFILL}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-schedulingUrl">Meeting URL</Label>
          <Input
            id="onboarding-schedulingUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://cal.com/you"
            disabled={isSubmitting}
            {...NO_AUTOFILL}
          />
          <p className="text-xs text-muted-foreground">
            Drives the book-a-call CTA rendered inside your live demos. Must
            be an https link.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => void handleSkip()}
        >
          {pending === "skip" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Skip
        </Button>
        <Button disabled={isSubmitting} onClick={() => void handleContinue()}>
          {pending === "continue" && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
