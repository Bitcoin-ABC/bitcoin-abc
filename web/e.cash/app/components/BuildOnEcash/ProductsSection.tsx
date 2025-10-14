// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import ContentContainer from "../Atoms/ContentContainer";
import PlusHeader from "../Atoms/PlusHeader";
import { motion } from "framer-motion";
import { Product } from "../../data/products";

interface ProductsSectionProps {
  products: Product[];
}

export default function ProductsSection({ products }: ProductsSectionProps) {
  return (
    <div className="relative w-full py-20" id="products">
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <PlusHeader text="Builders" />
          <h2 className="text-4xl font-bold tracking-tighter lg:text-5xl">
            Products built with <span className="gradient-text">XEC</span>
          </h2>
          <p className="text-secondaryText mx-auto max-w-[500px] text-center text-base lg:text-lg">
            Discover the ecosystem of applications and tools built on the eCash
            network
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.2 }}
        >
          {products.map((product) => (
            <motion.a
              key={product.name}
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{
                once: true,
                amount: 0.3,
                margin: "0px 0px -50px 0px",
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="hover:to-white/15 group cursor-pointer rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 transition-all duration-200 hover:border-white/20 hover:from-white/10"
            >
              <h3 className="mb-1 text-xl font-bold transition-colors duration-200 group-hover:text-purple-500">
                {product.name}
              </h3>

              <p className="text-secondaryText text-sm leading-relaxed transition-colors duration-300 group-hover:!text-white">
                {product.description}
              </p>
            </motion.a>
          ))}
        </motion.div>
      </ContentContainer>
    </div>
  );
}
