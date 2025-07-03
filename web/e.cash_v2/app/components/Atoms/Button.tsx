// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";

import React, {
  type ReactNode,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
} from "react";
import Link from "next/link";
import { cn } from "../../utils/cn";

/** Visual style variants */
type Variant = "gradient" | "white" | "outline";

/** Props common to both button and link */
interface CommonProps {
  /** Optional icon rendered after the button text */
  icon?: ReactNode;
  /** Button text or other children */
  children?: ReactNode;
  /** Visual style variant */
  variant?: Variant;
  /** Additional class names */
  className?: string;
}

/** Props when rendering as a Next.js Link */
type LinkProps = CommonProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** Props when rendering as a native button */
type ButtonOnlyProps = CommonProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "href">;

export type ButtonProps = LinkProps | ButtonOnlyProps;

export default function Button(props: ButtonProps) {
  const {
    href,
    icon,
    children,
    variant = "gradient",
    className,
    ...restProps
  } = props;

  const baseClasses = [
    "inline-flex items-center justify-center gap-2 border-box relative",
    "px-4 h-10 mx-auto lg:mx-0",
    "rounded-lg cursor-pointer",
    "font-medium",
    "transition-all duration-300",
    "hover:shadow-[0_0_8px_rgba(255,255,255,0.3)]",
  ];

  const variantClasses =
    variant === "gradient"
      ? [
          "bg-gradient-to-r",
          "from-accentLight",
          "via-accentMedium",
          "to-accentDark",
          "bg-[length:150%_150%] bg-right",
          "text-white",
          "border-t border-l border-b border-t-white/40 border-b-black/50 border-l-white/30",
          "hover:border-b-white/20 hover:bg-left",
        ]
      : variant === "white"
      ? ["bg-white text-background hover:text-accentMedium"]
      : [
          "bg-transparent border-1 border-white text-white hover:bg-white hover:text-background",
        ];

  const classes = cn(...baseClasses, ...variantClasses, className);

  const content = (
    <>
      {children}
      {icon && <span className="flex items-center">{icon}</span>}
    </>
  );

  if (href) {
    // External links open in a new tab
    const isExternal = /^https?:\/\//.test(href);
    const externalProps = isExternal
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};

    return (
      <Link
        href={href}
        className={classes}
        {...externalProps}
        {...(restProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(restProps as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
