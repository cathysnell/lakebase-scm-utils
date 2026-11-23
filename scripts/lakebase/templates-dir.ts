// Single source of truth for locating the `templates/project` tree used by every scaffold step
// (client, language project, claude agents, Playwright harness). Previously each caller carried its
// own identical walk-up copy, so the LAKEBASE_SCM_UTILS_DIR dev override — which points the whole
// substrate at a local checkout — never reached the SCAFFOLD (only the post-scaffold lk shim honored
// it), and a local-dist run scaffolded from the released package's templates instead of the local
// working tree. This resolver closes that gap.
//
// Resolution order:
//   1. LAKEBASE_SCM_UTILS_DIR (the dev override): scaffold from `<dir>/templates/project` when it is a
//      real templates tree — so a local-dist run lays down the LOCAL templates, INCLUDING uncommitted
//      working-tree files (the HELD footer, etc.), exactly matching what the project's lk shim resolves
//      at runtime. One door: the override means "use the local substrate" everywhere, not just at runtime.
//   2. Walk up from this module for the packaged `templates/project` (the normal installed-package case).
// Callers that pass an explicit `{ templatesDir }` still bypass this entirely (used by tests).

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

let cachedTemplatesDir: string | undefined;

/** The marker file that identifies a real `templates/project` tree (every scaffold needs it). */
function isTemplatesProject(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, "common", ".gitignore.base"));
}

/** Resolve the `templates/project` directory. Honors `$LAKEBASE_SCM_UTILS_DIR` first, then walks up
 *  from this module. Throws if neither yields a real templates tree. */
export function findTemplatesDir(): string {
  if (cachedTemplatesDir) return cachedTemplatesDir;

  const override = (process.env.LAKEBASE_SCM_UTILS_DIR || "").trim();
  if (override) {
    const candidate = path.join(override, "templates", "project");
    if (isTemplatesProject(candidate)) {
      cachedTemplatesDir = candidate;
      return cachedTemplatesDir;
    }
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "templates", "project");
    if (isTemplatesProject(candidate)) {
      cachedTemplatesDir = candidate;
      return cachedTemplatesDir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate templates/project tree relative to ${here} (or $LAKEBASE_SCM_UTILS_DIR=${override || "<unset>"}). ` +
      `Pass an explicit { templatesDir } to override.`,
  );
}
