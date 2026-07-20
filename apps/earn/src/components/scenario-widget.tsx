"use client";

/**
 * Live widget column for the scenario front door - the real login card
 * (same LoginContent the old /login rendered - email OTP + social) in a
 * WidgetCard + p-4, exactly like wallet's auth screen. Authenticated
 * visitors never see this: the middleware bounces them to /earn.
 * OAuth redirects land back on "/" (redirectUrl is the initiating
 * page), so LoginContent completes them here.
 */

import { WidgetCard } from "@dynamic-demos/ui";
import { LoginContent } from "@/components/login-content";

export function ScenarioWidget({
  isOAuthCallback = false,
}: {
  isOAuthCallback?: boolean;
}) {
  return (
    <WidgetCard>
      <div className="p-4">
        <LoginContent isOAuthCallback={isOAuthCallback} />
      </div>
    </WidgetCard>
  );
}
