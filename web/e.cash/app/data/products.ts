// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface Product {
  name: string;
  description: string;
  url: string;
}

interface StrapiProductResponse {
  data: {
    attributes: {
      name: string;
      description: string;
      url: string;
    };
  }[];
}

/**
 * Fetches products for build page from the Strapi API.
 * @returns Array of products with their attributes
 */
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(
    process.env.NEXT_PUBLIC_STRAPI_URL + "/api/products-built-withs"
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  const data: StrapiProductResponse = await response.json();

  // Transform Strapi response to Product[]
  return data.data.map((item) => ({
    name: item.attributes.name,
    description: item.attributes.description,
    url: item.attributes.url,
  }));
}
