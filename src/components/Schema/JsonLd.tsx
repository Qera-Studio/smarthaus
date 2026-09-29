/**
 * One JSON-LD block, rendered on the server.
 *
 * The data is always a build-time constant, never user input, and there is no
 * other way to emit JSON-LD: React escapes text children, which corrupts the
 * JSON. `<` is escaped because a `</script>` inside a string would close the
 * element early even though the JSON is well-formed; < parses back to the
 * same string, so the escape costs nothing and removes the only way this
 * element could ever emit markup.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
