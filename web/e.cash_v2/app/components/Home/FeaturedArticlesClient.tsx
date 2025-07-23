// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatTimestamp, calculateReadTime, BlogPost } from "../../data/blog";
import PlusHeader from "../Atoms/PlusHeader";
import Button from "../Atoms/Button";
import { motion } from "framer-motion";

interface FeaturedArticlesClientProps {
  posts: BlogPost[];
}

export default function FeaturedArticlesClient({
  posts,
}: FeaturedArticlesClientProps) {
  return (
    <>
      <div className="mb-10 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <PlusHeader text="Stay up to date" />
          <h2 className="mt-6">Featured articles</h2>
        </motion.div>
        <Link
          href="/blog"
          className="hover:bg-accentMedium rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white transition"
        >
          All articles
        </Link>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
          delay: 0.2,
        }}
        viewport={{ once: true, amount: 0.5 }}
        className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-x-visible"
      >
        {posts.map((post, idx) => {
          const imageUrl =
            post.attributes.image.data.attributes.formats.small?.url ||
            post.attributes.image.data.attributes.url;
          return (
            <div
              key={post.id}
              className="flex min-w-[90%] max-w-[350px] flex-col justify-between overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5 lg:w-auto lg:min-w-0 lg:max-w-none"
            >
              <div className="p-2">
                <div className="relative h-[200px] w-full overflow-hidden rounded-xl lg:h-[300px]">
                  <Image
                    src={`https://strapi.fabien.cash${imageUrl}`}
                    alt={post.attributes.title}
                    fill
                    className="object-cover"
                    priority={idx === 0}
                    unoptimized
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-8">
                <div className="text-secondaryText mb-2 flex items-center text-sm">
                  {formatTimestamp(
                    post.attributes.publish_date || post.attributes.publishedAt
                  )}
                  <span className="mx-2">•</span>
                  <span>
                    {calculateReadTime(post.attributes.content)} min read
                  </span>
                </div>
                <h3 className="mb-4 text-xl font-bold leading-tight text-white lg:text-3xl">
                  {post.attributes.title.length > 40
                    ? post.attributes.title.slice(0, 40) + "…"
                    : post.attributes.title}
                </h3>
                <div className="mt-auto">
                  <Button
                    href={`/blog/${post.attributes.slug}`}
                    variant="white"
                    className="mt-4"
                  >
                    Read more
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </>
  );
}
