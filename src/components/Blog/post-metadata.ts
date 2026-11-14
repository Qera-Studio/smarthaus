import { seoInput, type PageMetadataInput } from "../../lib/metadata";
import { postPath } from "../../sanity/content";
import type { Post } from "../../sanity/types";

/** An article's metadata input: its own seo field, picture, date and byline. */
export function postInput(post: Post): PageMetadataInput {
  return {
    ...seoInput(postPath(post.slug), post.seo),
    image: { src: post.image.src, alt: post.image.alt },
    article: {
      published: post.date,
      ...(post.updatedAt ? { modified: post.updatedAt } : {}),
      author: post.author,
    },
  };
}
