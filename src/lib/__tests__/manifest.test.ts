/**
 * @jest-environment node
 */
import manifestJson from "@/content/scene-manifest.json";
import { sceneManifestSchema } from "@/lib/manifest";

/**
 * Deep clone so each case mutates in isolation. Typed loosely on purpose —
 * every case below deliberately builds a shape the schema must reject.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const valid = (): any => structuredClone(manifestJson);

describe("scene manifest schema", () => {
  it("accepts the committed manifest", () => {
    expect(() => sceneManifestSchema.parse(manifestJson)).not.toThrow();
  });

  it("rejects a path that does not resolve under public/hero/", () => {
    const m = valid();
    m.landing.still.desktop = "landing/does-not-exist.avif";
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects an absolute path", () => {
    const m = valid();
    m.landing.still.desktop = "/hero/landing/front.avif";
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects a duplicate service id", () => {
    const m = valid();
    m.explorer.services[1].id = m.explorer.services[0].id;
    expect(() => sceneManifestSchema.parse(m)).toThrow(/Duplicate service id/);
  });

  it("rejects a service missing its poster", () => {
    const m = valid();
    delete m.explorer.services[0].poster;
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects a poster set to null", () => {
    const m = valid();
    m.explorer.services[0].poster = null;
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects a mobile composition missing from a responsive asset", () => {
    const m = valid();
    delete m.landing.still.mobile;
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects a negative parallax value", () => {
    const m = valid();
    m.landing.parallax.x = -5;
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("rejects an empty services list", () => {
    const m = valid();
    m.explorer.services = [];
    expect(() => sceneManifestSchema.parse(m)).toThrow();
  });

  it("allows clips to be null so placeholders degrade to posters", () => {
    const m = valid();
    expect(m.approach.clip).toBeNull();
    expect(() => sceneManifestSchema.parse(m)).not.toThrow();
  });
});
