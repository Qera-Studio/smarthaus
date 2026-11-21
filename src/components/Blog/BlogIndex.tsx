import { BLOG_TAGS } from "../../sanity/schema/blog";
import { getBlogPage, getPosts } from "../../sanity/content";
import { ArticleBrowser } from "./ArticleBrowser";
import { summary } from "./ArticleCard";
import styles from "./Blog.module.scss";

/**
 * The articles page (Figma 4900:2914): a heading with the search and the tag
 * filter beside it, the newest article as a wide panel, and the rest in rows
 * of three. A Server Component that hands every article's card to
 * ArticleBrowser, the one island, which only chooses among them.
 */
export async function BlogIndex() {
  const [{ heading }, posts] = await Promise.all([getBlogPage(), getPosts()]);
  const used = new Set(posts.flatMap((post) => post.tags));
  return (
    <div className={styles.index} data-blog-index="">
      <ArticleBrowser
        heading={heading}
        posts={posts.map(summary)}
        tags={BLOG_TAGS.filter((tag) => used.has(tag))}
      />
    </div>
  );
}
