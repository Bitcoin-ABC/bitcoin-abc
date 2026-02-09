// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface BlogImageFormat {
  url: string;
  mime: string;
  size: number;
}

export interface BlogImageData {
  attributes: {
    formats: {
      medium?: BlogImageFormat;
      small?: BlogImageFormat;
      [key: string]: BlogImageFormat | undefined;
    };
    url: string;
    mime: string;
    size: number;
  };
}

export interface BlogPostAttributes {
  title: string;
  content: string;
  short_content: string;
  type: string;
  media_link?: string;
  publish_date?: string;
  publishedAt: string;
  slug: string;
  featured: boolean;
  image: {
    data: BlogImageData;
  };
}

export interface BlogPost {
  id: number;
  attributes: BlogPostAttributes;
}

export async function getPageCount(): Promise<number> {
  const response = await fetch(
    process.env.NEXT_PUBLIC_STRAPI_URL + "/api/posts",
  ).then((res) => res.json());
  return response.meta.pagination.pageCount;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const pageCount = await getPageCount();
  let posts: BlogPost[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const response = await fetch(
      process.env.NEXT_PUBLIC_STRAPI_URL +
        `/api/posts?pagination[page]=${pageNumber}&populate=*&sort=publishedAt:desc`,
    ).then((res) => res.json());
    posts = [...posts, ...response.data];
  }
  return posts;
}

export function sortBlogPostsByDate(posts: BlogPost[]): BlogPost[] {
  return posts.slice().sort((postA, postB) => {
    const dateA = postA.attributes.publish_date || postA.attributes.publishedAt;
    const dateB = postB.attributes.publish_date || postB.attributes.publishedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid timestamp");
  }
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

export function evaluateMediaLink(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate read time in minutes based on word count
 * Assumes average reading speed of 200-250 words per minute
 * @param content - HTML content string
 * @returns estimated read time in minutes
 */
export function calculateReadTime(content: string): number {
  // Remove HTML tags to get plain text
  const plainText = content.replace(/<[^>]*>/g, "");

  // Count words (split by whitespace and filter out empty strings)
  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Average reading speed: 225 words per minute
  const wordsPerMinute = 225;

  // Calculate read time and round to nearest minute (minimum 1 minute)
  const readTime = Math.max(1, Math.round(wordCount / wordsPerMinute));

  return readTime;
}

/**
 * Get the next recommended blog post (the post published just before the current one)
 * @param posts - Array of all blog posts sorted by date
 * @param currentSlug - Slug of the current blog post to exclude
 * @returns The blog post published just before the current one, or null if none available
 */
export function getNextRecommendedPost(
  posts: BlogPost[],
  currentSlug: string,
): BlogPost | null {
  const currentIndex = posts.findIndex(
    (post) => post.attributes.slug === currentSlug,
  );

  // If current post not found or it's the last post, return null
  if (currentIndex === -1 || currentIndex === posts.length - 1) {
    return null;
  }

  // Return the post that comes after the current one (which is chronologically before it)
  return posts[currentIndex + 1];
}
