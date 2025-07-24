// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import Image from "next/image";
import Link from "next/link";
import { navbarLinks } from "../../data/navbarLinks";
import ContentContainer from "../Atoms/ContentContainer";

export default function Footer() {
  const getLinksByCategory = (category: string) => {
    return navbarLinks.filter((link) => link.category === category);
  };

  const socialLinks = getLinksByCategory("social");
  const mainLinks = getLinksByCategory("main");
  const toolsLinks = getLinksByCategory("tools");
  const moreLinks = getLinksByCategory("more");
  const getEcashLinks = getLinksByCategory("getEcash");

  return (
    <footer className="relative bg-[#06060E] text-white">
      <div className="absolute bottom-0 left-1/2 aspect-[500/182] w-full max-w-[500px] -translate-x-1/2 opacity-60">
        <Image src="/footer-bg.png" alt="eCash" fill />
      </div>
      <div className="absolute bottom-0 left-1/2 h-[100px] w-full -translate-x-1/2 bg-gradient-to-b from-transparent to-[#06060E]" />
      <ContentContainer className="max-w-[1400px]">
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 pb-0">
          <div className="flex flex-col justify-between gap-12 lg:flex-row">
            {/* Left Section - Brand Information */}
            <div className="flex max-w-[300px] flex-col gap-6">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <div className="lg:w-29 relative h-7 w-24 lg:h-8">
                  <Image
                    src="/ecash-logo.png"
                    alt="eCash"
                    fill
                    className="object-contain"
                  />
                </div>
              </Link>

              {/* Tagline */}
              <p className="text-secondaryText font-light">
                Powering the internet economy of tomorrow. A truly scalable
                digital payment network for everyone.
              </p>

              {/* Contact Email */}
              <Link
                href="mailto:contact@e.cash"
                className="hover:text-accentLight flex items-center gap-2 text-xl font-bold transition-colors"
              >
                contact@e.cash
                <Image
                  src="/arrow-up-right.png"
                  alt="arrow-right"
                  width={16}
                  height={16}
                />
              </Link>
            </div>

            {/* Right Section - Navigation Links */}
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-3">
              {/* Site Links */}
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Site</h4>
                <div className="flex flex-col gap-2">
                  {mainLinks.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="text-secondaryText hover:text-accentLight font-light transition-colors"
                    >
                      {link.title}
                    </Link>
                  ))}
                  {moreLinks.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="text-secondaryText hover:text-accentLight font-light transition-colors"
                      {...(link.href.startsWith("http") && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tools Links */}
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Tools</h4>
                <div className="flex flex-col gap-2">
                  {toolsLinks.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="text-secondaryText hover:text-accentLight font-light transition-colors"
                      {...(link.href.startsWith("http") && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Get eCash Links */}
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Get eCash</h4>
                <div className="flex flex-col gap-2">
                  {getEcashLinks.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className="text-secondaryText hover:text-accentLight font-light transition-colors"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Copyright, Social Media */}
          <div className="mt-12 flex flex-col-reverse items-center gap-8 py-12 lg:flex-row lg:justify-between">
            {/* Copyright */}
            <div className="text-secondaryText font-light opacity-50">
              ©{new Date().getFullYear()} Bitcoin ABC. All rights reserved.
            </div>

            {/* Social Media Icons */}
            <div className="flex flex-wrap items-center gap-4">
              {socialLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-all hover:scale-110"
                >
                  <div className="relative h-5 w-7">
                    <Image
                      src={`/${link.title.toLowerCase()}.svg`}
                      alt={link.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ContentContainer>
    </footer>
  );
}
