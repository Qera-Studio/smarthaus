import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticlePage } from "../../../components/Blog";
import { postInput } from "../../../components/Blog/post-metadata";
import { articleGraph, JsonLd } from "../../../components/Schema";
import { pageMetadata } from "../../../lib/metadata";
import { getBlogPage, getPost, getPosts } from "../../../sanity/content";

type Props = { params: Promise<{ slug: string }> };

/**
 * Every article published when the site is built. One published later is
 * rendered the first time it is asked for, and an address that is no
 * article's is a 404.
 */
export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? pageMetadata(postInput(post)) : {};
}

export default async function BlogPostPage({ params }: Props) {
  const [post, posts, blog] = await Promise.all([
    getPost((await params).slug),
    getPosts(),
    getBlogPage(),
  ]);
  if (!post) notFound();
  return (
    <>
      {post.seo.index ? (
        <JsonLd data={articleGraph(postInput(post), post, { path: "/blog", name: blog.heading })} />
      ) : null}
      <ArticlePage post={post} posts={posts} />
    </>
  );
}
