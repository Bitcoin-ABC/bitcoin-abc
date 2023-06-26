// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Fetch blog posts page count
 * The API has a response limit
 * Need to determine page count in order to fetch all posts
 * @returns {number} the number of blog post pages
 */
export async function getPageCount() {
    let response;
    try {
        response = await fetch('https://strapi.fabien.cash/api/posts').then(
            res => res.json(),
        );
        return response.meta.pagination.pageCount;
    } catch (err) {
        throw new Error(err);
    }
}

/**
 * Fetch blog posts and return array of combined responses
 * Use the response from getPageAmount to call each page
 * Add each page response to a responses array
 * return the responses in a props object to be used with getStaticProps
 * @returns {object} props object containing blog posts responses
 */
export async function getBlogPosts() {
    let response,
        responses = [],
        propsObj;
    let pageCount = await getPageCount();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        try {
            response = await fetch(
                `https://strapi.fabien.cash/api/posts?pagination[page]=${pageNumber}&populate=*&sort=id:desc`,
            ).then(res => res.json());
            responses = [...responses, ...response.data];
        } catch (err) {
            throw new Error(err);
        }
    }
    propsObj = {
        props: responses,
    };
    return propsObj;
}
