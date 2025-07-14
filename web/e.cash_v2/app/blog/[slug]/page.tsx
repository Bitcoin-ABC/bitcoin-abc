// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogPosts,
  sortBlogPostsByDate,
  formatTimestamp,
  calculateReadTime,
  BlogPost,
} from "../../data/blog";
import ContentContainer from "../../components/Atoms/ContentContainer";
import { CACHE_INTERVAL_SECONDS } from "../../constants";

export const revalidate = CACHE_INTERVAL_SECONDS;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let posts: BlogPost[] = [];
  try {
    const allPosts = await getBlogPosts();
    posts = sortBlogPostsByDate(allPosts);
  } catch {
    return (
      <div className="text-center text-red-500">Failed to load blog post.</div>
    );
  }

  const post = posts.find((p) => p.attributes.slug === slug);
  if (!post) {
    notFound();
  }

  const imageUrl =
    post.attributes.image.data.attributes.formats.medium?.url ||
    post.attributes.image.data.attributes.url;

  return (
    <ContentContainer className="max-w-[900px] pt-20">
      <Link
        href="/blog"
        className="text-accentMedium mb-8 inline-block hover:underline"
      >
        ← Back to Blog
      </Link>
      <div className="mb-8">
        <div className="relative h-[350px] w-full overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5">
          <Image
            src={`https://strapi.fabien.cash${imageUrl}`}
            alt={post.attributes.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
      <div className="text-secondaryText mb-4 flex items-center text-sm">
        {formatTimestamp(
          post.attributes.publish_date || post.attributes.publishedAt
        )}
        <span className="mx-2">•</span>
        <span>{calculateReadTime(post.attributes.content)} min read</span>
      </div>
      <h1 className="mb-6 text-4xl font-bold text-white">
        {post.attributes.title}
      </h1>
      <article
        className="prose prose-invert prose-lg prose-headings:mt-8 prose-p:mt-4 max-w-none text-lg"
        dangerouslySetInnerHTML={{ __html: post.attributes.content }}
      />
    </ContentContainer>
  );
}
