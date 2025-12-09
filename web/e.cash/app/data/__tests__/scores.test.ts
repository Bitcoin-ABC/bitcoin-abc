// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
  getScores,
  getScoreCardData,
  sortExchanges,
  exchangeScoringCriteria,
  instantExchangeScoringCriteria,
  servicesScoringCriteria,
  type ScoreableItem,
} from "../scores";

// Example of API response shape
const mockExchangesApiResponse = {
  data: [
    {
      id: 1,
      attributes: {
        name: "Exchange_A",
        withdrawals_working: true,
        deposits_working: true,
        ecash_deposit_address_format: true,
        deposit_confirmations: 1,
        withdrawal_fee: 50,
        trading_pairs: ["XEC/BTC", "XEC/USD", "XEC/ETH"],
        decimal_places: 2,
        issues: "",
      },
    },
    {
      id: 2,
      attributes: {
        name: "Exchange_B",
        withdrawals_working: true,
        deposits_working: true,
        ecash_deposit_address_format: true,
        deposit_confirmations: 1,
        withdrawal_fee: 150,
        trading_pairs: ["XEC/BTC", "XEC/USD"],
        decimal_places: 2,
        issues: null,
      },
    },
    {
      id: 3,
      attributes: {
        name: "Exchange_C",
        withdrawals_working: false,
        deposits_working: false,
        ecash_deposit_address_format: false,
        deposit_confirmations: 5,
        withdrawal_fee: 500,
        trading_pairs: ["XEC/BTC"],
        decimal_places: 1,
        issues: "has issue",
      },
    },
    {
      id: 4,
      attributes: {
        name: "Exchange_D",
        withdrawals_working: false,
        deposits_working: false,
        ecash_deposit_address_format: false,
        deposit_confirmations: 6,
        withdrawal_fee: 1000,
        trading_pairs: [],
        decimal_places: 1,
        issues: "has issue",
      },
    },
  ],
};

describe("getScores", () => {
  it("should add a score for each object in an array based on the scoring criteria", () => {
    const exchangesResult = getScores(
      mockExchangesApiResponse.data,
      exchangeScoringCriteria,
    );

    // Exchange_A: 20+20+20+15+10+10+5 = 100
    expect(exchangesResult[0].attributes.score).toEqual(100);
    // Exchange_B: 20+20+20+15+5+10+5 = 95
    expect(exchangesResult[1].attributes.score).toEqual(95);
    // Exchange_C: 0+0+0+0+5+0+0 = 5 (withdrawal_fee: 500 matches min:100, max:1000)
    expect(exchangesResult[2].attributes.score).toEqual(5);
    // Exchange_D: 0+0+0+0+5+0+0 = 5 (withdrawal_fee: 1000 matches min:100, max:1000)
    expect(exchangesResult[3].attributes.score).toEqual(5);
  });

  it("should handle instant exchange scoring criteria correctly", () => {
    const instantExchangeData: ScoreableItem[] = [
      {
        id: 1,
        attributes: {
          name: "Instant_A",
          trading_open: true,
          ecash_deposit_address_format: true,
          deposit_confirmations: 1,
          decimal_place: 2,
          issues: null,
        },
      },
    ];

    const result = getScores(
      instantExchangeData,
      instantExchangeScoringCriteria,
    );
    // 30+25+25+10+10 = 100
    expect(result[0].attributes.score).toEqual(100);
  });

  it("should handle services scoring criteria correctly", () => {
    const servicesData: ScoreableItem[] = [
      {
        id: 1,
        attributes: {
          name: "Service_A",
          ecash_address_format: true,
          decimal_place: 2,
          issues: null,
        },
      },
    ];

    const result = getScores(servicesData, servicesScoringCriteria);
    // 40+30+30 = 100
    expect(result[0].attributes.score).toEqual(100);
  });
});

describe("sortExchanges", () => {
  it("should sort exchanges by name, then deposit confirmations, then score, and filter by score threshold", () => {
    const testCases = [
      { threshold: 0, resultSlice: 5 },
      { threshold: 40, resultSlice: 4 },
      { threshold: 70, resultSlice: 3 },
      { threshold: 100, resultSlice: 1 },
    ];

    const scoredMockExchanges = [
      {
        id: 1,
        attributes: {
          name: "Exchange_A",
          deposit_confirmations: 1,
          score: 100,
        },
      },
      {
        id: 2,
        attributes: {
          name: "Exchange_C",
          deposit_confirmations: 1,
          score: 80,
        },
      },
      {
        id: 3,
        attributes: {
          name: "Exchange_B",
          deposit_confirmations: 3,
          score: 80,
        },
      },
      {
        id: 4,
        attributes: {
          name: "Exchange_D",
          deposit_confirmations: 3,
          score: 40.453,
        },
      },
      {
        id: 5,
        attributes: {
          name: "Exchange_E",
          deposit_confirmations: 6,
          score: 0,
        },
      },
      {
        id: 6,
        attributes: {
          name: "Exchange_F",
          deposit_confirmations: 6,
          score: -10,
        },
      },
      {
        id: 7,
        attributes: {
          name: "Exchange_G",
          score: null,
        },
      },
      {
        id: 8,
        attributes: {
          name: "Exchange_H",
          score: undefined,
        },
      },
      {
        id: 9,
        attributes: {
          name: "Exchange_I",
        },
      },
    ];

    const shuffleArray = <T>(array: T[]): T[] => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    for (let i = 0; i < testCases.length; i++) {
      const result = sortExchanges(
        shuffleArray([...scoredMockExchanges]),
        testCases[i].threshold,
      );
      expect(result).toEqual(
        scoredMockExchanges.slice(0, testCases[i].resultSlice),
      );
    }
  });

  it("should filter out items with scores below threshold", () => {
    const exchanges = [
      {
        id: 1,
        attributes: {
          name: "Exchange_A",
          score: 100,
        },
      },
      {
        id: 2,
        attributes: {
          name: "Exchange_B",
          score: 50,
        },
      },
      {
        id: 3,
        attributes: {
          name: "Exchange_C",
          score: 30,
        },
      },
    ];

    const result = sortExchanges(exchanges);
    // Only Exchange_A should remain (score >= 60)
    expect(result).toHaveLength(1);
    expect(result[0].attributes.name).toBe("Exchange_A");
  });
});

describe("getScoreCardData", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockClear();
    delete (global as { fetch: unknown }).fetch;
  });

  const mockExchangeData = { data: [] };
  const mockInstantExchangeData = { data: [] };
  const mockServicesData = { data: [] };

  it("successfully retrieves and processes data", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/exchanges")) {
        return Promise.resolve({
          json: () => Promise.resolve(mockExchangeData),
        });
      }
      if (url.includes("/api/instant-exchanges")) {
        return Promise.resolve({
          json: () => Promise.resolve(mockInstantExchangeData),
        });
      }
      if (url.includes("/api/apps-services")) {
        return Promise.resolve({
          json: () => Promise.resolve(mockServicesData),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const result = await getScoreCardData();

    expect(result).toHaveProperty("exchanges");
    expect(result).toHaveProperty("instantExchanges");
    expect(result).toHaveProperty("services");

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockImplementation(() => {
      throw new Error("Failed to fetch api");
    });

    const result = await getScoreCardData();

    expect(result).toEqual({
      exchanges: [],
      instantExchanges: [],
      services: [],
    });
  });

  it("should handle empty or undefined responses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockExchangesApiResponse.data),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockExchangesApiResponse.data),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve(undefined) });

    const result = await getScoreCardData();

    expect(result).toHaveProperty("exchanges");
    expect(result).toHaveProperty("instantExchanges");
    expect(result).toHaveProperty("services");
  });
});
