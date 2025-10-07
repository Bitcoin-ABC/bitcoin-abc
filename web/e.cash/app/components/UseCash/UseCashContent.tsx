// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import Button from "../Atoms/Button";
import Image from "next/image";
import { motion } from "motion/react";
import { Service } from "../../data/scores";
import { useCashServices } from "../../data/useCashServices";

interface UseCashContentProps {
  services: Service[];
  hasError: boolean;
}

export default function UseCashContent({
  services,
  hasError,
}: UseCashContentProps) {
  return (
    <div className="relative">
      <ContentContainer>
        <div className="grid grid-cols-1 gap-5 py-20 lg:grid-cols-2">
          {useCashServices.map((service) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              className="custom-box relative flex flex-col rounded-lg bg-white/5 p-10"
              id={service.id}
              key={service.id}
            >
              <div className="relative mx-auto mb-10 aspect-video w-full max-w-[250px]">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 250px"
                />
              </div>
              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <h3 className="mb-2 text-xl font-bold tracking-tighter text-white lg:text-2xl">
                    {service.title}
                  </h3>
                  <div className="space-y-4">
                    {service.content.paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>

                  {service.content.disclaimer && (
                    <p className="mt-6 text-xs italic opacity-50">
                      {service.content.disclaimer}
                    </p>
                  )}
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  {service.content.buttons.map((button, index) => (
                    <Button
                      key={index}
                      href={button.href}
                      variant={button.variant}
                    >
                      {button.text}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!hasError && (
          <motion.div
            className="py-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-bold tracking-tighter text-white lg:text-4xl">
                Services
              </h3>
              <p className="mt-4 text-gray-300">
                Check out eCash service partners.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {services.map((item, index) => {
                const logoSrc = Array.isArray(item.attributes.logo?.data)
                  ? item.attributes.logo.data[0]?.attributes
                  : item.attributes.logo?.data?.attributes;

                if (!logoSrc?.url) return null;

                return (
                  <motion.a
                    key={index}
                    href={item.attributes.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex aspect-square items-center justify-center rounded-lg bg-white/5 p-6 transition-all duration-300 hover:bg-white/10"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    viewport={{ once: true }}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL}${logoSrc.url}`}
                        fill
                        alt={item.attributes.name}
                        className="object-contain transition-transform duration-300 group-hover:scale-110"
                        unoptimized={true}
                        sizes="(max-width: 768px) 33vw, (max-width: 1024px) 16vw, 16vw"
                      />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        )}
      </ContentContainer>
    </div>
  );
}
