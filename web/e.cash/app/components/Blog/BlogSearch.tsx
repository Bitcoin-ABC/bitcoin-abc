// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

"use client";
import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { BlogPost, formatTimestamp, calculateReadTime } from "../../data/blog";
import Button from "../Atoms/Button";

interface BlogSearchProps {
  posts: BlogPost[];
}

export default function BlogSearch({ posts }: BlogSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Search function that matches against title and content
  const searchPosts = (query: string, posts: BlogPost[]): BlogPost[] => {
    if (!query.trim()) return posts;

    const searchTerm = query.toLowerCase().trim();

    return posts.filter((post) => {
      const title = post.attributes.title.toLowerCase();
      return title.includes(searchTerm);
    });
  };

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    return searchPosts(searchQuery, posts);
  }, [searchQuery, posts]);

  const getImageUrl = (post: BlogPost) =>
    post.attributes.image.data.attributes.formats.medium?.url ||
    post.attributes.image.data.attributes.url;

  const [latest, ...rest] = filteredPosts;
  const featured = rest.slice(0, 9);
  const more = rest.slice(9);

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-center lg:text-left">
          <h1 className="mb-2 text-4xl font-bold">Blog</h1>
          <p className="text-secondaryText">
            Staying up to date with the XEC team
          </p>
        </div>
        {/* Search Input */}
        <div className="relative w-full max-w-lg">
          <div className="relative">
            <input
              type="text"
              placeholder="Search blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="placeholder:text-secondaryText focus:border-accentMedium focus:ring-accentMedium/20 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:ring-2 focus:outline-none"
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2">
              <svg
                className="text-secondaryText h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          {searchQuery && (
            <p className="text-secondaryText absolute right-0 bottom-[-28px] text-sm">
              {filteredPosts.length} result
              {filteredPosts.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
      </div>

      {searchQuery && filteredPosts.length === 0 ? (
        <div className="flex h-[400px] flex-col items-center justify-center text-center">
          <p className="text-secondaryText mb-4 text-lg">
            No blog posts found matching "{searchQuery}"
          </p>
          <Button
            variant="white"
            onClick={() => setSearchQuery("")}
            className="m-0 mb-12"
          >
            Clear search
          </Button>
        </div>
      ) : (
        <>
          {/* Latest post large */}
          <a
            href={`/blog/${latest.attributes.slug}`}
            className="group relative mb-12 block overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5"
          >
            <div className="relative h-[550px] w-full">
              <Image
                src={
                  process.env.NEXT_PUBLIC_STRAPI_URL +
                  (latest.attributes.image.data.attributes.formats.large?.url ||
                    latest.attributes.image.data.attributes.url)
                }
                alt={latest.attributes.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute right-0 bottom-0 left-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-8">
              <div className="text-secondaryText mb-2 flex items-center text-sm">
                {formatTimestamp(
                  latest.attributes.publish_date ||
                    latest.attributes.publishedAt,
                )}
                <span className="mx-2">•</span>
                <span>
                  {calculateReadTime(latest.attributes.content)} min read
                </span>
              </div>
              <h2 className="group-hover:text-accentLight mb-4 max-w-2xl text-3xl font-bold text-white transition-all group-hover:underline">
                {latest.attributes.title}
              </h2>
            </div>
          </a>

          {/* Next 9 posts as cards */}
          <div className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {featured.map((post, idx) => (
              <a
                href={`/blog/${post.attributes.slug}`}
                key={post.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5"
              >
                <div className="p-2">
                  <div className="relative h-[200px] w-full overflow-hidden rounded-xl lg:h-[200px]">
                    <Image
                      src={
                        process.env.NEXT_PUBLIC_STRAPI_URL + getImageUrl(post)
                      }
                      alt={post.attributes.title}
                      fill
                      className="object-cover"
                      priority={idx === 0}
                      unoptimized
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6 pt-2">
                  <div className="text-secondaryText mb-2 flex items-center text-sm">
                    {formatTimestamp(
                      post.attributes.publish_date ||
                        post.attributes.publishedAt,
                    )}
                    <span className="mx-2">•</span>
                    <span>
                      {calculateReadTime(post.attributes.content)} min read
                    </span>
                  </div>
                  <h3 className="group-hover:text-accentLight text-lg leading-tight font-bold text-white transition-all group-hover:underline lg:text-xl">
                    {post.attributes.title}
                  </h3>
                </div>
              </a>
            ))}
          </div>

          {/* More articles as text links */}
          {more.length > 0 && (
            <div className="mx-auto max-w-[900px]">
              <h2 className="mb-6 text-2xl font-bold">More articles</h2>
              <div className="flex flex-col gap-4">
                {more.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.attributes.slug}`}
                    className="group flex flex-col items-start justify-between py-2 lg:flex-row lg:items-center"
                  >
                    <h3 className="group-hover:text-accentMedium text-xl font-bold transition-all group-hover:underline">
                      {post.attributes.title}
                    </h3>

                    <span className="text-secondaryText text-xs lg:pl-4">
                      {formatTimestamp(
                        post.attributes.publish_date ||
                          post.attributes.publishedAt,
                      )}
                      <span className="mx-1">•</span>
                      {calculateReadTime(post.attributes.content)} min read
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
