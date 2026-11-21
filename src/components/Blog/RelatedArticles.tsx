import type { Post } from "../../sanity/types";
import { ArticleCard, summary } from "./ArticleCard";
import styles from "./Blog.module.scss";

/** How many articles a page sends the reader to next. */
export const RELATED = 3;

/**
 * The newest RELATED articles, those carrying one of `tags` first. Chosen,
 * not picked by hand, so a new article never needs its neighbours edited.
 */
export function byTags(tags: readonly string[], posts: readonly Post[]): Post[] {
  const shares = (post: Post) => post.tags.some((tag) => tags.includes(tag));
  return [...posts.filter(shares), ...posts.filter((post) => !shares(post))].slice(0, RELATED);
}

/**
 * A rule, a heading and a row of article cards: under an article, and at the
 * foot of a solution page. Off the blog's pages it is `standalone`, carrying
 * the blog's tokens itself. Nothing at all when there is nothing to show.
 */
export function RelatedArticles({
  heading,
  posts,
  standalone = false,
}: {
  heading: string;
  posts: readonly Post[];
  standalone?: boolean;
}) {
  if (posts.length === 0) return null;
  return (
    <section
      className={standalone ? `${styles.related} ${styles.standalone}` : styles.related}
      aria-labelledby="related-articles"
    >
      <h2 className={styles.relatedTitle} id="related-articles">
        {heading}
      </h2>
      <ul className={styles.grid}>
        {posts.map((post) => (
          <li key={post.slug}>
            <ArticleCard post={summary(post)} level="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
