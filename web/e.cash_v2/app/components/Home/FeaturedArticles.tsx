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

// Hand-picked slugs to feature (max 4 will be used)
// Populate this array with blog post slugs to pin them in Featured Articles
const HANDPICKED_SLUGS: string[] = [
  "avalanche",
  "IFP",
  "instant-finality",
  "chronik",
];

export default async function FeaturedArticles() {
  let featuredPosts: BlogPost[] = [];
  try {
    const allPosts = await getBlogPosts();
    const postsByDate = sortBlogPostsByDate(allPosts);

    const isMonthlyRecap = (post: BlogPost): boolean => {
      const title = post.attributes.title?.toLowerCase?.() || "";
      if (title.includes("monthly recap")) return true;
      return false;
    };

    const latestNonRecap = postsByDate.find((p) => !isMonthlyRecap(p));
    const latestMonthlyRecap = postsByDate.find((p) => isMonthlyRecap(p));

    const handpickedSlugs = HANDPICKED_SLUGS.slice(0, 4);

    const slugToPost = new Map<string, BlogPost>();
    for (const post of postsByDate) {
      slugToPost.set(post.attributes.slug, post);
    }
    const handpickedPosts: BlogPost[] = handpickedSlugs
      .map((slug) => slugToPost.get(slug))
      .filter((p): p is BlogPost => Boolean(p));

    const combined: BlogPost[] = [
      latestNonRecap,
      latestMonthlyRecap,
      ...handpickedPosts,
    ].filter((p): p is BlogPost => Boolean(p));

    // Deduplicate posts in case the same post appears in multiple categories
    const seen = new Set<number>();
    featuredPosts = combined
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, 6);
  } catch {
    return null;
  }

  return (
    <ContentContainer className="my-20 max-w-[1300px]">
      <FeaturedArticlesClient posts={featuredPosts} />
    </ContentContainer>
  );
}
