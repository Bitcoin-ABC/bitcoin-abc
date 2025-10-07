// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import { getBlogPosts, sortBlogPostsByDate, BlogPost } from "../data/blog";
import ContentContainer from "../components/Atoms/ContentContainer";
import BlogSearch from "../components/Blog/BlogSearch";

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

  return (
    <ContentContainer className="py-18 max-w-[1000px] lg:py-24">
      <BlogSearch posts={posts} />
    </ContentContainer>
  );
}
