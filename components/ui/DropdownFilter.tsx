"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  label: string;
  value: string;
};

type DropdownFilterProps = {
  label: string;
  options: DropdownOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DropdownFilter({
  label,
  options,
  selectedValue,
  onChange,
  placeholder,
  className,
}: DropdownFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === selectedValue)?.label ?? "";
  }, [options, selectedValue]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-left text-sm text-[var(--color-foreground)] transition focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30"
      >
        <span className={selectedLabel ? "" : "text-[var(--color-muted-foreground)]"}>
          {selectedLabel || placeholder || label}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 text-[var(--color-muted-foreground)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div role="listbox" aria-label={label} className="space-y-1">
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                    selected
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
