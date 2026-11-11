/**
 * @jest-environment node
 */
// sanity is ESM that Jest cannot load, and defineConfig only returns its
// argument, so it is replaced by the identity: what is asserted is exactly
// the config this module hands to the Studio. The tools record their options.
jest.mock("sanity", () => ({ defineConfig: <T>(config: T) => config }));
jest.mock("sanity/structure", () => ({
  structureTool: (options: unknown) => ({ name: "structure", options }),
}));
jest.mock("sanity/presentation", () => ({
  presentationTool: (options: unknown) => ({ name: "presentation", options }),
}));

import { schemaTypes } from "../schema";

type Action = { action?: string };
type Config = {
  name: string;
  title: string;
  basePath: string;
  projectId: string;
  dataset: string;
  plugins: { name: string; options: Record<string, unknown> }[];
  schema: {
    types: { name: string }[];
    templates: (t: { schemaType: string }[]) => { schemaType: string }[];
  };
  document: {
    actions: (actions: Action[], ctx: { schemaType: string }) => Action[];
    newDocumentOptions: (items: { templateId: string }[]) => { templateId: string }[];
  };
};

const load = async (env: Record<string, string | undefined>) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  let mod: { default: Config; projectId: string; dataset: string } | undefined;
  await jest.isolateModulesAsync(async () => {
    mod = (await import("../config")) as unknown as typeof mod;
  });
  process.env = saved;
  return mod!;
};

describe("the Studio config", () => {
  const env = {
    NEXT_PUBLIC_SANITY_PROJECT_ID: "nqc5m5ls",
    NEXT_PUBLIC_SANITY_DATASET: "production",
  };

  it("mounts at /studio, where the route lives", async () => {
    expect((await load(env)).default.basePath).toBe("/studio");
  });

  it("reads the project and dataset from the public env", async () => {
    const { default: config, projectId, dataset } = await load(env);
    expect(config.projectId).toBe("nqc5m5ls");
    expect(config.dataset).toBe("production");
    expect(projectId).toBe("nqc5m5ls");
    expect(dataset).toBe("production");
  });

  it("falls back to the production dataset when none is set", async () => {
    const { default: config } = await load({ ...env, NEXT_PUBLIC_SANITY_DATASET: undefined });
    expect(config.dataset).toBe("production");
  });

  it("leaves the project empty rather than inventing one when it is unset", async () => {
    const { default: config } = await load({ ...env, NEXT_PUBLIC_SANITY_PROJECT_ID: undefined });
    expect(config.projectId).toBe("");
  });

  it("is named for the brand", async () => {
    const { default: config } = await load(env);
    expect(config.name).toBe("smarthaus");
    expect(config.title).toBe("Smarthaus");
  });

  it("runs the page list and the live preview, and nothing else", async () => {
    const { plugins } = (await load(env)).default;
    expect(plugins.map((p) => p.name)).toEqual(["structure", "presentation"]);
    expect(typeof plugins[0]!.options.structure).toBe("function");
  });

  it("previews on this site, turning draft mode on through its own route", async () => {
    const presentation = (await load(env)).default.plugins[1]!;
    expect(presentation.options).toEqual({
      previewUrl: { origin: "same-origin", previewMode: { enable: "/api/draft-mode/enable" } },
    });
  });

  it("knows every schema type", async () => {
    const types = (await load(env)).default.schema.types.map((t) => t.name);
    expect(types).toEqual(schemaTypes.map((t) => t.name));
  });

  describe("every document is fixed: a route is code", () => {
    const docTypes = schemaTypes.filter((t) => t.type === "document").map((t) => t.name);

    it("offers no template to create one", async () => {
      const { templates } = (await load(env)).default.schema;
      const all = [...docTypes, "somethingElse"].map((schemaType) => ({ schemaType }));
      expect(templates(all)).toEqual([{ schemaType: "somethingElse" }]);
    });

    it("leaves nothing in the new-document menu", async () => {
      const { newDocumentOptions } = (await load(env)).default.document;
      const items = [...docTypes, "other"].map((templateId) => ({ templateId }));
      expect(newDocumentOptions(items)).toEqual([{ templateId: "other" }]);
    });

    it.each(docTypes)("cannot delete or duplicate a %s", async (schemaType) => {
      const { actions } = (await load(env)).default.document;
      const all = [{ action: "publish" }, { action: "delete" }, { action: "duplicate" }, {}];
      expect(actions(all, { schemaType })).toEqual([{ action: "publish" }, {}]);
    });

    it("leaves another type's actions alone", async () => {
      const { actions } = (await load(env)).default.document;
      const all = [{ action: "delete" }];
      expect(actions(all, { schemaType: "other" })).toBe(all);
    });
  });
});
