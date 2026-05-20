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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-menu`;

  const selectedIndex = useMemo(() => {
    return Math.max(
      0,
      options.findIndex((option) => option.value === selectedValue),
    );
  }, [options, selectedValue]);

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

  function handleSelect(value: string) {
    onChange(value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() =>
          setOpen((current) => {
            const next = !current;
            if (next) {
              setActiveIndex(selectedIndex);
            }
            return next;
          })
        }
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-left text-sm text-[var(--color-foreground)] transition focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        <span
          className={cn(
            "truncate pr-4",
            selectedLabel ? "" : "text-[var(--color-muted-foreground)]",
          )}
        >
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
          <div
            id={menuId}
            role="listbox"
            aria-label={label}
            className="max-h-72 space-y-1 overflow-y-auto"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => (current + 1) % options.length);
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  current === 0 ? options.length - 1 : current - 1,
                );
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelect(options[activeIndex]?.value ?? selectedValue);
              }
            }}
          >
            {options.map((option) => {
              const selected = option.value === selectedValue;
              const active = options[activeIndex]?.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() =>
                    setActiveIndex(
                      options.findIndex((currentOption) => currentOption.value === option.value),
                    )
                  }
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]",
                    selected
                      ? "bg-emerald-50 text-emerald-800"
                      : active
                        ? "bg-[var(--color-surface-subtle)] text-[var(--color-foreground)]"
                        : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)]",
                  )}
                >
                  <span>{option.label}</span>
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
