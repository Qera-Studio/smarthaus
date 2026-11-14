import Image from "next/image";
import Link from "next/link";

import { formatDate } from "../../lib/date";
import type { Post } from "../../sanity/types";
import styles from "./Blog.module.scss";

/** What a card shows of an article: enough to choose it, not its text. */
export type PostSummary = Pick<Post, "slug" | "title" | "date" | "tags" | "excerpt" | "image">;

export const summary = ({ slug, title, date, tags, excerpt, image }: Post): PostSummary => ({
  slug,
  title,
  date,
  tags,
  excerpt,
  image,
});

/**
 * One article, as a card: its picture, its title, its first tag and its date,
 * and the arrow that says it opens. The title is the link and the link covers
 * the card, so the whole card is one target with one name. The picture is
 * decoration beside a title that already says what the article is, so it has
 * no alt text; the arrow is drawn, and hidden from screen readers.
 *
 * `featured` is the newest article on the articles page: wide, with its
 * excerpt. `level` is the heading the title is, which depends on the page.
 */
export function ArticleCard({
  post,
  level,
  featured = false,
}: {
  post: PostSummary;
  level: "h2" | "h3";
  featured?: boolean;
}) {
  const Heading = level;
  return (
    <article className={styles.card} data-featured={featured ? "" : undefined}>
      <div className={styles.cardMedia}>
        <Image
          src={post.image.src}
          width={post.image.width}
          height={post.image.height}
          alt=""
          sizes={
            featured
              ? "(min-width: 64rem) 65vw, 100vw"
              : "(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw"
          }
        />
      </div>
      <div className={styles.cardText}>
        <Heading className={styles.cardTitle}>
          <Link className={styles.cardLink} href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </Heading>
        {featured ? <p className={styles.cardExcerpt}>{post.excerpt}</p> : null}
        <p className={styles.cardMeta}>
          <span>{post.tags[0]}</span>
          <span className={styles.dot} aria-hidden="true" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className={styles.open} aria-hidden="true" />
        </p>
      </div>
    </article>
  );
}
