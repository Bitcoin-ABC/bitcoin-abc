// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Layout from '/components/layout';
import H3 from '/components/h3';
import { Container } from '/components/atoms';
import { getBlogPosts, sortBlogPostsByDate } from '/data/blog.js';
import {
    BlogCtn,
    FeaturedCardCtn,
    FeaturedCard,
    CardImage,
    TextCtn,
    Tag,
    CardCtn,
    Card,
    DateText,
} from '/styles/pages/blog.js';
import { formatTimestamp } from '/data/blog.js';
import fs from 'fs';
import RSS from 'rss';

function Blog(props) {
    const featuredPosts = props.posts.slice(0, 3);
    const posts = props.posts.slice(3);
    return (
        <Layout>
            <BlogCtn>
                <Container>
                    <H3 text="Latest News" />
                    <FeaturedCardCtn>
                        {featuredPosts.map((post, index) => (
                            <FeaturedCard
                                key={index}
                                href={`/blog/${post.attributes.slug}`}
                            >
                                <Tag>{post.attributes.type}</Tag>
                                <CardImage feature={index === 0 ? true : false}>
                                    <Image
                                        src={`https://strapi.fabien.cash/${post.attributes.image.data.attributes.formats.medium.url}`}
                                        alt={post.attributes.title}
                                        fill
                                        priority
                                    />
                                </CardImage>
                                <TextCtn>
                                    <DateText>
                                        {formatTimestamp(
                                            post.attributes.publish_date
                                                ? post.attributes.publish_date
                                                : post.attributes.publishedAt,
                                        )}
                                    </DateText>
                                    {index === 0 ? (
                                        <>
                                            <h2>{post.attributes.title}</h2>
                                            <p>
                                                {post.attributes.short_content}
                                            </p>
                                        </>
                                    ) : (
                                        <h3>{post.attributes.title}</h3>
                                    )}
                                </TextCtn>
                            </FeaturedCard>
                        ))}
                    </FeaturedCardCtn>
                    <CardCtn>
                        {posts.map((post, index) => (
                            <Card
                                key={index}
                                href={`/blog/${post.attributes.slug}`}
                            >
                                <Tag>{post.attributes.type}</Tag>
                                <CardImage>
                                    <Image
                                        src={`https://strapi.fabien.cash/${post.attributes.image.data.attributes.formats.small.url}`}
                                        alt={post.attributes.title}
                                        fill
                                    />
                                </CardImage>
                                <TextCtn>
                                    <DateText>
                                        {formatTimestamp(
                                            post.attributes.publish_date
                                                ? post.attributes.publish_date
                                                : post.attributes.publishedAt,
                                        )}
                                    </DateText>
                                    <h4>{post.attributes.title}</h4>
                                </TextCtn>
                            </Card>
                        ))}
                    </CardCtn>
                </Container>
            </BlogCtn>
        </Layout>
    );
}

/**
 * Converts JSON blog posts into XML format for RSS feed
 * @param {object} posts - the blog posts to be converted to XML format
 */
async function generateRssFeed(posts) {
    const feedOptions = {
        title: 'eCash Blog',
        description: 'Latest eCash news and information',
        site_url: process.env.NEXT_PUBLIC_SITE_URL,
        feed_url: `${process.env.NEXT_PUBLIC_SITE_URL}/rss.xml`,
        image_url: `${process.env.NEXT_PUBLIC_SITE_URL}/images/logos/ecash-logo-primary-horizontal-dark-text.png`,
        pubDate: new Date(),
        copyright: `©${new Date().getFullYear()}, Bitcoin ABC. All Rights Reserved.`,
    };

    const feed = new RSS(feedOptions);

    posts.map(post => {
        feed.item({
            title: post.attributes.title,
            description: post.attributes.short_content,
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.attributes.slug}`,
            date: post.attributes.publishedAt,
            enclosure: {
                url:
                    process.env.NEXT_PUBLIC_STRAPI_URL +
                    post.attributes.image.data.attributes.url,
                type: post.attributes.image.data.attributes.mime,
                length: post.attributes.image.data.attributes.size,
            },
        });
    });
    fs.writeFileSync('./public/rss.xml', feed.xml({ indent: true }));
}

/**
 * Call function to fetch blog api data and return posts
 * This only runs at build time, and the build should fail if the api call fails
 * @returns {object} props - page props to pass to the page
 * @throws {error} on bad API call or failure to parse API result
 */
export async function getStaticProps() {
    const posts = await getBlogPosts();
    const orderedPosts = await sortBlogPostsByDate(posts.props.posts);
    await generateRssFeed(orderedPosts);

    return {
        props: {
            posts: orderedPosts,
        },
    };
}

export default Blog;
