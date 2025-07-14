// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Cache interval for blog posts (in seconds)
 *
 * This controls how often Next.js will re-fetch blog data from the Strapi CMS.
 * Set to balance content freshness with API ping rate.
 *
 * - Lower values = more frequent updates but higher API usage
 * - Higher values = less API calls but potentially stale content
 * - Set to 0 to disable caching and fetch on every request
 */
export const CACHE_INTERVAL_SECONDS = 43200;
