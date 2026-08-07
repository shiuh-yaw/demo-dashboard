/**
 * The two roles a picker may assign, with what each one actually permits.
 *
 * Shared by "add a member" and the roster's role picker so the same words
 * describe the same grant in both places - the descriptions are the only
 * explanation of the member/signer split a reader gets at the point of choosing.
 *
 * `owner` is absent: it moves by `transferBusinessAccountOwnership`, never by
 * assignment.
 */

import type { SelectMenuOption } from "@dynamic-demos/ui";
import type { AssignableRole } from "@/lib/dynamic";

export const ROLE_OPTIONS: ReadonlyArray<SelectMenuOption<AssignableRole>> = [
  { value: "viewer", label: "Viewer", description: "Read-only" },
  {
    value: "admin",
    label: "Admin",
    description: "Manage members, signers, wallet links",
  },
];
