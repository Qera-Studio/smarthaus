import Image from "next/image";
import Link from "next/link";

import { formatDate } from "../../lib/date";
import { readMinutes } from "../../lib/reading-time";
import type { Post } from "../../sanity/types";
import { ArticleBody } from "./ArticleBody";
import styles from "./Blog.module.scss";
import { byTags, RelatedArticles } from "./RelatedArticles";

export { RELATED } from "./RelatedArticles";

/**
 * The articles to read next: the newest others, those that share a tag with
 * this one first.
 */
export function related(post: Post, posts: readonly Post[]): Post[] {
  return byTags(
    post.tags,
    posts.filter((other) => other.slug !== post.slug),
  );
}

/**
 * One article (Figma 4898:2609): the way back, then a column a thousand
 * pixels wide with the title, who wrote it, its tags, its date and how long
 * it takes to read, the main picture and the text; under it, the articles to
 * read next.
 *
 * The h1 is the title. The main picture is the page's largest paint, so it
 * alone is fetched at high priority.
 */
export function ArticlePage({ post, posts }: { post: Post; posts: readonly Post[] }) {
  return (
    <div className={styles.page} data-blog-article="">
      <Link className={styles.back} href="/blog">
        <span className={styles.backIcon} aria-hidden="true" />
        Back
      </Link>

      <article className={styles.article}>
        <h1 className={styles.title}>{post.title}</h1>

        <dl className={styles.meta}>
          <div>
            <dt>by:</dt>
            <dd>{post.author}</dd>
          </div>
          <div>
            <dt>tags:</dt>
            <dd>
              <ul className={styles.tags}>
                {post.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>date:</dt>
            <dd>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </dd>
          </div>
          <div>
            <dt>read:</dt>
            <dd>{readMinutes(post.body)} min</dd>
          </div>
        </dl>

        <div className={styles.hero}>
          <Image
            src={post.image.src}
            width={post.image.width}
            height={post.image.height}
            alt={post.image.alt}
            sizes="(min-width: 65rem) 1000px, 100vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        <ArticleBody nodes={post.body} />
      </article>

      <RelatedArticles heading="Related articles" posts={related(post, posts)} />
    </div>
  );
}
