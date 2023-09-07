// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Layout from '/components/layout';
import Image from 'next/image';
import CustomLink from '/components/custom-link';
import H3 from '/components/h3';
import { Container } from '/components/atoms';
import { getBlogPosts } from '/data/blog';
import {
    PostCtn,
    MainPostImage,
    DateText,
    NextPostCtn,
    Card,
    Tag,
    CardImage,
    TextCtn,
    PostBorder,
    MediaLink,
} from '/styles/pages/blog.js';
import { formatTimestamp, evaluateMediaLink } from '/data/blog.js';

const STRAPI_URL = 'https://strapi.fabien.cash';

function BlogPost({ post, keepReadingPosts }) {
    return (
        <Layout
            metaTitle={post.attributes.title}
            metaDescription={post.attributes.short_content}
        >
            <PostCtn>
                <Container narrow>
                    <DateText>
                        {formatTimestamp(
                            post.attributes.publish_date
                                ? post.attributes.publish_date
                                : post.attributes.publishedAt,
                        )}
                    </DateText>
                    <H3 text={post.attributes.title} />
                    {evaluateMediaLink(post.attributes.media_link) && (
                        <MediaLink>
                            Originally published on{' '}
                            <CustomLink href={post.attributes.media_link}>
                                {new URL(post.attributes.media_link).hostname}
                            </CustomLink>
                        </MediaLink>
                    )}
                    <MainPostImage>
                        <Image
                            src={`${STRAPI_URL}/${post.attributes.image.data.attributes.url}`}
                            fill
                            alt={post.attributes.title}
                            priority
                        />
                    </MainPostImage>
                    <PostBorder>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: post.attributes.content,
                            }}
                        />
                    </PostBorder>
                    <H3 text="You may also like" />
                    <NextPostCtn>
                        {keepReadingPosts.map((post, index) => (
                            <>
                                {post ? (
                                    <Card
                                        key={index}
                                        href={`/blog/${post.attributes.slug}`}
                                    >
                                        <Tag>{post.attributes.type}</Tag>
                                        <CardImage>
                                            <Image
                                                src={`${STRAPI_URL}/${post.attributes.image.data.attributes.formats.small.url}`}
                                                alt={post.attributes.title}
                                                fill
                                            />
                                        </CardImage>
                                        <TextCtn>
                                            <DateText>
                                                {formatTimestamp(
                                                    post.attributes.publish_date
                                                        ? post.attributes
                                                              .publish_date
                                                        : post.attributes
                                                              .publishedAt,
                                                )}
                                            </DateText>
                                            <h4>{post.attributes.title}</h4>
                                        </TextCtn>
                                    </Card>
                                ) : null}
                            </>
                        ))}
                    </NextPostCtn>
                </Container>
            </PostCtn>
        </Layout>
    );
}

/**
 * Get all blog paths
 * This only runs at build time, and the build should fail if the api call fails
 * @returns {object} paths - an object with all of the post slugs
 */
export async function getStaticPaths() {
    const posts = await getBlogPosts();
    const paths = posts.props.posts.map(item => ({
        params: { slug: item.attributes.slug },
    }));

    return { paths, fallback: false };
}

/**
 * Get the staticProps for a given slug
 * Uses the params object from getStaticPaths to determine the slug for the page
 * Gets the data for next and previous posts
 * This only runs at build time, and the build should fail if the api call fails
 * @returns {object} props - an object with api data for the posts
 */
export async function getStaticProps({ params }) {
    const posts = await getBlogPosts();
    const post =
        posts.props.posts.find(obj => obj.attributes['slug'] === params.slug) ||
        null;
    const nextPost =
        posts.props.posts.find(obj => obj.id === post.id + 1) || null;
    const previousPost =
        posts.props.posts.find(obj => obj.id === post.id - 1) || null;
    const keepReadingPosts = [nextPost, previousPost];

    return {
        props: {
            post,
            keepReadingPosts,
        },
    };
}

export default BlogPost;
