// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface ExchangeImageFormat {
  url: string;
  mime: string;
  size: number;
}

export interface ExchangeImageData {
  attributes: {
    formats: {
      medium?: ExchangeImageFormat;
      small?: ExchangeImageFormat;
      [key: string]: ExchangeImageFormat | undefined;
    };
    url: string;
    mime: string;
    size: number;
  };
}

export interface ExchangeAttributes {
  name: string;
  description: string;
  url: string;
  logo: {
    data: ExchangeImageData;
  };
  featured?: boolean;
  score?: number;
  withdrawals_working?: boolean;
  deposits_working?: boolean;
  ecash_deposit_address_format?: boolean;
  deposit_confirmations?: number;
  withdrawal_fee?: number;
  trading_pairs?: string[];
  decimal_places?: number;
  [key: string]: unknown;
}

export interface Exchange {
  id: number;
  attributes: ExchangeAttributes;
}

export interface InstantExchangeAttributes {
  name: string;
  description: string;
  url: string;
  logo: {
    data: ExchangeImageData;
  };
  featured?: boolean;
  score?: number;
  trading_open?: boolean;
  ecash_deposit_address_format?: boolean;
  deposit_confirmations?: number;
  decimal_place?: number;
  issues?: string | null;
  [key: string]: unknown;
}

export interface InstantExchange {
  id: number;
  attributes: InstantExchangeAttributes;
}

// Generic interface for scoring criteria
export interface ScoringCriteria {
  attribute: string;
  value?: boolean;
  min?: number;
  max?: number;
  score: number;
}

// Generic interface for items that can be scored
export interface ScoreableItem {
  id: number;
  attributes: {
    name: string;
    score?: number;
    deposit_confirmations?: number;
    [key: string]: unknown;
  };
}

// Make Exchange and InstantExchange extend ScoreableItem
export interface Exchange extends ScoreableItem {
  attributes: ExchangeAttributes;
}

export interface InstantExchange extends ScoreableItem {
  attributes: InstantExchangeAttributes;
}

export const exchangeScoringCriteria: ScoringCriteria[] = [
  {
    attribute: "withdrawals_working",
    value: true,
    score: 20,
  },
  {
    attribute: "deposits_working",
    value: true,
    score: 20,
  },
  {
    attribute: "ecash_deposit_address_format",
    value: true,
    score: 20,
  },
  {
    attribute: "deposit_confirmations",
    min: 0,
    max: 1,
    score: 15,
  },
  {
    attribute: "withdrawal_fee",
    min: 0,
    max: 100,
    score: 10,
  },
  {
    attribute: "withdrawal_fee",
    min: 100,
    max: 1000,
    score: 5,
  },
  {
    attribute: "trading_pairs",
    min: 2,
    score: 10,
  },
  {
    attribute: "decimal_places",
    min: 2,
    max: 2,
    score: 5,
  },
];

export const instantExchangeScoringCriteria: ScoringCriteria[] = [
  {
    attribute: "trading_open",
    value: true,
    score: 30,
  },
  {
    attribute: "ecash_deposit_address_format",
    value: true,
    score: 25,
  },
  {
    attribute: "deposit_confirmations",
    min: 0,
    max: 1,
    score: 25,
  },
  {
    attribute: "decimal_place",
    min: 2,
    max: 2,
    score: 10,
  },
  {
    attribute: "issues",
    score: 10,
  },
];

export const servicesScoringCriteria: ScoringCriteria[] = [
  {
    attribute: "ecash_address_format",
    value: true,
    score: 40,
  },
  {
    attribute: "decimal_place",
    min: 2,
    max: 2,
    score: 30,
  },
  {
    attribute: "issues",
    score: 30,
  },
];

export function getScores<T extends ScoreableItem>(
  data: T[],
  scoringCriteria: ScoringCriteria[]
): T[] {
  for (let i = 0; i < data.length; ++i) {
    const item = data[i].attributes;
    let score = 0;

    scoringCriteria.forEach((criteria) => {
      const attributeValue = item[criteria.attribute];

      if (criteria.value && attributeValue === criteria.value) {
        score += criteria.score;
      } else if (
        criteria.min !== undefined &&
        criteria.min >= 0 &&
        criteria.max !== undefined &&
        attributeValue !== null &&
        typeof attributeValue === "number" &&
        attributeValue >= criteria.min &&
        attributeValue <= criteria.max
      ) {
        score += criteria.score;
      } else if (
        criteria.attribute === "trading_pairs" &&
        Array.isArray(attributeValue) &&
        criteria.min !== undefined &&
        (attributeValue as string[]).length >= criteria.min
      ) {
        score += criteria.score;
      } else if (
        criteria.attribute === "issues" &&
        (attributeValue === null || attributeValue === "")
      ) {
        score += criteria.score;
      }
    });
    (item as { score: number }).score = score;
  }
  return data;
}

export function sortExchanges<T extends ScoreableItem>(
  data: T[],
  threshold: number = 60
): T[] {
  data.sort((a, b) => a.attributes.name.localeCompare(b.attributes.name));
  data.sort(
    (a, b) =>
      (a.attributes.deposit_confirmations || 0) -
      (b.attributes.deposit_confirmations || 0)
  );
  data.sort((a, b) => (b.attributes.score || 0) - (a.attributes.score || 0));

  // Filter out items with a score below the threshold
  return data.filter(
    (item) =>
      (item.attributes.score || 0) >= threshold &&
      item.attributes.score !== undefined &&
      item.attributes.score !== null &&
      item.attributes.score >= 0
  );
}

export async function getScoreCardData() {
  let responses;
  try {
    responses = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL}/api/exchanges?pagination[pageSize]=100&populate=*`
      ).then((res) => res.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL}/api/instant-exchanges?pagination[pageSize]=100&populate=*`
      ).then((res) => res.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_SCORECARD_URL}/api/apps-services?pagination[pageSize]=100&populate=*`
      ).then((res) => res.json()),
    ]);

    const exchanges = responses[0].data || [];
    const instantExchanges = responses[1].data || [];
    const services = responses[2].data || [];

    return {
      exchanges: sortExchanges(
        getScores(exchanges as Exchange[], exchangeScoringCriteria)
      ) as Exchange[],
      instantExchanges: sortExchanges(
        getScores(
          instantExchanges as InstantExchange[],
          instantExchangeScoringCriteria
        )
      ) as InstantExchange[],
      services: sortExchanges(
        getScores(services as ScoreableItem[], servicesScoringCriteria)
      ),
    };
  } catch (error) {
    console.error("Error fetching exchange data:", error);
    return {
      exchanges: [] as Exchange[],
      instantExchanges: [] as InstantExchange[],
      services: [] as ScoreableItem[],
    };
  }
}
