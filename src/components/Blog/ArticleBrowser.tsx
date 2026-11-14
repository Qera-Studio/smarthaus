"use client";

import { useRef, useState } from "react";

import { ArticleCard, type PostSummary } from "./ArticleCard";
import styles from "./Blog.module.scss";

/** Whether an article answers a search: every word typed, in its title or tags. */
export function matches(post: PostSummary, query: string, tag: string): boolean {
  if (tag && !post.tags.includes(tag)) return false;
  const haystack = `${post.title} ${post.tags.join(" ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * The articles page's one island: the heading row with its search field and
 * tag filter, and the list they narrow.
 *
 * Everything it lists is already on the page: the server sends every article
 * and this only chooses which to show, so nothing is fetched as you type and
 * without JavaScript the whole list simply stands. With nothing typed and no
 * tag chosen, the newest article is the wide panel and the rest follow in
 * rows; while narrowing, the panel gives way to plain rows, so a match is
 * never hidden behind a featured article it is not.
 *
 * There is no filter by date (2026-11-14): the list is already newest first,
 * and with a handful of articles a date filter narrows nothing.
 */
export function ArticleBrowser({
  heading,
  posts,
  tags,
}: {
  heading: string;
  posts: readonly PostSummary[];
  /** The tags worth offering: those some article carries, in the schema's order. */
  tags: readonly string[];
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const field = useRef<HTMLInputElement>(null);

  const narrowing = query.trim() !== "" || tag !== "";
  const shown = posts.filter((post) => matches(post, query, tag));
  const [featured, ...rest] = shown;
  const count = `${shown.length} ${shown.length === 1 ? "article" : "articles"}`;

  return (
    <>
      <header className={styles.indexHead}>
        <h1 className={styles.indexTitle}>{heading}</h1>
        {/* role, not the <search> element: older Safari and jsdom do not know it.
            The list narrows as you type, so the button sends nothing: it puts
            the field down, which on a phone closes the keyboard over the
            results. Without JavaScript it reloads the page, every article on it. */}
        <form
          className={styles.controls}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            field.current?.blur();
          }}
        >
          <div className={styles.searchField}>
            <label className="visually-hidden" htmlFor="blog-search">
              Search articles by title or tag
            </label>
            <input
              ref={field}
              className={styles.search}
              id="blog-search"
              type="search"
              placeholder="Search articles"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className={styles.searchButton} type="submit" aria-label="Search">
              <span className={styles.searchIcon} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.selectField}>
            <label className="visually-hidden" htmlFor="blog-tag">
              Filter by tag
            </label>
            <select
              className={styles.select}
              id="blog-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            >
              <option value="">All tags</option>
              {tags.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </header>

      {/* Said aloud as the list changes; silent until something narrows it. */}
      <p className="visually-hidden" role="status">
        {narrowing ? `${count} found` : ""}
      </p>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p>No articles match that. Try another word, or another tag.</p>
          <button
            className={styles.clear}
            type="button"
            onClick={() => {
              setQuery("");
              setTag("");
            }}
          >
            Clear the search
          </button>
        </div>
      ) : narrowing ? (
        <ul className={styles.grid} data-ruled="">
          {shown.map((post) => (
            <li key={post.slug}>
              <ArticleCard post={post} level="h2" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ArticleCard post={featured!} level="h2" featured />
          {rest.length > 0 ? (
            <ul className={styles.grid} data-ruled="">
              {rest.map((post) => (
                <li key={post.slug}>
                  <ArticleCard post={post} level="h2" />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </>
  );
}
