// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { navbarLinks } from "../../data/navbarLinks";
import Button from "./Button";
import { useRef } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  const [isScrolled, setIsScrolled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const aboutTimeout = useRef<NodeJS.Timeout | null>(null);
  const toolsTimeout = useRef<NodeJS.Timeout | null>(null);
  const moreTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        mobileMenuOpen &&
        !target.closest(".mobile-menu") &&
        !target.closest(".hamburger-button")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Dropdown hover handlers
  const handleDropdown = (
    setOpen: (v: boolean) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
    show: boolean
  ) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (show) setOpen(true);
    else timeoutRef.current = setTimeout(() => setOpen(false), 100);
  };

  const dropDownBox =
    "absolute left-0 z-90 mt-2 flex flex-col gap-1 rounded-2xl border border-white/20 bg-slate-950 px-4 py-4 pl-2";
  const dropDownItem =
    "flex items-center rounded-2xl px-4 py-2 text-base font-light hover:bg-white/10";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed z-50 flex w-full items-center justify-center px-4 py-4 transition-all duration-300",
          (isScrolled || mobileMenuOpen) &&
            "bg-background/30 shadow-sm backdrop-blur-sm"
        )}
      >
        <div className="flex w-full max-w-[1400px] items-center justify-between">
          {/* Left: Logo and main links */}
          <div className="flex items-center gap-12">
            <Link className="lg:w-29 relative h-7 w-24 lg:h-8" href="/">
              <Image
                src="/ecash-logo.png"
                alt="eCash"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 96px, 116px"
              />
            </Link>
            {/* Main links - hidden on mobile */}
            <div className="hidden items-center gap-12 lg:flex">
              {navbarLinks
                .filter((l) => l.category === "main")
                .map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="hover:text-accentLight font-medium transition-all"
                  >
                    {link.title}
                  </Link>
                ))}
              {/* About dropdown - hidden on mobile */}
              <div
                className="relative"
                onMouseEnter={() =>
                  handleDropdown(setAboutOpen, aboutTimeout, true)
                }
                onMouseLeave={() =>
                  handleDropdown(setAboutOpen, aboutTimeout, false)
                }
              >
                <button
                  className={cn(
                    "hover:text-accentLight flex items-center gap-2 font-medium transition-all",
                    aboutOpen && "text-accentLight"
                  )}
                >
                  About
                  <Image
                    src="/arrow-up.png"
                    alt="chevron-down"
                    width={10}
                    height={10}
                    className={cn(
                      "rotate-180 transition-all",
                      aboutOpen && "custom-filter"
                    )}
                  />
                </button>
                {aboutOpen && (
                  <div className={dropDownBox}>
                    {navbarLinks
                      .filter((l) => l.category === "about")
                      .map((link) => (
                        <Link
                          key={link.title}
                          href={link.href}
                          className={dropDownItem}
                        >
                          {link.title}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
              {/* Tools dropdown - hidden on mobile */}
              <div
                className="relative"
                onMouseEnter={() =>
                  handleDropdown(setToolsOpen, toolsTimeout, true)
                }
                onMouseLeave={() =>
                  handleDropdown(setToolsOpen, toolsTimeout, false)
                }
              >
                <button
                  className={cn(
                    "hover:text-accentLight flex items-center gap-2 font-medium transition-all",
                    toolsOpen && "text-accentLight"
                  )}
                >
                  Tools
                  <Image
                    src="/arrow-up.png"
                    alt="chevron-down"
                    width={10}
                    height={10}
                    className={cn(
                      "rotate-180 transition-all",
                      toolsOpen && "custom-filter"
                    )}
                  />
                </button>
                {toolsOpen && (
                  <div className={dropDownBox}>
                    {navbarLinks
                      .filter((l) => l.category === "tools")
                      .map((link) => (
                        <Link
                          key={link.title}
                          href={link.href}
                          className={dropDownItem}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.title}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: More dropdown, action buttons - hidden on mobile */}
          <div className="hidden items-center gap-6 lg:flex">
            {/* More dropdown */}
            <div
              className="relative"
              onMouseEnter={() =>
                handleDropdown(setMoreOpen, moreTimeout, true)
              }
              onMouseLeave={() =>
                handleDropdown(setMoreOpen, moreTimeout, false)
              }
            >
              <button
                className={cn(
                  "hover:text-accentLight flex items-center gap-1 font-medium transition-all",
                  moreOpen && "text-accentLight"
                )}
              >
                More <span className="text-xs">⋯</span>
              </button>
              {moreOpen && (
                <div className={cn(dropDownBox, "left-auto right-0")}>
                  {/* Show 'more' links here */}
                  {navbarLinks
                    .filter((l) => l.category === "more")
                    .map((link) => {
                      const isExternal = link.href.startsWith("http");
                      return (
                        <Link
                          key={link.title}
                          href={link.href}
                          className={dropDownItem}
                          {...(isExternal && {
                            target: "_blank",
                            rel: "noopener noreferrer",
                          })}
                        >
                          {link.title}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
            {/* Action buttons */}
            {navbarLinks
              .filter((l) => l.category === "actions")
              .map((link) => (
                <div key={link.title} className="relative">
                  <Button
                    key={link.title}
                    href={link.href}
                    variant={
                      link.title === "Start building" ? "gradient" : "outline"
                    }
                    className="relative ml-2"
                  >
                    {link.title}
                  </Button>
                  {link.title === "Create wallet" && isHomepage && (
                    <div className="absolute bottom-[-30px] left-[-50px] flex select-none items-start text-sm font-light leading-tight tracking-wide">
                      FREE XEC
                      <Image
                        src="/free-arrow.png"
                        alt="arrow"
                        width={16}
                        height={16}
                        className="ml-1 h-4 w-4"
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {/* Center: Create wallet button - visible on mobile */}
            <div className="relative lg:hidden">
              {navbarLinks
                .filter(
                  (l) => l.category === "actions" && l.title === "Create wallet"
                )
                .map((link) => (
                  <div key={link.title} className="relative">
                    <Button
                      href={link.href}
                      variant="outline"
                      className="relative h-[30px] px-2 text-xs sm:text-sm"
                    >
                      {link.title}
                    </Button>
                    {isHomepage && (
                      <div className="absolute bottom-[-25px] right-0 flex select-none items-baseline text-[11px] font-light leading-tight tracking-wide">
                        <Image
                          src="/free-arrow.png"
                          alt="arrow"
                          width={16}
                          height={16}
                          className="mr-1 scale-x-[-1]"
                        />
                        FREE XEC
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Mobile hamburger menu button */}
            <button
              className="hamburger-button relative flex cursor-pointer flex-col gap-2 p-2 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <div
                className={cn(
                  "h-0.5 w-7 origin-center bg-white transition-all duration-300",
                  mobileMenuOpen && "translate-y-[5px] rotate-[40deg]"
                )}
              />
              <div
                className={cn(
                  "h-0.5 w-7 origin-center bg-white transition-all duration-300",
                  mobileMenuOpen && "translate-y-[-5px] rotate-[-40deg]"
                )}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "mobile-menu fixed inset-0 z-40 transition-opacity duration-300 lg:hidden",
          mobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        {/* Menu content */}
        <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 p-8">
          {/* Navigation links */}
          <div className="flex min-h-full flex-col gap-6">
            {/* Main links */}
            <div>
              <div className="mt-15 mb-3 text-xl font-bold">
                {navbarLinks
                  .filter((l) => l.category === "main")
                  .map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="hover:text-accentLight block py-2 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.title}
                    </Link>
                  ))}
              </div>
            </div>

            {/* About section */}
            <div>
              <div className="font-fira-code text-secondaryText mb-3 text-xs font-light">
                ABOUT
              </div>
              <div className="text-xl font-bold">
                {navbarLinks
                  .filter((l) => l.category === "about")
                  .map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="hover:text-accentLight block py-2 transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.title}
                    </Link>
                  ))}
              </div>
            </div>

            {/* Tools section */}
            <div>
              <div className="font-fira-code text-secondaryText mb-3 text-xs font-light">
                TOOLS
              </div>
              <div className="text-xl font-bold">
                {navbarLinks
                  .filter((l) => l.category === "tools")
                  .map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="hover:text-accentLight block py-2 transition-all"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.title}
                    </Link>
                  ))}
              </div>
            </div>

            {/* More section */}
            <div>
              <div className="font-fira-code text-secondaryText mb-3 text-xs font-light">
                MORE
              </div>
              <div className="text-xl font-bold">
                {navbarLinks
                  .filter((l) => l.category === "more")
                  .map((link) => {
                    const isExternal = link.href.startsWith("http");
                    return (
                      <Link
                        key={link.title}
                        href={link.href}
                        className="hover:text-accentLight block py-2 transition-all"
                        {...(isExternal && {
                          target: "_blank",
                          rel: "noopener noreferrer",
                        })}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.title}
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex items-center gap-2">
              {navbarLinks
                .filter((l) => l.category === "actions")
                .map((link) => (
                  <Button
                    key={link.title}
                    href={link.href}
                    variant={
                      link.title === "Start building" ? "gradient" : "outline"
                    }
                    className="h-[40px] w-full px-2 text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.title}
                  </Button>
                ))}
            </div>

            {/* Social media icons */}
            <div className="mt-8 flex flex-wrap justify-center gap-5 pb-8">
              {navbarLinks
                .filter((l) => l.category === "social")
                .map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      <Image
                        src={`/${link.title.toLowerCase()}.svg`}
                        alt={link.title}
                        fill
                        className="h-full w-full object-contain"
                        sizes="20px"
                      />
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
