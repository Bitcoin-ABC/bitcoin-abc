// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getBlogPosts,
  sortBlogPostsByDate,
  formatTimestamp,
  calculateReadTime,
  BlogPost,
} from "../data/blog";
import ContentContainer from "../components/Atoms/ContentContainer";
import Button from "../components/Atoms/Button";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 43200;

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  try {
    const allPosts = await getBlogPosts();
    posts = sortBlogPostsByDate(allPosts);
  } catch {
    return (
      <div className="text-center text-red-500">Failed to load blog posts.</div>
    );
  }

  if (!posts.length) {
    return <div className="text-center">No blog posts found.</div>;
  }

  const [latest, ...rest] = posts;
  const featured = rest.slice(0, 9);
  const more = rest.slice(9);

  const getImageUrl = (post: BlogPost) =>
    post.attributes.image.data.attributes.formats.small?.url ||
    post.attributes.image.data.attributes.url;

  return (
    <ContentContainer className="pt-30 max-w-[1400px]">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-4xl font-bold">Blog</h1>
        <p className="text-secondaryText">
          Staying up to date with the XEC team
        </p>
      </div>
      {/* Latest post large */}
      <div className="relative mb-12 overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5">
        <div className="relative h-[550px] w-full">
          <Image
            src={`https://strapi.fabien.cash${getImageUrl(latest)}`}
            alt={latest.attributes.title}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-8">
          <div className="text-secondaryText mb-2 flex items-center text-sm">
            {formatTimestamp(
              latest.attributes.publish_date || latest.attributes.publishedAt
            )}
            <span className="mx-2">•</span>
            <span>{calculateReadTime(latest.attributes.content)} min read</span>
          </div>
          <h2 className="mb-4 max-w-2xl text-3xl font-bold text-white">
            {latest.attributes.title}
          </h2>
          <div className="mt-4 w-fit">
            <Button
              href={`/blog/${latest.attributes.slug}`}
              variant="white"
              className="m-0"
            >
              Read more
            </Button>
          </div>
        </div>
      </div>
      {/* Next 9 posts as cards */}
      <div className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {featured.map((post, idx) => (
          <div
            key={post.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5"
          >
            <div className="p-2">
              <div className="relative h-[200px] w-full overflow-hidden rounded-xl lg:h-[300px]">
                <Image
                  src={`https://strapi.fabien.cash${getImageUrl(post)}`}
                  alt={post.attributes.title}
                  fill
                  className="object-cover"
                  priority={idx === 0}
                  unoptimized
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="text-secondaryText mb-2 flex items-center text-sm">
                {formatTimestamp(
                  post.attributes.publish_date || post.attributes.publishedAt
                )}
                <span className="mx-2">•</span>
                <span>
                  {calculateReadTime(post.attributes.content)} min read
                </span>
              </div>
              <h3 className="mb-4 text-xl font-bold leading-tight text-white lg:text-2xl">
                {post.attributes.title}
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
        ))}
      </div>
      {/* More articles as text links */}
      <div className="mx-auto max-w-[900px]">
        <h2 className="mb-6 text-2xl font-bold">More articles</h2>
        <div className="flex flex-col gap-4">
          {more.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.attributes.slug}`}
              className="group flex flex-col items-start justify-between py-2 lg:flex-row lg:items-center"
            >
              <h3 className="group-hover:text-accentMedium text-xl font-bold transition-all">
                {post.attributes.title}
              </h3>

              <span className="text-secondaryText text-xs lg:pl-4">
                {formatTimestamp(
                  post.attributes.publish_date || post.attributes.publishedAt
                )}
                <span className="mx-1">•</span>
                {calculateReadTime(post.attributes.content)} min read
              </span>
            </Link>
          ))}
        </div>
      </div>
    </ContentContainer>
  );
}
