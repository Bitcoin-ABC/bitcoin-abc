// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatTimestamp, calculateReadTime, BlogPost } from "../../data/blog";
import Button from "../Atoms/Button";

interface BlogRecommendationProps {
  post: BlogPost;
}

export default function BlogRecommendation({ post }: BlogRecommendationProps) {
  const imageUrl =
    post.attributes.image.data.attributes.formats.small?.url ||
    post.attributes.image.data.attributes.url;

  return (
    <div className="mt-16">
      <h2 className="mb-6 text-2xl font-bold text-white">Recommended</h2>
      <Link
        href={`/blog/${post.attributes.slug}`}
        className="group flex flex-col justify-between overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5 lg:flex-row"
      >
        <div className="p-2 lg:w-1/2">
          <div className="relative h-[300px] w-full overflow-hidden rounded-xl">
            <Image
              src={process.env.NEXT_PUBLIC_STRAPI_URL + imageUrl}
              alt={post.attributes.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-8 lg:w-1/2">
          <div className="text-secondaryText mb-2 flex items-center text-sm">
            {formatTimestamp(
              post.attributes.publish_date || post.attributes.publishedAt,
            )}
            <span className="mx-2">•</span>
            <span>{calculateReadTime(post.attributes.content)} min read</span>
          </div>
          <h3 className="mb-4 text-2xl leading-tight font-bold text-white transition-all group-hover:underline lg:text-3xl">
            {post.attributes.title}
          </h3>
          <div className="mt-auto">
            <Button variant="white" className="mt-4">
              Read more
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
