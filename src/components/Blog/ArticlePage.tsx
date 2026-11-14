import Image from "next/image";
import Link from "next/link";

import { formatDate } from "../../lib/date";
import type { Post } from "../../sanity/types";
import { ArticleBody } from "./ArticleBody";
import { ArticleCard, summary } from "./ArticleCard";
import styles from "./Blog.module.scss";

/** How many other articles follow one. */
export const RELATED = 3;

/**
 * The articles to read next: the newest others, those that share a tag with
 * this one first. Chosen, not picked by hand, so a new article never needs
 * its neighbours edited.
 */
export function related(post: Post, posts: readonly Post[]): Post[] {
  const others = posts.filter((other) => other.slug !== post.slug);
  const shares = (other: Post) => other.tags.some((tag) => post.tags.includes(tag));
  return [...others.filter(shares), ...others.filter((other) => !shares(other))].slice(0, RELATED);
}

/**
 * One article (Figma 4898:2609): the way back, then a column a thousand
 * pixels wide with the title, who wrote it, its tags and its date, the main
 * picture and the text; under it, the articles to read next.
 *
 * The h1 is the title. The main picture is the page's largest paint, so it
 * alone is fetched at high priority.
 */
export function ArticlePage({ post, posts }: { post: Post; posts: readonly Post[] }) {
  const next = related(post, posts);
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

      {next.length > 0 ? (
        <section className={styles.related} aria-labelledby="related-articles">
          <h2 className={styles.relatedTitle} id="related-articles">
            Related articles
          </h2>
          <ul className={styles.grid}>
            {next.map((other) => (
              <li key={other.slug}>
                <ArticleCard post={summary(other)} level="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
