import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const Base = ({ children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const TodayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3s6 5.2 6 11a6 6 0 0 1-12 0c0-2.4 1-4.2 2.4-5.6.3 1.7 1.2 2.8 2.4 3.2C10.500 8.700 10.800 5.700 12 3Z" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.500" y="5" width="17" height="15.500" rx="3" />
    <path d="M3.500 10h17M8 3v4M16 3v4" />
  </Base>
);

export const ChartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 18c3-1 4-7 7-7s3.500 3 6 2 2.500-5 3-7" />
    <path d="M4 21h16" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.500" r="4" />
    <path d="M4.500 20.500c1-3.800 4-5.500 7.500-5.500s6.500 1.700 7.500 5.500" />
  </Base>
);

export const DumbbellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 6.500v11M4 9v6M17 6.500v11M20 9v6M7 12h10" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.500 6.500a2.500 2.500 0 0 1 2.500-2.500h10a2.500 2.500 0 0 1 2.500 2.500v8a2.500 2.500 0 0 1-2.500 2.500h-6l-4.500 3.500V17a2.500 2.500 0 0 1-2-2.500Z" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="2.600">
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="m14.500 5.500-6.500 6.500 6.500 6.500" />
  </Base>
);

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9.500 5.500 6.500 6.500-6.500 6.500" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const MinusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9.500 7V4.500h5V7M6.500 7l1 13h9l1-13" />
  </Base>
);

export const Logo = (p: IconProps) => (
  <svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden {...p}>
    <circle cx="25" cy="32" r="14" stroke="var(--accent)" strokeWidth="6" />
    <circle cx="39" cy="32" r="14" stroke="var(--text)" strokeWidth="6" />
  </svg>
);
