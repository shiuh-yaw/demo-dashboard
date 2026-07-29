"use client";

/**
 * Rain KYC application form. Ported from the OSS
 * `components/application/application-form.tsx`, with the legacy
 * `useDynamicContext`/`useIsLoggedIn`/`useRefreshUser` hooks replaced by
 * the official `useUser` hook, and submission routed through the `useApply`
 * hook (which posts to `/api/card/apply` and refreshes the session on
 * success) instead of a bare `fetch` + `redirect`.
 *
 * Plain `useState` form state instead of `react-hook-form` - that dependency
 * is not installed in this app/workspace and the field count here does not
 * warrant adding it; validation runs through the same `applicationSchema`
 * the route validates against, so client and server never disagree on shape.
 */

import { useState } from "react";
import { Button, Input, Select } from "@dynamic-demos/ui";
import { useUser } from "@dynamic-labs-sdk/react-hooks";
import { useApply } from "@/hooks/use-apply";
import {
  ACCOUNT_PURPOSE_OPTIONS,
  OCCUPATION_OPTIONS,
  US_STATES,
} from "@/lib/constants";
import { applicationSchema, type ApplicationInput } from "./schema";
import { SANDBOX_APPLICATION } from "./sandbox-application";

const EMPTY_VALUES: ApplicationInput = {
  firstName: "",
  birthDate: "",
  nationalId: "",
  phoneNumber: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    region: "CA",
    postalCode: "",
    countryCode: "US",
  },
  occupation: "",
  annualSalary: "",
  accountPurpose: "spending",
  expectedMonthlyVolume: "",
  isTermsOfServiceAccepted: false,
};

export function ApplicationForm() {
  const [values, setValues] = useState<ApplicationInput>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { submit, isSubmitting, error } = useApply();
  const { data: user } = useUser();

  function setField<K extends keyof ApplicationInput>(
    key: K,
    value: ApplicationInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setAddressField<K extends keyof ApplicationInput["address"]>(
    key: K,
    value: ApplicationInput["address"][K],
  ) {
    setValues((prev) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  }

  const fillWithTestData = () => setValues(SANDBOX_APPLICATION);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = applicationSchema.safeParse(values);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    await submit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {user?.email ? (
        <p className="text-sm text-(--brand-muted)">
          Applying as {user.email}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        <Input
          label="First name"
          placeholder="Jane"
          value={values.firstName}
          onChange={(event) => setField("firstName", event.target.value)}
          error={fieldErrors.firstName}
        />
        <Input
          label="Birth date"
          type="date"
          value={values.birthDate}
          onChange={(event) => setField("birthDate", event.target.value)}
          error={fieldErrors.birthDate}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Social security number"
          placeholder="123456789"
          inputMode="numeric"
          autoComplete="off"
          value={values.nationalId}
          onChange={(event) =>
            setField(
              "nationalId",
              event.target.value.replace(/\D/g, "").slice(0, 9),
            )
          }
          error={fieldErrors.nationalId}
        />
        <Input
          label="Phone number"
          placeholder="5551234567"
          inputMode="tel"
          value={values.phoneNumber}
          onChange={(event) =>
            setField(
              "phoneNumber",
              event.target.value.replace(/\D/g, "").slice(0, 15),
            )
          }
          error={fieldErrors.phoneNumber}
        />
      </div>

      <Input
        label="Address line 1"
        placeholder="123 Market St"
        value={values.address.line1}
        onChange={(event) => setAddressField("line1", event.target.value)}
        error={fieldErrors["address.line1"]}
      />
      <Input
        label="Address line 2 (optional)"
        placeholder="Apt, suite, etc."
        value={values.address.line2 ?? ""}
        onChange={(event) => setAddressField("line2", event.target.value)}
      />

      <div className="grid grid-cols-1 gap-4">
        <Input
          label="City"
          placeholder="San Francisco"
          value={values.address.city}
          onChange={(event) => setAddressField("city", event.target.value)}
          error={fieldErrors["address.city"]}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--widget-fg,#1e293b)]">
            State
          </label>
          <Select
            value={values.address.region}
            onChange={(event) =>
              setAddressField("region", event.target.value)
            }
          >
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
          {fieldErrors["address.region"] ? (
            <p className="mt-1.5 text-sm text-red-500">
              {fieldErrors["address.region"]}
            </p>
          ) : null}
        </div>
        <Input
          label="ZIP"
          placeholder="94105"
          value={values.address.postalCode}
          onChange={(event) =>
            setAddressField("postalCode", event.target.value)
          }
          error={fieldErrors["address.postalCode"]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--widget-fg,#1e293b)]">
            Occupation
          </label>
          <Select
            value={values.occupation}
            onChange={(event) => setField("occupation", event.target.value)}
          >
            <option value="">Select an occupation</option>
            {OCCUPATION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </Select>
          {fieldErrors.occupation ? (
            <p className="mt-1.5 text-sm text-red-500">
              {fieldErrors.occupation}
            </p>
          ) : null}
        </div>
        <Input
          label="Annual salary (USD)"
          placeholder="120000"
          inputMode="numeric"
          value={values.annualSalary}
          onChange={(event) =>
            setField("annualSalary", event.target.value.replace(/\D/g, ""))
          }
          error={fieldErrors.annualSalary}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--widget-fg,#1e293b)]">
            Account purpose
          </label>
          <Select
            value={values.accountPurpose}
            onChange={(event) =>
              setField("accountPurpose", event.target.value)
            }
          >
            {ACCOUNT_PURPOSE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Expected monthly volume (USD)"
          placeholder="2500"
          inputMode="numeric"
          value={values.expectedMonthlyVolume}
          onChange={(event) =>
            setField(
              "expectedMonthlyVolume",
              event.target.value.replace(/\D/g, ""),
            )
          }
          error={fieldErrors.expectedMonthlyVolume}
        />
      </div>

      <div>
        <div className="flex items-center gap-3">
          <input
            id="tos"
            type="checkbox"
            checked={values.isTermsOfServiceAccepted}
            onChange={(event) =>
              setField("isTermsOfServiceAccepted", event.target.checked)
            }
          />
          <label htmlFor="tos" className="text-sm text-(--brand-fg)">
            I accept the Terms of Service
          </label>
        </div>
        {fieldErrors.isTermsOfServiceAccepted ? (
          <p className="mt-1.5 text-sm text-red-500">
            {fieldErrors.isTermsOfServiceAccepted}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={fillWithTestData}
          className="text-xs text-(--brand-muted) underline hover:text-(--brand-accent)"
        >
          Prefill sample data
        </button>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit application"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
