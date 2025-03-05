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
        posts = [],
        propsObj;
    let pageCount = await getPageCount();
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        try {
            response = await fetch(
                `https://strapi.fabien.cash/api/posts?pagination[page]=${pageNumber}&populate=*&sort=publishedAt:desc`,
            ).then(res => res.json());
            posts = [...posts, ...response.data];
        } catch (err) {
            throw new Error(err);
        }
    }
    propsObj = {
        props: { posts },
    };
    return propsObj;
}

/**
 * Sort blog posts by date and return them in a props object
 * @returns {object} props object containing blog posts responses
 * sorted by date to be used with getStaticProps
 */
export async function sortBlogPostsByDate(posts) {
    const customSort = (postA, postB) => {
        const dateA =
            postA.attributes.publish_date || postA.attributes.publishedAt; // Check for the presence of 'publish_date' or 'publishedAt'
        const dateB =
            postB.attributes.publish_date || postB.attributes.publishedAt;

        // Convert both date formats to comparable formats
        const dateAFormatted = new Date(dateA).getTime();
        const dateBFormatted = new Date(dateB).getTime();

        return dateBFormatted - dateAFormatted; // Sort in descending order (latest first)
    };
    // Sort the posts array using the custom sorting function. Use slice() to avoid mutating the original array
    const sortedPosts = posts.slice().sort(customSort);
    return sortedPosts;
}

/**
 * Convert a timestamp into a more readable format
 * @param {string} timestamp - the timestamp to convert
 * accepts UTC, Unix, and UTC string representation timestamps
 * should throw error if non valid timestamp is passed to it
 * @returns {string} formatted date string
 */
export const formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    if (isNaN(date)) {
        throw new Error('Invalid timestamp');
    }
    const options = {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
};

/**
 * Evalute if media_link is a valid url
 * @param {string} string - the value of media_link
 * @returns {boolen} if it is or isn't a valid url
 */
export const evaluateMediaLink = string => {
    let _url;
    try {
        _url = new URL(string);
    } catch {
        return false;
    }
    return true;
};
