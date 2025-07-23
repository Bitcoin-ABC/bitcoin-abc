// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import { getBlogPosts, sortBlogPostsByDate, BlogPost } from "../../data/blog";
import ContentContainer from "../Atoms/ContentContainer";
import FeaturedArticlesClient from "./FeaturedArticlesClient";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 43200;

export default async function FeaturedArticles() {
  let posts: BlogPost[] = [];
  try {
    const allPosts = await getBlogPosts();
    posts = sortBlogPostsByDate(allPosts).slice(0, 3);
  } catch {
    return null;
  }

  return (
    <ContentContainer className="my-20 max-w-[1300px]">
      <FeaturedArticlesClient posts={posts} />
    </ContentContainer>
  );
}
