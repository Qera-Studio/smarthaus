/**
 * @jest-environment node
 */
// sanity is ESM that Jest cannot load, and defineConfig only returns its
// argument, so it is replaced by the identity: what is asserted is exactly
// the config this module hands to the Studio.
jest.mock("sanity", () => ({ defineConfig: <T>(config: T) => config }));
jest.mock("sanity/structure", () => ({ structureTool: () => ({ name: "structure" }) }));

type Config = {
  name: string;
  title: string;
  basePath: string;
  projectId: string;
  dataset: string;
  plugins: { name: string }[];
  schema: { types: unknown[] };
};

const load = async (env: Record<string, string | undefined>) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  let mod: { default: Config; projectId: string; dataset: string } | undefined;
  await jest.isolateModulesAsync(async () => {
    mod = await import("../config");
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

  it("runs the structure tool and nothing else", async () => {
    expect((await load(env)).default.plugins).toEqual([{ name: "structure" }]);
  });

  it("has no schema types until a page reads one", async () => {
    expect((await load(env)).default.schema.types).toEqual([]);
  });
});
