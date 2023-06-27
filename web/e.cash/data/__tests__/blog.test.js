// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { getPageCount, getBlogPosts } from '../blog.js';
import {
    mockBlogPosts1,
    mockBlogPosts2,
    mockBlogPosts3,
} from '../__mocks__/blogMock.js';

describe('getPageCount', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });
    afterEach(() => {
        global.fetch.mockClear();
        delete global.fetch;
    });

    it('should call an api endpoint and return a number from the response', async () => {
        const mockResponse = {
            meta: {
                pagination: {
                    pageCount: 5,
                },
            },
        };

        global.fetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await getPageCount();

        expect(global.fetch).toHaveBeenCalledWith(
            'https://strapi.fabien.cash/api/posts',
        );
        expect(result).toEqual(5);
    });

    it('should throw an error when fetch fails', async () => {
        global.fetch.mockImplementation(() => {
            throw new Error('Failed to fetch api');
        });

        await expect(getPageCount()).rejects.toThrow('Failed to fetch api');
    });

    it('should throw an error if api returns wrong shape', async () => {
        const mockBadResponse = {
            meta: {},
        };
        global.fetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue(mockBadResponse),
        });

        await expect(getPageCount()).rejects.toThrow(
            "TypeError: Cannot read properties of undefined (reading 'pageCount')",
        );
    });
});

describe('getBlogPosts', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });
    afterEach(() => {
        global.fetch.mockClear();
        delete global.fetch;
    });

    it('should fetch each page for the blog posts api and return the responses', async () => {
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({
                meta: { pagination: { pageCount: 3 } },
            }),
        });
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ data: mockBlogPosts1 }),
        });
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ data: mockBlogPosts2 }),
        });
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ data: mockBlogPosts3 }),
        });

        const result = await getBlogPosts();

        expect(fetch).toHaveBeenNthCalledWith(
            1,
            'https://strapi.fabien.cash/api/posts',
        );
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            'https://strapi.fabien.cash/api/posts?pagination[page]=1&populate=*&sort=id:desc',
        );
        expect(fetch).toHaveBeenNthCalledWith(
            3,
            'https://strapi.fabien.cash/api/posts?pagination[page]=2&populate=*&sort=id:desc',
        );
        expect(fetch).toHaveBeenNthCalledWith(
            4,
            'https://strapi.fabien.cash/api/posts?pagination[page]=3&populate=*&sort=id:desc',
        );

        expect(result).toEqual({
            props: {
                posts: [
                    ...mockBlogPosts1,
                    ...mockBlogPosts2,
                    ...mockBlogPosts3,
                ],
            },
        });
    });

    it('should throw an error when fetch fails', async () => {
        global.fetch.mockImplementation(() => {
            throw new Error('Failed to fetch api');
        });

        await expect(getBlogPosts()).rejects.toThrow('Failed to fetch api');
    });
});
