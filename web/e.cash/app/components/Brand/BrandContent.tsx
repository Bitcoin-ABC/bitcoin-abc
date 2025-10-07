// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Image from "next/image";

export default function BrandContent() {
  const colors = [
    {
      hex: "#01a0e0",
      rgb: "rgb(1, 160, 224)",
      cmyk: "C:99 M:29 Y:0 K:12",
      category: "primary",
    },
    {
      hex: "#0671c0",
      rgb: "rgb(6, 113, 192)",
      cmyk: "C:97 M:41 Y:0 K:25",
      category: "primary",
    },
    {
      hex: "#224da8",
      rgb: "rgb(34, 77, 168)",
      cmyk: "C:80 M:54 Y:0 K:34",
      category: "primary",
    },
    {
      hex: "#090916",
      rgb: "rgb(9, 9, 22)",
      cmyk: "C:59 M:59 Y:0 K:91",
      category: "primary",
    },
    {
      hex: "#FF21D0",
      rgb: "rgb(255, 33, 208)",
      cmyk: "C:0 M:87 Y:18 K:0",
      category: "secondary",
    },
    {
      hex: "#5E0EAE",
      rgb: "rgb(94, 14, 174)",
      cmyk: "C:46 M:92 Y:0 K:32",
      category: "secondary",
    },
    {
      hex: "#000000",
      rgb: "rgb(0, 0, 0)",
      cmyk: "C:0 M:0 Y:0 K:100",
      category: "secondary",
    },
    {
      hex: "#FFFFFF",
      rgb: "rgb(255, 255, 255)",
      cmyk: "C:0 M:0 Y:0 K:0",
      category: "secondary",
    },
  ];

  const logos = [
    {
      type: "logo-primary-horizontal",
      variations: ["dark-text", "black", "white-text", "white"],
      row_name: "Primary Horizontal",
    },
    {
      type: "logo-primary-vertical",
      variations: ["dark-text", "black", "white-text", "white"],
      row_name: "Primary Vertical",
    },
    {
      type: "logo-secondary-horizontal",
      variations: ["dark-text", "black", "white-text", "white"],
      row_name: "Secondary Horizontal",
    },
    {
      type: "logo-secondary-vertical",
      variations: ["dark-text", "black", "white-text", "white"],
      row_name: "Secondary Vertical",
    },
    {
      type: "square-icon",
      variations: [
        "blue-gradient",
        "blue",
        "white-blue-gradient",
        "white-blue",
      ],
      row_name: "Square Icon",
    },
    {
      type: "icon",
      variations: ["blue-gradient", "blue", "black", "white"],
      row_name: "Icon",
    },
    {
      type: "circle-icon",
      variations: ["blue-gradient", "blue", "black", "white"],
      row_name: "Round Icon",
    },
  ];

  const lightBackgrounds = ["dark-text", "black"];

  return (
    <div className="py-20">
      <ContentContainer>
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white lg:text-4xl">
            eCash Logo
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-300">
            There are several variations of the logo: primary, secondary, and
            icon. Each variation is available in PNG and SVG formats for your
            use.
          </p>
        </div>

        <div className="space-y-12">
          {logos.map((logo) => (
            <div key={logo.type} className="space-y-6">
              <h3 className="border-b border-gray-700 pb-2 text-xl font-semibold text-white">
                {logo.row_name}
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {logo.variations.map((variation, index) => (
                  <div
                    key={`${variation}_${index}`}
                    className={`flex flex-col items-center justify-center space-y-4 rounded-lg p-6 ${
                      lightBackgrounds.includes(variation)
                        ? "bg-white"
                        : "bg-white/10"
                    }`}
                  >
                    <div className="relative h-20 w-32">
                      <Image
                        src={`/logos/ecash-${logo.type}-${variation}.png`}
                        alt={`eCash ${logo.row_name} ${variation}`}
                        fill
                        className="object-contain"
                        sizes="128px"
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <p
                        className={`mb-2 text-xs font-light capitalize ${
                          lightBackgrounds.includes(variation)
                            ? "!text-black"
                            : "!text-white"
                        }`}
                      >
                        {variation.replace("-", " ")}
                      </p>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = `/logos/ecash-${logo.type}-${variation}.png`;
                            link.download = `ecash-${logo.type}-${variation}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="cursor-pointer rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                        >
                          PNG
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = `/logos/ecash-${logo.type}-${variation}.svg`;
                            link.download = `ecash-${logo.type}-${variation}.svg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="cursor-pointer rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700"
                        >
                          SVG
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Brand Colors Section */}

        <h2 className="mb-10 mt-40 text-center text-3xl font-bold text-white lg:text-4xl">
          eCash Colors
        </h2>

        <div className="mb-16">
          {/* Primary Colors */}
          <div className="mb-12">
            <h4 className="mb-6 border-b border-gray-700 pb-2 text-xl font-semibold text-white">
              Primary Colors
            </h4>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {colors
                .filter((color) => color.category === "primary")
                .map((color, index) => (
                  <div key={index} className="text-center">
                    <div
                      className="h-30 max-w-30 m-auto mb-4 w-full rounded-lg border border-gray-600"
                      style={{ backgroundColor: color.hex }}
                    ></div>
                    <p className="mb-1 font-mono text-xs text-gray-400">
                      {color.hex}
                    </p>
                    <p className="mb-1 font-mono text-xs text-gray-400">
                      {color.rgb}
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      {color.cmyk}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Secondary Colors */}
          <div className="mb-12">
            <h4 className="mb-6 border-b border-gray-700 pb-2 text-xl font-semibold text-white">
              Secondary Colors
            </h4>
            <p className="mb-6 text-gray-300">
              Used to support the primary color or attract the eye.
            </p>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {colors
                .filter((color) => color.category === "secondary")
                .map((color, index) => (
                  <div key={index} className="text-center">
                    <div
                      className="h-30 max-w-30 m-auto mb-4 w-full rounded-lg border border-gray-600"
                      style={{ backgroundColor: color.hex }}
                    ></div>
                    <p className="mb-1 font-mono text-xs text-gray-400">
                      {color.hex}
                    </p>
                    <p className="mb-1 font-mono text-xs text-gray-400">
                      {color.rgb}
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      {color.cmyk}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Brand Fonts Section */}

        <h3 className="mb-10 mt-40 text-center text-3xl font-bold text-white lg:text-4xl">
          eCash Fonts
        </h3>

        <div className="mb-12">
          <h4 className="mb-6 border-b border-gray-700 pb-2 text-xl font-semibold text-white">
            Primary Font
          </h4>
          <div className="mb-4 rounded-lg">
            <h3 className="mb-2 text-4xl font-bold text-white">
              Cash for the Internet
            </h3>
            <p className="text-sm">Space Grotesk</p>
            <p className="text-sm">font-family: Space Grotesk</p>
            <a
              href="https://fonts.google.com/specimen/Space+Grotesk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accentLight hover:text-accentMedium text-sm hover:underline"
            >
              View on Google Fonts
            </a>
          </div>
        </div>

        <div className="mb-12">
          <h4 className="mb-6 border-b border-gray-700 pb-2 text-xl font-semibold text-white">
            Secondary Font
          </h4>
          <div className="mb-4 rounded-lg">
            <h3 className="font-fira-code mb-2 text-4xl text-white">
              Cash for the Internet
            </h3>
            <p className="text-sm">Fira Code</p>
            <p className="text-sm">font-family: Fira Code</p>
            <a
              href="https://fonts.google.com/specimen/Fira+Code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accentLight hover:text-accentMedium text-sm hover:underline"
            >
              View on Google Fonts
            </a>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p>
            Reach out to{" "}
            <a
              href="mailto:contact@e.cash"
              className="text-blue-400 underline hover:text-blue-300"
            >
              contact@e.cash
            </a>{" "}
            if you have any questions.
          </p>
        </div>
      </ContentContainer>
    </div>
  );
}
