import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function GridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="12" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="12" width="5" height="5" rx="1" />
      <rect x="12" y="12" width="5" height="5" rx="1" />
    </BaseIcon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 5h10" />
      <path d="M7 10h10" />
      <path d="M7 15h10" />
      <path d="M3.5 5h.01" />
      <path d="M3.5 10h.01" />
      <path d="M3.5 15h.01" />
    </BaseIcon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 16l3.4-.7L15.8 7a1.8 1.8 0 0 0-2.5-2.5l-8.4 8.4L4 16Z" />
      <path d="m11.8 5.6 2.6 2.6" />
    </BaseIcon>
  );
}

export function ArrowsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 3H3v3" />
      <path d="M14 17h3v-3" />
      <path d="M17 6V3h-3" />
      <path d="M3 14v3h3" />
      <path d="M3 3l5 5" />
      <path d="m17 17-5-5" />
      <path d="m17 3-5 5" />
      <path d="m3 17 5-5" />
    </BaseIcon>
  );
}

export function VaultIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 7.2V5.5" />
      <path d="M12.5 10H14" />
      <path d="M10 12.8v1.7" />
      <path d="M7.5 10H6" />
    </BaseIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
      <path d="M4 7h11" />
      <path d="M13.5 11h.01" />
    </BaseIcon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 3.5h5l4 4V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-11a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M11 3.5V8h4" />
      <path d="M7.5 11h5" />
      <path d="M7.5 14h5" />
    </BaseIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 14.5h7L15 13V9.3a5 5 0 1 0-10 0V13l1.5 1.5Z" />
      <path d="M8.2 16a1.9 1.9 0 0 0 3.6 0" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m14 14 3 3" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m8 5 4 5-4 5" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5 7 5 6 5-6" />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5 5 10 10" />
      <path d="M15 5 5 15" />
    </BaseIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m10 2 1.2 4.1L15 7.3l-3.8 1.2L10 13l-1.2-4.5L5 7.3l3.8-1.2L10 2Z" />
    </BaseIcon>
  );
}
