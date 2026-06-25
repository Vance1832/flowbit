"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useTranslations } from "@/components/providers/LocaleProvider";
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

// role key → message key; role badge + labels map through this.
const ROLE_KEY: Record<string, string> = {
  owner: "userManagement.roleOwner",
  admin: "userManagement.roleAdmin",
  staff: "userManagement.roleStaff",
  user: "userManagement.roleUser",
};

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
  "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-emerald-700/30";

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
  const t = useTranslations();

  const roleLabel = (role: string) => t(ROLE_KEY[role] ?? "userManagement.roleUser");
  const statusLabel = (status: string) =>
    status === "active" ? t("userManagement.statusActive") : t("userManagement.statusDisabled");

  const roleFilterOptions: DropdownOption[] = [
    { label: t("filters.all"), value: "all" },
    { label: t("userManagement.roleOwner"), value: "owner" },
    { label: t("userManagement.roleAdmin"), value: "admin" },
    { label: t("userManagement.roleStaff"), value: "staff" },
    { label: t("userManagement.roleUser"), value: "user" },
  ];
  const statusFilterOptions: DropdownOption[] = [
    { label: t("filters.all"), value: "all" },
    { label: t("userManagement.statusActive"), value: "active" },
    { label: t("userManagement.statusDisabled"), value: "disabled" },
  ];
  const verificationOptions: DropdownOption[] = [
    { label: t("filters.all"), value: "all" },
    { label: t("userManagement.verifPhone"), value: "phone_verified" },
    { label: t("userManagement.verifEmail"), value: "email_verified" },
  ];
  const countryCodeOptions: DropdownOption[] = [
    { label: t("userManagement.country95"), value: "+95" },
    { label: t("userManagement.country66"), value: "+66" },
    { label: t("userManagement.country65"), value: "+65" },
  ];
  const roleOptions: DropdownOption[] = [
    { label: t("userManagement.roleAdmin"), value: "admin" },
    { label: t("userManagement.roleStaff"), value: "staff" },
    { label: t("userManagement.roleManualUser"), value: "user" },
  ];
  const statusOptions: DropdownOption[] = [
    { label: t("userManagement.statusActive"), value: "active" },
    { label: t("userManagement.statusDisabled"), value: "deactivated" },
  ];

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
      setError(loadError instanceof Error ? loadError.message : t("userManagement.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      { title: t("userManagement.cardTotal"), value: `${totalUsers}`, detail: t("userManagement.cardTotalDetail") },
      { title: t("userManagement.cardAdmins"), value: `${admins}`, detail: t("userManagement.cardAdminsDetail") },
      { title: t("userManagement.cardStaff"), value: `${staff}`, detail: t("userManagement.cardStaffDetail") },
      { title: t("userManagement.cardActive"), value: `${activeUsers}`, detail: t("userManagement.cardActiveDetail") },
      { title: t("userManagement.cardDisabled"), value: `${disabledUsers}`, detail: t("userManagement.cardDisabledDetail") },
    ];
  }, [users, t]);

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
      setFormError(t("userManagement.errFullName"));
      return;
    }

    if (!formState.phoneCountryCode.startsWith("+")) {
      setFormError(t("userManagement.errPhonePlus"));
      return;
    }

    if (!/^\+\d{1,4}$/.test(formState.phoneCountryCode.trim())) {
      setFormError(t("userManagement.errPhoneCode"));
      return;
    }

    if (!/^\d+$/.test(formState.phoneNumber.trim())) {
      setFormError(t("userManagement.errPhoneDigits"));
      return;
    }

    const normalizedPhoneNumber = formState.phoneNumber.trim();
    const phoneDigits = normalizedPhoneNumber.startsWith("0")
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;

    if (phoneDigits.length < 7 || phoneDigits.length > 12) {
      setFormError(t("userManagement.errPhoneLength"));
      return;
    }

    if (drawerMode === "create") {
      if (!formState.password || !formState.confirmPassword) {
        setFormError(t("userManagement.errPasswordRequired"));
        return;
      }
      if (formState.password.length < 8) {
        setFormError(t("userManagement.errPasswordLength"));
        return;
      }
      if (formState.password !== formState.confirmPassword) {
        setFormError(t("userManagement.errPasswordMatch"));
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
        setMessage(t("userManagement.createdSuccess"));
      } else if (drawerMode === "edit" && selectedUser) {
        await updateManagedUser(selectedUser.id, {
          name: formState.fullName.trim(),
          phone_country_code: formState.phoneCountryCode.trim(),
          phone_number: normalizedPhoneNumber,
          email: formState.email.trim() || null,
          role: formState.role,
          status: formState.status,
        });
        setMessage(t("userManagement.updatedSuccess"));
      }

      await loadUsers();
      closeDrawer();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t("userManagement.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableUser() {
    if (!selectedUser) return;
    try {
      await deactivateManagedUser(selectedUser.id);
      setDisableOpen(false);
      setMessage(t("userManagement.disabledSuccess"));
      await loadUsers();
      closeDrawer();
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : t("userManagement.disableError"));
    }
  }

  async function handleReactivateUser() {
    if (!selectedUser) return;
    try {
      await reactivateManagedUser(selectedUser.id);
      setReactivateOpen(false);
      setMessage(t("userManagement.reactivatedSuccess"));
      await loadUsers();
      closeDrawer();
    } catch (actionError) {
      setFormError(
        actionError instanceof Error ? actionError.message : t("userManagement.reactivateError"),
      );
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (!resetPasswordForm.password || !resetPasswordForm.confirmPassword) {
      setFormError(t("userManagement.errResetRequired"));
      return;
    }
    if (resetPasswordForm.password.length < 8) {
      setFormError(t("userManagement.errResetLength"));
      return;
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setFormError(t("userManagement.errResetMatch"));
      return;
    }

    try {
      await resetManagedUserPassword(selectedUser.id, {
        new_password: resetPasswordForm.password,
        confirm_password: resetPasswordForm.confirmPassword,
      });
      setResetPasswordOpen(false);
      setResetPasswordForm({ password: "", confirmPassword: "" });
      setMessage(t("userManagement.resetSuccess"));
    } catch (actionError) {
      setFormError(
        actionError instanceof Error ? actionError.message : t("userManagement.resetError"),
      );
    }
  }

  const columns: TableColumn<ApiManagedUser>[] = [
    {
      key: "name",
      header: t("userManagement.colName"),
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "phone",
      header: t("userManagement.colPhone"),
      className: "whitespace-nowrap",
      render: (row) => row.phone,
    },
    {
      key: "email",
      header: t("userManagement.colEmail"),
      className: "min-w-[220px]",
      render: (row) => row.email ?? "—",
    },
    {
      key: "role",
      header: t("userManagement.colRole"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={roleTone(row.role)}>{roleLabel(row.role)}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      className: "whitespace-nowrap",
      render: (row) => (
        <StatusBadge status={statusTone(row.status)}>
          {statusLabel(row.status)}
        </StatusBadge>
      ),
    },
    {
      key: "phoneVerified",
      header: t("userManagement.colPhoneVerified"),
      className: "whitespace-nowrap",
      render: (row) => (row.phone_verified ? t("userManagement.yes") : t("userManagement.no")),
    },
    {
      key: "emailVerified",
      header: t("userManagement.colEmailVerified"),
      className: "whitespace-nowrap",
      render: (row) => (row.email_verified ? t("userManagement.yes") : t("userManagement.no")),
    },
    {
      key: "createdAt",
      header: t("userManagement.colCreatedAt"),
      className: "whitespace-nowrap",
      render: (row) => formatDateOnly(row.created_at),
    },
    {
      key: "actions",
      header: t("userManagement.colActions"),
      className: "w-[120px] whitespace-nowrap text-right",
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
          onClick={() => openUser(row)}
        >
          {row.role === "owner" ? t("common.view") : t("userManagement.edit")}
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
              {t("userManagement.title")}
            </h1>
          </div>
          <ActionButton className="h-11 rounded-xl px-5" onClick={openCreateDrawer}>
            {t("userManagement.createUser")}
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
              delta={t("userManagement.cardDelta")}
              tone="neutral"
              detail={card.detail}
            />
          ))}
        </section>

        <FilterBar>
          <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr]">
            <FilterField label={t("userManagement.filterSearch")}>
              <SearchInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("userManagement.searchPlaceholder")}
              />
            </FilterField>
            <FilterField label={t("userManagement.filterRole")}>
              <DropdownFilter
                label={t("userManagement.filterRole")}
                options={roleFilterOptions}
                selectedValue={roleFilter}
                onChange={(value) => setRoleFilter(value as UserRoleFilter)}
              />
            </FilterField>
            <FilterField label={t("common.status")}>
              <DropdownFilter
                label={t("common.status")}
                options={statusFilterOptions}
                selectedValue={statusFilter}
                onChange={(value) => setStatusFilter(value as UserStatusFilter)}
              />
            </FilterField>
            <FilterField label={t("userManagement.filterVerification")}>
              <DropdownFilter
                label={t("userManagement.filterVerification")}
                options={verificationOptions}
                selectedValue={verificationFilter}
                onChange={(value) => setVerificationFilter(value as VerificationFilter)}
              />
            </FilterField>
          </div>
        </FilterBar>

        {loading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {t("userManagement.loading")}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={t("userManagement.emptyTitle")}
            description={t("userManagement.emptyDesc")}
            action={
              <ActionButton className="h-11 rounded-xl px-5" onClick={openCreateDrawer}>
                {t("userManagement.createUser")}
              </ActionButton>
            }
          />
        ) : (
          <DataTable
            title={t("userManagement.tableTitle")}
            description={t("userManagement.tableDesc")}
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
            ? t("userManagement.drawerCreate")
            : drawerMode === "view"
              ? t("userManagement.drawerView")
              : t("userManagement.drawerEdit")
        }
        subtitle={t("userManagement.drawerSubtitle")}
      >
        <div className="space-y-5">
          <div className="grid gap-5">
            <div className="space-y-2">
              <FieldLabel>{t("userManagement.fieldFullName")}</FieldLabel>
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
                <FieldLabel>{t("userManagement.fieldPhoneCode")}</FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={viewUser?.phone_country_code ?? ""}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label={t("userManagement.fieldPhoneCode")}
                    options={countryCodeOptions}
                    selectedValue={formState.phoneCountryCode}
                    onChange={(value) =>
                      setFormState((current) => ({ ...current, phoneCountryCode: value }))
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel>{t("userManagement.fieldPhoneNumber")}</FieldLabel>
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
              <FieldLabel>{t("userManagement.fieldEmail")}</FieldLabel>
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
                <FieldLabel helper={t("userManagement.fieldRoleHelper")}>
                  {t("userManagement.fieldRole")}
                </FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={roleLabel(viewUser?.role ?? "user")}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label={t("userManagement.fieldRole")}
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
                <FieldLabel>{t("userManagement.fieldStatus")}</FieldLabel>
                {drawerMode === "view" ? (
                  <input
                    value={statusLabel(viewUser?.status ?? "active")}
                    className={inputClassName}
                    disabled
                  />
                ) : (
                  <DropdownFilter
                    label={t("userManagement.fieldStatus")}
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
                  <FieldLabel>{t("userManagement.fieldPassword")}</FieldLabel>
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
                  <FieldLabel>{t("userManagement.fieldConfirmPassword")}</FieldLabel>
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
                    {t("userManagement.colPhoneVerified")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                    {viewUser.phone_verified ? t("userManagement.yes") : t("userManagement.no")}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    {t("userManagement.colEmailVerified")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">
                    {viewUser.email_verified ? t("userManagement.yes") : t("userManagement.no")}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    {t("userManagement.colCreatedAt")}
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
              {t("userManagement.close")}
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
                      {t("userManagement.resetPassword")}
                    </ActionButton>
                    {selectedUser.status === "active" ? (
                      <ActionButton variant="danger" onClick={() => setDisableOpen(true)}>
                        {t("userManagement.disableUser")}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        variant="secondary"
                        onClick={() => setReactivateOpen(true)}
                      >
                        {t("userManagement.reactivateUser")}
                      </ActionButton>
                    )}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="secondary" onClick={closeDrawer}>
                  {t("userManagement.cancel")}
                </ActionButton>
                <ActionButton onClick={() => void handleSave()} disabled={saving}>
                  {saving ? t("userManagement.saving") : t("userManagement.saveUser")}
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </DetailDrawer>

      <ConfirmModal
        open={resetPasswordOpen}
        title={t("userManagement.resetTitle")}
        description={t("userManagement.resetDesc")}
        confirmLabel={t("userManagement.resetPassword")}
        onConfirm={() => void handleResetPassword()}
        onClose={() => setResetPasswordOpen(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("userManagement.newPassword")}
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
              {t("userManagement.confirmPassword")}
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
        title={t("userManagement.disableTitle")}
        description={t("userManagement.disableDesc")}
        confirmLabel={t("userManagement.disableUser")}
        tone="danger"
        onConfirm={() => void handleDisableUser()}
        onClose={() => setDisableOpen(false)}
      />

      <ConfirmModal
        open={reactivateOpen}
        title={t("userManagement.reactivateTitle")}
        description={t("userManagement.reactivateDesc")}
        confirmLabel={t("userManagement.reactivateUser")}
        onConfirm={() => void handleReactivateUser()}
        onClose={() => setReactivateOpen(false)}
      />
    </>
  );
}
