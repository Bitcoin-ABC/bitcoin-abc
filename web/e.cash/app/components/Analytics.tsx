// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

const isEnabled =
  typeof GA_ID === "string" &&
  GA_ID.trim() !== "" &&
  process.env.NODE_ENV === "production";

const pageview = (url: string) => {
  if (!isEnabled || typeof window === "undefined") return;
  // @ts-expect-error gtag injected by script
  window.gtag?.("config", GA_ID, {
    page_path: url,
  });
};

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isEnabled) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname || "/";
    pageview(url);
  }, [pathname, searchParams]);

  if (!isEnabled) return null;

  const scriptProps = {
    src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
    strategy: "afterInteractive" as const,
  };

  return (
    <>
      <Script {...(scriptProps as Record<string, unknown>)} />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
