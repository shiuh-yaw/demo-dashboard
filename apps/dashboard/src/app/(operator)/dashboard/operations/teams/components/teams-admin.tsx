"use client";

/**
 * Teams + roles admin surface (Phase GTM-07). Thin client over the Phase
 * GTM-04 server actions; the server re-checks every mutation. Role selects
 * present all values - the server rejects any the canSetRole matrix forbids.
 *
 * Layout: a Teams table (drill into one team's members via a Sheet, never all
 * teams inline) plus a separate Workspace roles table. Scales as teams grow.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  UnsavedChangesBar,
} from "@/components/droplet-client";
import { SettingsSection } from "@/components/settings-section";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { THIN_SCROLLBAR } from "@/components/shared/thin-scrollbar";
import { NO_AUTOFILL } from "@/lib/no-autofill";
import {
  addTeamMember,
  createTeam,
  listTeamMembers,
  listTeams,
  listWorkspaceUsers,
  removeTeamMember,
  setTeamMembershipRole,
} from "@/lib/actions/teams";
import { setUserRole } from "@/lib/actions/users";
import { keys } from "@/lib/query/keys";
import { useInfiniteList } from "@/lib/query/use-infinite-list";
import { toastSuccess, toastError } from "@/lib/toast";
import type { AdminUserView, TeamMemberView } from "@/lib/actions/team-views";
import type { Page, UserRole } from "@/lib/services";

export interface TeamWithMembers {
  id: string;
  name: string;
  slug: string;
  members: TeamMemberView[];
}

export interface TeamsAdminProps {
  /** First page, SSR-seeded - see `operations/page.tsx`. */
  initialTeamsPage: Page<TeamWithMembers>;
  /** First page, SSR-seeded - see `operations/page.tsx`. */
  initialUsersPage: Page<AdminUserView>;
  actorRole: UserRole;
}

const ROLES: UserRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

function label(u: { displayName: string | null; email: string }): string {
  return u.displayName ?? u.email;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves one cursor page of teams to `TeamWithMembers` via
 * `listTeamMembers` per team - not the SSR page's `usersById` map, so
 * client-loaded pages resolve member identities correctly even for users
 * outside the first Workspace Roles page.
 */
async function fetchTeamsPage(
  cursor: string | null,
): Promise<Page<TeamWithMembers>> {
  const result = await listTeams({ cursor });
  if (!result.success) throw new Error(result.error);
  const items = await Promise.all(
    result.data.items.map(async (team) => {
      const membersResult = await listTeamMembers(team.id);
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        members: membersResult.success ? membersResult.data : [],
      };
    }),
  );
  return { items, nextCursor: result.data.nextCursor };
}

async function fetchUsersPage(
  cursor: string | null,
): Promise<Page<AdminUserView>> {
  const result = await listWorkspaceUsers({ cursor });
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function TeamsAdmin({
  initialTeamsPage,
  initialUsersPage,
}: TeamsAdminProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [roleQuery, setRoleQuery] = useState("");
  // Locks a single Workspace Roles row while its own role change is in
  // flight - only this row disables, not the whole table.
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const {
    items: teams,
    hasNextPage: hasMoreTeams,
    isFetchingNextPage: isFetchingMoreTeams,
    fetchNextPage: fetchMoreTeams,
  } = useInfiniteList<TeamWithMembers>({
    queryKey: keys.adminTeams.list(),
    fetchPage: fetchTeamsPage,
    initialPage: initialTeamsPage,
  });

  const {
    items: users,
    hasNextPage: hasMoreUsers,
    isFetchingNextPage: isFetchingMoreUsers,
    fetchNextPage: fetchMoreUsers,
  } = useInfiniteList<AdminUserView>({
    queryKey: keys.adminUsers.list(),
    fetchPage: fetchUsersPage,
    initialPage: initialUsersPage,
  });

  // Staged Team Role edits (Team Members table only, not Workspace Roles): userId -> newly picked role.
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  // Locks only the rows currently being saved, mirroring pendingUserId above.
  const [savingRoleIds, setSavingRoleIds] = useState<Set<string>>(new Set());
  const hasRoleChanges = Object.keys(pendingRoles).length > 0;
  const isSavingRoles = savingRoleIds.size > 0;

  // Derive from the live `teams` so the Sheet reflects the latest members
  // after a router.refresh, not a stale snapshot captured on open.
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  // Clears staged role edits on open/close/switch so they never leak across teams.
  function openTeam(teamId: string | null) {
    setPendingRoles({});
    setSavingRoleIds(new Set());
    setSelectedTeamId(teamId);
  }

  function stageRoleChange(member: TeamMemberView, role: UserRole) {
    setPendingRoles((prev) => {
      const next = { ...prev };
      if (role === member.role) delete next[member.userId];
      else next[member.userId] = role;
      return next;
    });
  }

  function resetRoleChanges() {
    if (isSavingRoles) return;
    setPendingRoles({});
  }

  async function saveRoleChanges() {
    if (isSavingRoles || !selectedTeam) return;
    const teamId = selectedTeam.id;
    const entries = Object.entries(pendingRoles) as [string, UserRole][];
    if (entries.length === 0) return;

    setSavingRoleIds(new Set(entries.map(([userId]) => userId)));
    const failures: string[] = [];
    for (const [userId, role] of entries) {
      const member = selectedTeam.members.find((m) => m.userId === userId);
      const result = await setTeamMembershipRole(userId, teamId, role);
      if (result.success) {
        setPendingRoles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        failures.push(
          result.error ?? `Failed to update role${member ? ` for ${label(member)}` : ""}`,
        );
      }
    }
    setSavingRoleIds(new Set());
    // The `useInfiniteList` cache was seeded once from SSR/prior fetches -
    // it doesn't pick up new props on its own, so a saved role change needs
    // an explicit invalidation alongside the router.refresh() that keeps the
    // rest of the operator shell (e.g. the team switcher) current.
    void queryClient.invalidateQueries({ queryKey: keys.adminTeams.all });
    router.refresh();

    if (failures.length === 1) toastError(failures[0]);
    else if (failures.length > 1) toastError(`${failures.length} role changes failed to save`);
  }

  function run(
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMessage?: string,
    onSettled?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.success) {
          const message = result.error ?? "Action failed";
          setError(message);
          toastError(message);
        } else {
          if (successMessage) toastSuccess(successMessage);
          // Same cache-vs-props gap as saveRoleChanges above: every mutation
          // here can touch team membership and/or workspace roles, so
          // invalidate both infinite lists rather than tracking per-action.
          void queryClient.invalidateQueries({ queryKey: keys.adminTeams.all });
          void queryClient.invalidateQueries({ queryKey: keys.adminUsers.all });
          router.refresh();
        }
      } finally {
        onSettled?.();
      }
    });
  }

  function handleRoleChange(u: AdminUserView, role: UserRole) {
    setPendingUserId(u.id);
    run(
      () => setUserRole(u.id, role),
      "Role Updated",
      () => setPendingUserId(null),
    );
  }

  const filteredUsers = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [users, roleQuery]);

  return (
    <div>
      {error && (
        <p className="mb-6 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <SettingsSection
        title="Teams"
        description="Workspaces that group prospects and members."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Team
          </Button>
        }
      >
        {teams.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No teams yet. Create one to start grouping prospects.
          </p>
        ) : (
          <div className={`overflow-x-auto rounded-lg border border-border-divider ${THIN_SCROLLBAR}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[100px] text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => openTeam(t.id)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {t.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.slug}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.members.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {hasMoreTeams && (
          <div className="flex justify-center pt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={isFetchingMoreTeams}
              onClick={() => fetchMoreTeams()}
            >
              {isFetchingMoreTeams ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Workspace Roles"
        description="Each member's global role. Team roles are set per team above."
      >
        <Input
          placeholder="Filter by email"
          value={roleQuery}
          onChange={(e) => setRoleQuery(e.target.value)}
          className="max-w-xs"
          {...NO_AUTOFILL}
        />
        <div className={`overflow-x-auto rounded-lg border border-border-divider ${THIN_SCROLLBAR}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="w-[160px]">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No users match that filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {label(u)}
                      </span>
                      {u.displayName && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* value stays bound to server state (u.role) - never an
                            optimistic local value - so it only ever changes once,
                            on the post-resolve re-render; disabled the whole time
                            it would otherwise be able to bounce. */}
                        <Select
                          value={u.role}
                          disabled={pendingUserId === u.id}
                          onValueChange={(role) =>
                            handleRoleChange(u, role as UserRole)
                          }
                        >
                          <SelectTrigger
                            className="w-36"
                            aria-label={`Role for ${label(u)}`}
                            disabled={pendingUserId === u.id}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {pendingUserId === u.id && (
                          <span role="status" className="inline-flex">
                            <Spinner size="sm" />
                            <span className="sr-only">
                              Updating role for {label(u)}
                            </span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMoreUsers && (
          <div className="flex justify-center pt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={isFetchingMoreUsers}
              onClick={() => fetchMoreUsers()}
            >
              {isFetchingMoreUsers ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </SettingsSection>

      <Sheet
        open={selectedTeam !== null}
        onOpenChange={(open) => !open && openTeam(null)}
      >
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedTeam?.name ?? "Team"}</SheetTitle>
            <SheetDescription>
              Manage this team's members and their roles.
            </SheetDescription>
          </SheetHeader>
          {selectedTeam && (
            <div className="px-4 pb-6">
              <TeamMembers
                team={selectedTeam}
                users={users}
                pending={pending}
                run={run}
                pendingRoles={pendingRoles}
                savingRoleIds={savingRoleIds}
                onStageRole={stageRoleChange}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Stays outside the Sheet - nested here it would inherit the slide transform and lose fixed positioning. */}
      <UnsavedChangesBar
        hasChanges={hasRoleChanges}
        onSave={() => void saveRoleChanges()}
        onReset={resetRoleChanges}
      />

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={pending}
        onCreate={(name, slug) =>
          run(async () => {
            const r = await createTeam(name, slug);
            if (r.success) setCreateOpen(false);
            return r;
          }, "Team Created")
        }
      />
    </div>
  );
}

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onCreate: (name: string, slug: string) => void;
}

function CreateTeamDialog({
  open,
  onOpenChange,
  pending,
  onCreate,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function reset() {
    setName("");
    setSlug("");
    setSlugEdited(false);
  }

  function handleOpenChange(next: boolean) {
    // Clear on close (cancel or a successful create both close the dialog) so
    // stale values never linger on reopen.
    if (!next) reset();
    onOpenChange(next);
  }

  function onName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            A team groups prospects and members so teammates can see each
            other's prospects and shared demos.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form
            id="create-team-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(name, slug);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => onName(e.target.value)}
                placeholder="Acme GTM"
                disabled={pending}
                autoFocus
                {...NO_AUTOFILL}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-slug">Slug</Label>
              <Input
                id="team-slug"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="acme-gtm"
                disabled={pending}
                {...NO_AUTOFILL}
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-team-form"
            size="sm"
            loading={pending}
            disabled={pending || !name || !slug}
          >
            {pending ? "Creating..." : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TeamMembersProps {
  team: TeamWithMembers;
  users: AdminUserView[];
  pending: boolean;
  run: (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMessage?: string,
  ) => void;
  /** Staged Team Role edits owned by the parent, keyed by userId. */
  pendingRoles: Record<string, UserRole>;
  /** userIds currently mid-save, disables just those rows. */
  savingRoleIds: Set<string>;
  onStageRole: (member: TeamMemberView, role: UserRole) => void;
}

function TeamMembers({
  team,
  users,
  pending,
  run,
  pendingRoles,
  savingRoleIds,
  onStageRole,
}: TeamMembersProps) {
  const memberIds = new Set(team.members.map((m) => m.userId));
  const candidates = users.filter((u) => !memberIds.has(u.id));
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<UserRole>("MEMBER");

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-4">
      <div className={`overflow-x-auto rounded-lg border border-border-divider ${THIN_SCROLLBAR}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="w-[160px]">Team Role</TableHead>
              <TableHead className="w-[80px] text-right">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No members yet.
                </TableCell>
              </TableRow>
            ) : (
              team.members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium text-foreground">
                    {label(m)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* value reflects the staged pick if one exists, else the server role - selecting only stages; Save (UnsavedChangesBar) commits it. */}
                      <Select
                        value={pendingRoles[m.userId] ?? m.role}
                        disabled={savingRoleIds.has(m.userId)}
                        onValueChange={(role) =>
                          onStageRole(m, role as UserRole)
                        }
                      >
                        <SelectTrigger
                          className="w-36"
                          aria-label={`Team role for ${label(m)}`}
                          disabled={savingRoleIds.has(m.userId)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {savingRoleIds.has(m.userId) && (
                        <span role="status" className="inline-flex">
                          <Spinner size="sm" />
                          <span className="sr-only">
                            Saving role for {label(m)}
                          </span>
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={ICON_ACTION}
                          aria-label={`Remove ${label(m)}`}
                          onClick={() =>
                            run(
                              () => removeTeamMember(m.userId, team.id),
                              "Member Removed",
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      {/* side="left": rightmost column, Radix collision detection keeps it clear of the Sheet edge */}
                      <TooltipContent side="left">Remove member</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* picker flexes to fill the row width, matching the table above; Role stays fixed, Add trails */}
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label>Add Member</Label>
          <UserPicker
            candidates={candidates}
            value={addUserId}
            onChange={setAddUserId}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={addRole} onValueChange={(r) => setAddRole(r as UserRole)}>
            <SelectTrigger className="w-36" aria-label="Role for new member">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          disabled={pending || !addUserId}
          onClick={() =>
            run(async () => {
              const r = await addTeamMember(addUserId, team.id, addRole);
              if (r.success) setAddUserId("");
              return r;
            }, "Member Added")
          }
        >
          Add
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}

interface UserPickerProps {
  candidates: AdminUserView[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Searchable user combobox - type to filter a long user list by email/name.
 * Renders an inline, non-portaled panel (not a Radix Popover): this picker
 * lives inside the teams admin Sheet, whose own FocusScope fights a second,
 * portaled focus scope and leaves the search input clickable but untypeable.
 * Rendering the panel in the same subtree keeps one focus scope only.
 */
function UserPicker({ candidates, value, onChange }: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = candidates.find((u) => u.id === value) ?? null;
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [candidates, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors hover:bg-accent/50"
        aria-label="Select a user to add"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={candidates.length === 0}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {candidates.length === 0
            ? "Everyone is a member"
            : selected
              ? label(selected)
              : "Select a user"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-elevated)]"
        >
          <div className="border-b border-border-divider p-2">
            <Input
              placeholder="Search by email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
              autoFocus
              {...NO_AUTOFILL}
            />
          </div>
          <div className={`max-h-56 overflow-y-auto p-1 ${THIN_SCROLLBAR}`}>
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                No users match.
              </p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={u.id === value}
                  onClick={() => {
                    onChange(u.id);
                    close();
                  }}
                  className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent/50"
                >
                  <span className="truncate font-medium text-foreground">
                    {label(u)}
                  </span>
                  {u.displayName && (
                    <span className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
