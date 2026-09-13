import type { Metadata } from "next";
import Link from "next/link";
import { ParticleText } from "../components/ParticleText";
import styles from "./not-found.module.scss";

export const metadata: Metadata = {
  title: "Page not found",
  // No `robots` here on purpose. Next.js already emits
  // <meta name="robots" content="noindex"> for not-found, so declaring it again
  // produced TWO robots tags in the head — verified in the built output. One
  // directive, from the framework.
};

export default function NotFound() {
  return (
    <section className={styles.page}>
      {/*
        The <h1> lives inside ParticleText as real text — the canvas is
        decorative and aria-hidden, so the heading is the span underneath it.
        That keeps the document outline valid whether or not the effect runs.
      */}
      <div className={styles.stage}>
        <ParticleText text="404" label="404" as="h1" />
      </div>

      <p className={styles.body}>Oops, looks like this page does not exist.</p>

      <Link href="/" className={styles.cta}>
        Back to home
      </Link>
    </section>
  );
}
