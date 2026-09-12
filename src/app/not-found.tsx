import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <h1>404 — Page not found</h1>
      <p>
        The page you are looking for does not exist.{" "}
        <Link href="/">Return home</Link>.
      </p>
    </section>
  );
}
