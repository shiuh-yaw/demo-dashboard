// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Same reason as `analytics/__tests__/catalog-funnel.test.tsx`: importing the
// real droplet bundle fails strict Node ESM resolution under Vitest. Stub only
// the primitives this table uses. The DropdownMenu stub renders its content
// inline so menu items are queryable without driving a portal.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/components/droplet-client", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Spinner: () => <span>loading</span>,
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: { children: React.ReactNode }) => (
    <tr {...rest}>{children}</tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children, ...rest }: { children: React.ReactNode }) => (
    <td {...rest}>{children}</td>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <button
      type="button"
      disabled={disabled}
      // The real content is portaled out of the row; this stub renders inline,
      // so stop the click here or it bubbles to the row's navigation handler.
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {children}
    </button>
  ),
}));

import { ContactsTable } from "../contacts-table";
import type { ContactView } from "@/lib/services";

afterEach(() => {
  cleanup();
});

function contact(overrides: Partial<ContactView> = {}): ContactView {
  return {
    key: "jo@acme.com",
    email: "jo@acme.com",
    company: null,
    firstSeenAt: "2026-07-20T10:00:00.000Z",
    lastSeenAt: "2026-07-22T10:00:00.000Z",
    sessionCount: 2,
    demoSlugs: ["wallet"],
    ...overrides,
  };
}

const FULL_COMPANY = {
  name: "Acme Bank",
  domain: "acme.com",
  industry: "Banking",
  sizeBand: "1001-5000",
  summary: "Retail bank serving the US Midwest.",
};

function renderTable(props: Partial<Parameters<typeof ContactsTable>[0]> = {}) {
  return render(
    <ContactsTable
      contacts={[contact()]}
      emptyTitle="none"
      emptyDescription="none"
      {...props}
    />,
  );
}

describe("ContactsTable company surfaces", () => {
  it("opens the contact detail page when a row is clicked", () => {
    renderTable({ contacts: [contact()] });

    fireEvent.click(screen.getByRole("link", { name: /Open jo@acme.com/ }));

    // The key is an email - it has to survive as a single path segment.
    expect(push).toHaveBeenCalledWith("/dashboard/contacts/jo%40acme.com");
  });

  it("opening the actions menu does not navigate", () => {
    push.mockClear();
    renderTable({
      contacts: [contact()],
      onEnrich: async () => ({ status: "miss" as const }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enrich company/ }));

    expect(push).not.toHaveBeenCalled();
  });

  it("shows the company name in the Company column", () => {
    renderTable({ contacts: [contact({ company: FULL_COMPANY })] });
    expect(screen.getAllByText("Acme Bank").length).toBeGreaterThan(0);
  });



  it("explains a miss instead of silently showing nothing", async () => {
    renderTable({
      contacts: [contact()],
      onEnrich: async () => ({ status: "miss" as const }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enrich company/ }));
    await waitFor(() =>
      expect(screen.getByText("No confident match")).toBeDefined(),
    );
  });

  it("offers no actions menu when there is nothing to do", () => {
    // A menu whose only item is disabled is noise on every anonymous row.
    renderTable({
      contacts: [contact({ key: "anon_1", email: null })],
      onEnrich: async () => ({ status: "ineligible" as const }),
    });

    expect(screen.queryByRole("button", { name: /Contact actions/ })).toBeNull();
  });

  it("offers no actions menu once a company is resolved", () => {
    renderTable({
      contacts: [contact({ company: FULL_COMPANY })],
      onEnrich: async () => ({ status: "miss" as const }),
    });

    expect(screen.queryByRole("button", { name: /Contact actions/ })).toBeNull();
  });
});
