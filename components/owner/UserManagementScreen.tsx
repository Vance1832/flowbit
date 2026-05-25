"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createManagedUser,
  deactivateManagedUser,
  getManagedUsers,
  reactivateManagedUser,
  resetManagedUserPassword,
  updateManagedUser,
  type ApiManagedUser,
} from "@/lib/api/accounts";
import { ensureResults } from "@/lib/api/types";
import { formatDateOnly } from "@/lib/format";
import type { TableColumn } from "@/lib/types";

type UserRoleFilter = "all" | "owner" | "admin" | "staff" | "user";
type UserStatusFilter = "all" | "active" | "disabled";
type VerificationFilter = "all" | "phone_verified" | "email_verified";

type FormState = {
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  role: "admin" | "staff" | "user";
  status: "active" | "deactivated";
  password: string;
  confirmPassword: string;
};

const roleFilterOptions: DropdownOption[] = [
  { label: "All", value: "all" },
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "User", value: "user" },
];

const statusFilterOptions: DropdownOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Disabled", value: "disabled" },
];

const verificationOptions: DropdownOption[] = [
  { label: "All", value: "all" },
  { label: "Phone Verified", value: "phone_verified" },
  { label: "Email Verified", value: "email_verified" },
];

const countryCodeOptions: DropdownOption[] = [
  { label: "+95 Myanmar", value: "+95" },
  { label: "+66 Thailand", value: "+66" },
  { label: "+65 Singapore", value: "+65" },
];

const roleOptions: DropdownOption[] = [
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Test User / Manual User", value: "user" },
];

const statusOptions: DropdownOption[] = [
  { label: "Active", value: "active" },
  { label: "Disabled", value: "deactivated" },
];

const emptyFormState: FormState = {
  fullName: "",
  phoneCountryCode: "+95",
  phoneNumber: "",
  email: "",
  role: "user",
  status: "active",
  password: "",
  confirmPassword: "",
};

const inputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    default:
      return "User";
  }
}

function statusLabel(status: string) {
  return status === "active" ? "Active" : "Disabled";
}

function statusTone(status: string) {
  return status === "active" ? ("success" as const) : ("neutral" as const);
}

function roleTone(role: string) {
  switch (role) {
    case "owner":
      return "info" as const;
    case "admin":
      return "success" as const;
    case "staff":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  helper,
}: {
  children: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-[var(--color-foreground)]">
        {children}
      </span>
      {helper ? (
        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{helper}</p>
      ) : null}
    </div>
  );
}

export function UserManagementScreen() {
  const [users, setUsers] = useState<ApiManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "view" | null>(null);
  const [selectedUser, setSelectedUser] = useState<ApiManagedUser | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await getManagedUsers();
      setUsers(ensureResults(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue =
        `${user.name} ${user.phone} ${user.email ?? ""}`.toLowerCase();
      const normalizedStatus = user.status === "active" ? "active" : "disabled";
      const matchesSearch =
        searchTerm.trim() === "" || searchValue.includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
      const matchesVerification =
        verificationFilter === "all" ||
        (verificationFilter === "phone_verified" && user.phone_verified) ||
        (verificationFilter === "email_verified" && user.email_verified);
      return matchesSearch && matchesRole && matchesStatus && matchesVerification;
    });
  }, [users, searchTerm, roleFilter, statusFilter, verificationFilter]);

  const summaryCards = useMemo(() => {
    const totalUsers = users.length;
    const admins = users.filter((user) => user.role === "admin").length;
    const staff = users.filter((user) => user.role === "staff").length;
    const activeUsers = users.filter((user) => user.status === "active").length;
    const disabledUsers = users.filter((user) => user.status !== "active").length;

    return [
      { title: "Total Users", value: `${totalUsers}`, detail: "All operator and manual user accounts." },
      { title: "Admins", value: `${admins}`, detail: "Owner-created admin accounts." },
      { title: "Staff", value: `${staff}`, detail: "Staff operator accounts." },
      { title: "Active Users", value: `${activeUsers}`, detail: "Accounts currently enabled." },
      { title: "Disabled Users", value: `${disabledUsers}`, detail: "Accounts currently blocked." },
    ];
  }, [users]);

  function openCreateDrawer() {
    setSelectedUser(null);
    setFormState(emptyFormState);
    setFormError("");
    setDrawerMode("create");
  }

  function openUser(user: ApiManagedUser) {
    setSelectedUser(user);
    setFormError("");
    setMessage("");
    setResetPasswordForm({ password: "", confirmPassword: "" });

    if (user.role === "owner") {
      setDrawerMode("view");
      return;
    }

    setFormState({
      fullName: user.name,
      phoneCountryCode: user.phone_country_code,
      phoneNumber: user.phone_number,
      email: user.email ?? "",
      role: user.role === "admin" || user.role === "staff" ? user.role : "user",
      status: user.status === "active" ? "active" : "deactivated",
      password: "",
      confirmPassword: "",
    });
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedUser(null);
    setFormError("");
  }

  async function handleSave() {
    if (!formState.fullName.trim()) {
      setFormError("Full name is required.");
      return;
    }

    if (!formState.phoneCountryCode.startsWith("+")) {
      setFormError("Phone country code must start with +.");
      return;
    }

    if (!/^\+\d{1,4}$/.test(formState.phoneCountryCode.trim())) {
      setFormError("Phone country code must be 1 to 4 digits after +.");
      return;
    }

    if (!/^\d+$/.test(formState.phoneNumber.trim())) {
      setFormError("Phone number must contain digits only.");
      return;
    }

    const normalizedPhoneNumber = formState.phoneNumber.trim();
    const phoneDigits = normalizedPhoneNumber.startsWith("0")
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;

    if (phoneDigits.length < 7 || phoneDigits.length > 12) {
      setFormError("Phone number must be between 7 and 12 digits.");
      return;
    }

    if (drawerMode === "create") {
      if (!formState.password || !formState.confirmPassword) {
        setFormError("Password and confirm password are required.");
        return;
      }
      if (formState.password.length < 8) {
        setFormError("Password must be at least 8 characters.");
        return;
      }
      if (formState.password !== formState.confirmPassword) {
        setFormError("Password and confirm password must match.");
        return;
      }
    }

    setSaving(true);
    setFormError("");

    try {
      if (drawerMode === "create") {
        await createManagedUser({
          name: formState.fullName.trim(),
          phone_country_code: formState.phoneCountryCode.trim(),
          phone_number: normalizedPhoneNumber,
          email: formState.email.trim() || undefined,
          role: formState.role,
          status: formState.status,
          password: formState.password,
          confirm_password: formState.confirmPassword,
        });
        setMessage("User created successfully.");
      } else if (drawerMode === "edit" && selectedUser) {
        await updateManagedUser(selectedUser.id, {
          name: formState.fullName.trim(),
          phone_country_code: formState.phoneCountryCode.trim(),
          phone_number: normalizedPhoneNumber,
          email: formState.email.trim() || null,
          role: formState.role,
          status: formState.status,
        });
        setMessage("User updated successfully.");
      }

      await loadUsers();
      closeDrawer();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableUser() {
    if (!selectedUser) return;
    try {
      await deactivateManagedUser(selectedUser.id);
      setDisableOpen(false);
      setMessage("User disabled successfully.");
      await loadUsers();
      closeDrawer();
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "Unable to disable user.");
    }
  }

  async function handleReactivateUser() {
    if (!selectedUser) return;
    try {
      await reactivateManagedUser(selectedUser.id);
      setReactivateOpen(false);
      setMessage("User reactivated successfully.");
      await loadUsers();
      closeDrawer();
    } catch (actionError) {
      setFormError(
        actionError instanceof Error ? actionError.message : "Unable to reactivate user.",
      );
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (!resetPasswordForm.password || !resetPasswordForm.confirmPassword) {
      setFormError("New password and confirm password are required.");
      return;
    }
    if (resetPasswordForm.password.length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setFormError("New password and confirm password must match.");
      return;
    }

    try {
      await resetManagedUserPassword(selectedUser.id, {
        new_password: resetPasswordForm.password,
        confirm_password: resetPasswordForm.confirmPassword,
      });
      setResetPasswordOpen(false);
      setResetPasswordForm({ password: "", confirmPassword: "" });
      setMessage("Password reset successfully.");
    } catch (actionError) {
      setFormError(
        actionError instanceof Error ? actionError.message : "Unable to reset password.",
      );
    }
  }

  const columns: TableColumn<ApiManagedUser>[] = [
    {
      key: "name",
      header: "Name",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => row.phone,
    },
    {
      key: "email",
      header: "Email",
      className: "min-w-[220px]",
      render: (row) => row.email ?? "—",
    },
    {
      key: "role",
      header: "Role",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={roleTone(row.role)}>{roleLabel(row.role)}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>
          {statusLabel(row.status)}
        </StatusBadge>
      ),
    },
    {
      key: "phoneVerified",
      header: "Phone Verified",
      className: "whitespace-nowrap",
      render: (row) => (row.phone_verified ? "Yes" : "No"),
    },
    {
      key: "emailVerified",
      header: "Email Verified",
      className: "whitespace-nowrap",
      render: (row) => (row.email_verified ? "Yes" : "No"),
    },
    {
      key: "createdAt",
      header: "Created At",
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[120px] whitespace-nowrap text-right",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => openUser(row)}
        >
          {row.role === "owner" ? "View" : "Edit"}
        </button>
      ),
    },
  ];

  const viewUser = selectedUser;

  return (
    <>
      <div className="space-y-5 pt-1">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              User Management
            </h1>
          </div>
          <ActionButton className="h-11 rounded-xl px-5" onClick={openCreateDrawer}>
            Create User
          </ActionButton>
        </section>

        {message ? (
          <div className="rounded-2xl border border-[var(--badge-success-ring)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              delta="Users"
              tone="neutral"
              detail={card.detail}
            />
          ))}
        </section>

        <FilterBar>
          <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr]">
            <FilterField label="Search">
              <SearchInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, phone, or email"
              />
            </FilterField>
            <FilterField label="Role">
              <DropdownFilter
                label="Role"
                options={roleFilterOptions}
                selectedValue={roleFilter}
                onChange={(value) => setRoleFilter(value as UserRoleFilter)}
              />
            </FilterField>
            <FilterField label="Status">
              <DropdownFilter
                label="Status"
                options={statusFilterOptions}
                selectedValue={statusFilter}
                onChange={(value) => setStatusFilter(value as UserStatusFilter)}
              />
            </FilterField>
            <FilterField label="Verification">
              <DropdownFilter
                label="Verification"
                options={verificationOptions}
                selectedValue={verificationFilter}
                onChange={(value) => setVerificationFilter(value as VerificationFilter)}
              />
            </FilterField>
          </div>
        </FilterBar>

        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Create an admin, staff, or manual user account to start managing access."
            action={
              <ActionButton className="h-11 rounded-xl px-5" onClick={openCreateDrawer}>
                Create User
              </ActionButton>
            }
          />
        ) : (
          <DataTable
            title="Users"
            description="Owner accounts must be managed manually by system administrator."
            rows={filteredUsers}
            columns={columns}
            tableClassName="min-w-[1120px]"
          />
        )}
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        title={
          drawerMode === "create"
            ? "Create User"
            : drawerMode === "view"
              ? "User Detail"
              : "Edit User"
        }
        subtitle="Owner accounts must be created manually by system administrator."
      >
        <div className="space-y-5">
          <div className="grid gap-5">
            <div className="space-y-2">
              <FieldLabel>Full Name</FieldLabel>
              <input
                value={drawerMode === "view" ? viewUser?.name ?? "" : formState.fullName}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, fullName: event.target.value }))
                }
                className={inputClassName}
                disabled={drawerMode === "view"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)]">
              <div className="space-y-2">
                <FieldLabel>Phone Country Code</FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={viewUser?.phone_country_code ?? ""}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label="Phone Country Code"
                    options={countryCodeOptions}
                    selectedValue={formState.phoneCountryCode}
                    onChange={(value) =>
                      setFormState((current) => ({ ...current, phoneCountryCode: value }))
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel>Phone Number</FieldLabel>
                <input
                  value={drawerMode === "view" ? viewUser?.phone_number ?? "" : formState.phoneNumber}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                  className={inputClassName}
                  disabled={drawerMode === "view"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Email</FieldLabel>
              <input
                value={drawerMode === "view" ? viewUser?.email ?? "" : formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
                className={inputClassName}
                disabled={drawerMode === "view"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel helper="User creates a Test User / Manual User account.">
                  Role
                </FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={roleLabel(viewUser?.role ?? "user")}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label="Role"
                    options={roleOptions}
                    selectedValue={formState.role}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        role: value as FormState["role"],
                      }))
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel>Status</FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={statusLabel(viewUser?.status ?? "active")}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label="Status"
                    options={statusOptions}
                    selectedValue={formState.status}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        status: value as FormState["status"],
                      }))
                    }
                  />
                )}
              </div>
            </div>

            {drawerMode === "create" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>Password</FieldLabel>
                  <input
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, password: event.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Confirm Password</FieldLabel>
                  <input
                    type="password"
                    value={formState.confirmPassword}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </div>
              </div>
            ) : null}

            {drawerMode === "view" && viewUser ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Phone Verified
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                    {viewUser.phone_verified ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Email Verified
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                    {viewUser.email_verified ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Created At
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                    {formatDateOnly(viewUser.created_at)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {formError ? (
            <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
              {formError}
            </div>
          ) : null}

          {drawerMode === "view" ? (
            <ActionButton variant="secondary" onClick={closeDrawer}>
              Close
            </ActionButton>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {selectedUser ? (
                  <>
                    <ActionButton
                      variant="secondary"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      Reset Password
                    </ActionButton>
                    {selectedUser.status === "active" ? (
                      <ActionButton variant="danger" onClick={() => setDisableOpen(true)}>
                        Disable User
                      </ActionButton>
                    ) : (
                      <ActionButton
                        variant="secondary"
                        onClick={() => setReactivateOpen(true)}
                      >
                        Reactivate User
                      </ActionButton>
                    )}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="secondary" onClick={closeDrawer}>
                  Cancel
                </ActionButton>
                <ActionButton onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Saving..." : "Save User"}
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </DetailDrawer>

      <ConfirmModal
        open={resetPasswordOpen}
        title="Reset User Password"
        description="Set a new password for this account."
        confirmLabel="Reset Password"
        onConfirm={() => void handleResetPassword()}
        onClose={() => setResetPasswordOpen(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              New Password
            </label>
            <input
              type="password"
              value={resetPasswordForm.password}
              onChange={(event) =>
                setResetPasswordForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Confirm Password
            </label>
            <input
              type="password"
              value={resetPasswordForm.confirmPassword}
              onChange={(event) =>
                setResetPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={disableOpen}
        title="Disable User?"
        description="This account will be blocked from signing in until it is reactivated."
        confirmLabel="Disable User"
        tone="danger"
        onConfirm={() => void handleDisableUser()}
        onClose={() => setDisableOpen(false)}
      />

      <ConfirmModal
        open={reactivateOpen}
        title="Reactivate User?"
        description="This account will be allowed to sign in again."
        confirmLabel="Reactivate User"
        onConfirm={() => void handleReactivateUser()}
        onClose={() => setReactivateOpen(false)}
      />
    </>
  );
}
