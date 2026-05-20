"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  DropdownFilter,
  type DropdownOption,
} from "@/components/ui/DropdownFilter";
import { FilterBar, SearchInput } from "@/components/ui/filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TableColumn } from "@/lib/types";

type UserRole = "Owner" | "Admin" | "Staff" | "User";
type UserStatus = "Active" | "Disabled";

type UserRow = {
  id: string;
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
};

type UserFormState = {
  id: string;
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  role: Exclude<UserRole, "Owner">;
  status: UserStatus;
  password: string;
  confirmPassword: string;
};

const initialUsers: UserRow[] = [
  {
    id: "usr-1",
    fullName: "Khant Zayar",
    phoneCountryCode: "+95",
    phoneNumber: "9780760624",
    email: "owner@flowbit.local",
    role: "Owner",
    status: "Active",
    phoneVerified: true,
    emailVerified: true,
    createdAt: "2026-06-01",
  },
  {
    id: "usr-2",
    fullName: "Admin One",
    phoneCountryCode: "+95",
    phoneNumber: "9111111111",
    email: "admin@flowbit.local",
    role: "Admin",
    status: "Active",
    phoneVerified: true,
    emailVerified: false,
    createdAt: "2026-06-10",
  },
  {
    id: "usr-3",
    fullName: "Staff One",
    phoneCountryCode: "+95",
    phoneNumber: "9222222222",
    email: "staff@flowbit.local",
    role: "Staff",
    status: "Active",
    phoneVerified: true,
    emailVerified: false,
    createdAt: "2026-06-12",
  },
  {
    id: "usr-4",
    fullName: "Flow Test User",
    phoneCountryCode: "+95",
    phoneNumber: "9777777777",
    email: "test@example.com",
    role: "User",
    status: "Active",
    phoneVerified: false,
    emailVerified: false,
    createdAt: "2026-06-30",
  },
];

const roleFilterOptions: DropdownOption[] = [
  { label: "All", value: "All" },
  { label: "Owner", value: "Owner" },
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
  { label: "User", value: "User" },
];

const statusFilterOptions: DropdownOption[] = [
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Disabled", value: "Disabled" },
];

const verificationOptions: DropdownOption[] = [
  { label: "All", value: "All" },
  { label: "Phone Verified", value: "Phone Verified" },
  { label: "Email Verified", value: "Email Verified" },
];

const countryCodeOptions: DropdownOption[] = [
  { label: "+95 Myanmar", value: "+95" },
  { label: "+66 Thailand", value: "+66" },
  { label: "+65 Singapore", value: "+65" },
];

const formRoleOptions: DropdownOption[] = [
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
  { label: "Test User / Manual User", value: "User" },
];

const formStatusOptions: DropdownOption[] = [
  { label: "Active", value: "Active" },
  { label: "Disabled", value: "Disabled" },
];

const emptyFormState: UserFormState = {
  id: "",
  fullName: "",
  phoneCountryCode: "+95",
  phoneNumber: "",
  email: "",
  role: "User",
  status: "Active",
  password: "",
  confirmPassword: "",
};

const drawerInputClassName =
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

function roleTone(role: UserRole) {
  switch (role) {
    case "Owner":
      return "info";
    case "Admin":
      return "success";
    case "Staff":
      return "warning";
    case "User":
      return "neutral";
  }
}

export function UserManagementScreen() {
  const [rows, setRows] = useState<UserRow[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "view" | null>(null);
  const [formState, setFormState] = useState<UserFormState>(emptyFormState);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [formError, setFormError] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const searchable = `${row.fullName} ${row.phoneCountryCode}${row.phoneNumber} ${row.email}`.toLowerCase();
      const matchesSearch =
        searchTerm.trim() === "" || searchable.includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "All" || row.role === roleFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesVerification =
        verificationFilter === "All" ||
        (verificationFilter === "Phone Verified" && row.phoneVerified) ||
        (verificationFilter === "Email Verified" && row.emailVerified);
      return matchesSearch && matchesRole && matchesStatus && matchesVerification;
    });
  }, [rows, roleFilter, searchTerm, statusFilter, verificationFilter]);

  const summary = useMemo(() => {
    const totalUsers = rows.length;
    const admins = rows.filter((row) => row.role === "Admin").length;
    const staff = rows.filter((row) => row.role === "Staff").length;
    const activeUsers = rows.filter((row) => row.status === "Active").length;
    const disabledUsers = rows.filter((row) => row.status === "Disabled").length;
    return [
      { title: "Total Users", value: `${totalUsers}`, detail: "All operator and test user accounts." },
      { title: "Admins", value: `${admins}`, detail: "Owner-created admin accounts." },
      { title: "Staff", value: `${staff}`, detail: "Staff operator accounts." },
      { title: "Active Users", value: `${activeUsers}`, detail: "Accounts currently enabled." },
      { title: "Disabled Users", value: `${disabledUsers}`, detail: "Accounts currently blocked." },
    ];
  }, [rows]);

  function openCreateDrawer() {
    setSelectedUser(null);
    setFormError("");
    setFormState({
      ...emptyFormState,
      id: `usr-${Date.now()}`,
    });
    setDrawerMode("create");
  }

  function openUser(row: UserRow) {
    setSelectedUser(row);
    setFormError("");
    if (row.role === "Owner") {
      setDrawerMode("view");
      return;
    }

    setFormState({
      id: row.id,
      fullName: row.fullName,
      phoneCountryCode: row.phoneCountryCode,
      phoneNumber: row.phoneNumber,
      email: row.email,
      role: row.role,
      status: row.status,
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

  function saveUser() {
    if (
      !formState.fullName.trim() ||
      !formState.phoneNumber.trim() ||
      !formState.email.trim()
    ) {
      setFormError("Full name, phone number, and email are required.");
      return;
    }

    if (drawerMode === "create" && (!formState.password.trim() || !formState.confirmPassword.trim())) {
      setFormError("Password and confirm password are required for new users.");
      return;
    }

    if (formState.password || formState.confirmPassword) {
      if (formState.password !== formState.confirmPassword) {
        setFormError("Password and confirm password must match.");
        return;
      }
    }

    setFormError("");

    const nextRow: UserRow = {
      id: formState.id,
      fullName: formState.fullName.trim(),
      phoneCountryCode: formState.phoneCountryCode,
      phoneNumber: formState.phoneNumber.trim(),
      email: formState.email.trim(),
      role: formState.role,
      status: formState.status,
      phoneVerified: drawerMode === "create" ? false : selectedUser?.phoneVerified ?? false,
      emailVerified: drawerMode === "create" ? false : selectedUser?.emailVerified ?? false,
      createdAt: drawerMode === "create" ? "2026-06-30" : selectedUser?.createdAt ?? "2026-06-30",
    };

    setRows((current) => {
      if (drawerMode === "create") {
        return [nextRow, ...current];
      }
      return current.map((row) => (row.id === nextRow.id ? nextRow : row));
    });

    closeDrawer();
  }

  function updateSelectedStatus(status: UserStatus) {
    if (!selectedUser) return;
    const nextUser = { ...selectedUser, status };
    setRows((current) => current.map((row) => (row.id === nextUser.id ? nextUser : row)));
    setSelectedUser(nextUser);
    setFormState((current) => ({ ...current, status }));
  }

  const columns: TableColumn<UserRow>[] = [
    {
      key: "fullName",
      header: "Name",
      className: "min-w-[180px]",
      render: (row) => <span className="font-semibold">{row.fullName}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      className: "whitespace-nowrap",
      render: (row) => `${row.phoneCountryCode}${row.phoneNumber}`,
    },
    {
      key: "email",
      header: "Email",
      className: "min-w-[220px]",
      render: (row) => row.email,
    },
    {
      key: "role",
      header: "Role",
      className: "whitespace-nowrap",
      render: (row) => <StatusBadge status={roleTone(row.role)}>{row.role}</StatusBadge>,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.status === "Active" ? "success" : "danger"}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "phoneVerified",
      header: "Phone Verified",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.phoneVerified ? "success" : "neutral"}>
          {row.phoneVerified ? "Yes" : "No"}
        </StatusBadge>
      ),
    },
    {
      key: "emailVerified",
      header: "Email Verified",
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={row.emailVerified ? "success" : "neutral"}>
          {row.emailVerified ? "Yes" : "No"}
        </StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      className: "whitespace-nowrap",
      render: (row) => row.createdAt,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[110px] whitespace-nowrap text-right",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => openUser(row)}
        >
          {row.role === "Owner" ? "View" : "Edit"}
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-5 pt-1">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-foreground)]">
              User Management
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Create and manage Flowbit operator and test user accounts.
            </p>
          </div>
          <ActionButton className="shrink-0" onClick={openCreateDrawer}>
            Create User
          </ActionButton>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summary.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {item.title}
              </p>
              <p className="mt-2.5 text-[26px] font-semibold tracking-tight text-[var(--color-foreground)]">
                {item.value}
              </p>
              <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-foreground)]">
                {item.detail}
              </p>
            </article>
          ))}
        </section>

        <FilterBar>
          <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <FilterField label="Search">
              <SearchInput
                placeholder="Search by name, phone, or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </FilterField>
            <FilterField label="Role">
              <DropdownFilter
                label="Role"
                options={roleFilterOptions}
                selectedValue={roleFilter}
                onChange={setRoleFilter}
                placeholder="All"
              />
            </FilterField>
            <FilterField label="Status">
              <DropdownFilter
                label="Status"
                options={statusFilterOptions}
                selectedValue={statusFilter}
                onChange={setStatusFilter}
                placeholder="All"
              />
            </FilterField>
            <FilterField label="Verification">
              <DropdownFilter
                label="Verification"
                options={verificationOptions}
                selectedValue={verificationFilter}
                onChange={setVerificationFilter}
                placeholder="All"
              />
            </FilterField>
          </div>
        </FilterBar>

        <DataTable
          title="Users"
          description="Owner-managed operator accounts and manually created test users."
          columns={columns}
          rows={filteredRows}
          tableClassName="min-w-[1180px] table-auto"
        />
      </div>

      <DetailDrawer
        open={drawerMode !== null}
        title={
          drawerMode === "create"
            ? "Create User"
            : drawerMode === "edit"
              ? "Edit User"
              : "User Detail"
        }
        subtitle={
          drawerMode === "view"
            ? "Owner account details are read-only from this screen."
            : "Owner accounts must be created manually by system administrator."
        }
        onClose={closeDrawer}
      >
        {drawerMode === "view" && selectedUser ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Full Name
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                  {selectedUser.fullName}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Role
                </p>
                <div className="mt-2">
                  <StatusBadge status={roleTone(selectedUser.role)}>{selectedUser.role}</StatusBadge>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Phone
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                  {selectedUser.phoneCountryCode}
                  {selectedUser.phoneNumber}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Email
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                  {selectedUser.email}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4">
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Owner accounts must be created manually by system administrator and cannot be edited from User Management.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4">
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Owner accounts must be created manually by system administrator. Public normal users still register from /register.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Full Name</FieldLabel>
                <input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, fullName: event.target.value }))
                  }
                  className={drawerInputClassName}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Email</FieldLabel>
                <input
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className={drawerInputClassName}
                  placeholder="name@flowbit.local"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Phone Country Code</FieldLabel>
                <DropdownFilter
                  label="Phone Country Code"
                  options={countryCodeOptions}
                  selectedValue={formState.phoneCountryCode}
                  onChange={(value) =>
                    setFormState((current) => ({ ...current, phoneCountryCode: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Phone Number</FieldLabel>
                <input
                  value={formState.phoneNumber}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                  className={drawerInputClassName}
                  placeholder="9 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel helper="User role creates a Test User / Manual User account.">
                  Role
                </FieldLabel>
                <DropdownFilter
                  label="Role"
                  options={formRoleOptions}
                  selectedValue={formState.role}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      role: value as UserFormState["role"],
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Status</FieldLabel>
                <DropdownFilter
                  label="Status"
                  options={formStatusOptions}
                  selectedValue={formState.status}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      status: value as UserStatus,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Password</FieldLabel>
                <input
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  className={drawerInputClassName}
                  placeholder={drawerMode === "edit" ? "Leave blank to keep current password" : "Create password"}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Confirm Password</FieldLabel>
                <input
                  type="password"
                  value={formState.confirmPassword}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  className={drawerInputClassName}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            {formError ? (
              <div className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-4 py-3 text-sm text-[var(--badge-danger-fg)]">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--color-border)] pt-5">
              <div className="flex flex-wrap gap-3">
                {drawerMode === "edit" ? (
                  <>
                    <ActionButton
                      variant="secondary"
                      onClick={() =>
                        updateSelectedStatus(formState.status === "Active" ? "Disabled" : "Active")
                      }
                    >
                      {formState.status === "Active" ? "Disable User" : "Reactivate User"}
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      Reset Password
                    </ActionButton>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton variant="secondary" onClick={closeDrawer}>
                  Cancel
                </ActionButton>
                <ActionButton onClick={saveUser}>Save User</ActionButton>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmModal
        open={resetPasswordOpen}
        title="Reset Password?"
        description="This will reset the selected user password in mock state only."
        confirmLabel="Reset Password"
        onClose={() => setResetPasswordOpen(false)}
        onConfirm={() => {
          setFormState((current) => ({ ...current, password: "", confirmPassword: "" }));
          setResetPasswordOpen(false);
        }}
      >
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3.5 text-sm text-[var(--color-muted-foreground)]">
          {selectedUser ? `${selectedUser.fullName} (${selectedUser.email})` : "Selected user"}
        </div>
      </ConfirmModal>
    </>
  );
}
