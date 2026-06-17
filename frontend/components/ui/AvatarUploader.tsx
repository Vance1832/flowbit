"use client";

import { useRef, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { uploadAvatar } from "@/lib/api/accounts";

export function AvatarUploader({ initials }: { initials: string }) {
  const { user, refreshUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      await uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar
        src={user?.avatar_url}
        initials={initials}
        className="h-20 w-20 rounded-2xl text-2xl"
      />
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          JPG, PNG or GIF, up to 5 MB.
        </p>
        {error ? (
          <p className="mt-1 text-xs font-medium text-[var(--color-danger)]">{error}</p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
