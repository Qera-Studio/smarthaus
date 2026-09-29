// Environment for every child process the gate tests spawn.
//
// Inside a git hook, git exports GIT_DIR (and in a linked worktree, more), and
// GIT_DIR overrides `git -C <dir>`. The gate tests build throwaway repos with
// `git -C <tmp> init/add/commit`; run from pre-push, those commands inherited
// the hook's GIT_DIR and wrote into the real repository instead: dozens of
// fixture commits on the branch, a stray tag, the index replaced, and
// `git init` set core.bare=true in the shared config, which broke every
// checkout of the repo (2026-09-26, recovered by hand). Nothing a fixture
// spawns may see a GIT_ variable.
export function isolatedEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  ) as NodeJS.ProcessEnv;
}
