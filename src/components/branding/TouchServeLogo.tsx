"use client";

import Image from "next/image";

type Props = {
  /** Max height of the logo (Tailwind class, e.g. h-9) */
  className?: string;
};

export function TouchServeLogo({ className = "h-9" }: Props) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <Image
        src="/touchserve-logo-2.png"
        alt="TouchServe"
        width={220}
        height={90}
        className={`w-auto ${className}`}
        priority
      />
    </span>
  );
}
