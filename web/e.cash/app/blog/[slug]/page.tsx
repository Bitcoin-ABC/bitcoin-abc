// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  getBlogPosts,
  sortBlogPostsByDate,
  formatTimestamp,
  calculateReadTime,
  getNextRecommendedPost,
} from "../../data/blog";
import ContentContainer from "../../components/Atoms/ContentContainer";
import BlogRecommendation from "../../components/Blog/BlogRecommendation";

// Length of time to cache the page in seconds
// Value must be a static export to work with Next.js
export const revalidate = 43200;

/**
 * Helper function to get a specific blog post by slug and all posts
 * This logic is shared between generateMetadata and the page component
 */
async function getBlogPostData(slug: string) {
  const allPosts = await getBlogPosts();
  const posts = sortBlogPostsByDate(allPosts);
  const post = posts.find((p) => p.attributes.slug === slug);

  if (!post) {
    return null;
  }

  const imageUrl =
    post.attributes.image.data.attributes.formats.medium?.url ||
    post.attributes.image.data.attributes.url;

  return {
    post,
    posts,
    imageUrl,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const data = await getBlogPostData(slug);

    if (!data) {
      return {
        title: "Blog Post Not Found",
      };
    }

    const { post, imageUrl } = data;

    return {
      title: post.attributes.title,
      description: post.attributes.short_content,
      openGraph: {
        title: post.attributes.title,
        description: post.attributes.short_content,
        images: [
          {
            url: `https://strapi.fabien.cash${imageUrl}`,
            alt: post.attributes.title,
          },
        ],
        type: "article",
        publishedTime:
          post.attributes.publish_date || post.attributes.publishedAt,
      },
      twitter: {
        card: "summary_large_image",
        title: post.attributes.title,
        description: post.attributes.short_content,
        images: [`https://strapi.fabien.cash${imageUrl}`],
      },
    };
  } catch {
    return {
      title: "eCash Blog Post",
    };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let data;
  try {
    data = await getBlogPostData(slug);
  } catch {
    return (
      <div className="text-center text-red-500">Failed to load blog post.</div>
    );
  }

  if (!data) {
    notFound();
  }

  const { post, posts, imageUrl } = data;
  const recommendedPost = getNextRecommendedPost(posts, slug);

  return (
    <ContentContainer className="pb-30 max-w-[650px] pt-20">
      <Link
        href="/blog"
        className="text-accentMedium mb-8 inline-block hover:underline"
      >
        ← Back to Blog
      </Link>
      <div className="mb-8">
        <div className="w-full overflow-hidden rounded-2xl border-t border-t-white/20 bg-white/5">
          <img
            src={`https://strapi.fabien.cash${imageUrl}`}
            alt={post.attributes.title}
            className="block h-auto w-full"
            loading="eager"
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
      {recommendedPost && <BlogRecommendation post={recommendedPost} />}
    </ContentContainer>
  );
}
