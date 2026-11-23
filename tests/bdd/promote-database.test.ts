// Projects whose app uses its own database (not "databricks_postgres") must have
// CI and the local promote migrate, verify and test THAT database.
//  - ci-resolve-branch: arg, then $PGDATABASE, then the default (like every other CLI).
//  - scm-merge's local-migrate fallback: --database, then $PGDATABASE, then .env PGDATABASE.
//  - pr.yml / merge.yml: PGDATABASE comes from the optional LAKEBASE_DATABASE repo variable.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const mockListBranches = vi.fn();
const mockGetEndpoint = vi.fn();
const mockEnsureEndpoint = vi.fn();
const mockGetCredential = vi.fn();
vi.mock("../../scripts/lakebase/branch-utils.js", () => ({
  listBranches: (a: unknown) => mockListBranches(a),
  getBranchByName: vi.fn(),
  getDefaultBranch: vi.fn(),
}));
vi.mock("../../scripts/lakebase/branch-create.js", () => ({ createBranch: vi.fn() }));
vi.mock("../../scripts/lakebase/branch-delete.js", () => ({ deleteBranch: vi.fn() }));
vi.mock("../../scripts/lakebase/branch-endpoint.js", () => ({
  getEndpoint: (a: unknown) => mockGetEndpoint(a),
  ensureEndpoint: (a: unknown) => mockEnsureEndpoint(a),
  getCredential: (a: unknown) => mockGetCredential(a),
}));

const { resolveCiBranch } = await import("../../scripts/lakebase/ci-resolve-branch.js");
const { resolvePromoteDatabase } = await import("../../scripts/lakebase/scm-merge.cli.js");

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const savedPg = process.env.PGDATABASE;
let dir: string;

beforeEach(() => {
  delete process.env.PGDATABASE;
  dir = mkdtempSync(path.join(tmpdir(), "kit-promote-db-"));
  mockListBranches.mockReset().mockResolvedValue([{ name: "p/branches/ci-pr-2", uid: "u-ci", sourceBranchId: "staging" }]);
  mockGetEndpoint.mockReset().mockResolvedValue({ host: "h.example.com" });
  mockGetCredential.mockReset().mockResolvedValue({ token: "tok", email: "user@example.com" });
});
afterEach(() => {
  if (savedPg === undefined) delete process.env.PGDATABASE; else process.env.PGDATABASE = savedPg;
  rmSync(dir, { recursive: true, force: true });
});

const dbOf = (url: string) => new URL(url).pathname.slice(1);
const resolve = (database?: string) =>
  resolveCiBranch({ instance: "p", lakebaseName: "ci-pr-2", database });

describe("ci-resolve-branch database order", () => {
  it("defaults to databricks_postgres", async () => {
    expect(dbOf((await resolve()).databaseUrl)).toBe("databricks_postgres");
  });
  it("uses $PGDATABASE when no arg is passed", async () => {
    process.env.PGDATABASE = "recipe";
    const r = await resolve();
    expect(dbOf(r.databaseUrl)).toBe("recipe");
    expect(r.jdbcUrl).toContain(":5432/recipe?");
  });
  it("an explicit arg beats $PGDATABASE", async () => {
    process.env.PGDATABASE = "recipe";
    expect(dbOf((await resolve("other")).databaseUrl)).toBe("other");
  });
  it("an empty $PGDATABASE falls back to the default", async () => {
    process.env.PGDATABASE = "";
    expect(dbOf((await resolve()).databaseUrl)).toBe("databricks_postgres");
  });
});

describe("scm-merge local promote: resolvePromoteDatabase", () => {
  const env = (body: string) => writeFileSync(path.join(dir, ".env"), body);

  it("undefined when nothing names a database (caller uses the default)", () => {
    expect(resolvePromoteDatabase(undefined, dir)).toBeUndefined();
  });
  it("reads PGDATABASE from the project's .env", () => {
    env("LAKEBASE_BRANCH_ID=feature-x\nPGDATABASE=recipe\n");
    expect(resolvePromoteDatabase(undefined, dir)).toBe("recipe");
  });
  it("$PGDATABASE beats .env", () => {
    env("PGDATABASE=recipe\n");
    process.env.PGDATABASE = "from-shell";
    expect(resolvePromoteDatabase(undefined, dir)).toBe("from-shell");
  });
  it("--database beats both", () => {
    env("PGDATABASE=recipe\n");
    process.env.PGDATABASE = "from-shell";
    expect(resolvePromoteDatabase("flag-db", dir)).toBe("flag-db");
  });
  it("the fallback passes the resolved database to applyAndVerifyTierMigration", () => {
    const src = readFileSync(path.join(REPO_ROOT, "scripts/lakebase/scm-merge.cli.ts"), "utf8");
    expect(src).toMatch(/applyAndVerifyTierMigration\(\{[\s\S]*?database: resolvePromoteDatabase\(args\.database, projectDir\)/);
    expect(src).toMatch(/case "--database":\s*out\.database = argv\[\+\+i\]/);
  });
});

describe("scaffolded workflows set PGDATABASE from LAKEBASE_DATABASE", () => {
  it.each(["pr.yml", "merge.yml"])("%s: workflow-level env, defaulting to databricks_postgres", (f) => {
    const doc = yaml.load(
      readFileSync(path.join(REPO_ROOT, "templates/project/common/.github/workflows", f), "utf8"),
    ) as { env?: Record<string, string> };
    expect(doc.env?.PGDATABASE).toBe("${{ vars.LAKEBASE_DATABASE || 'databricks_postgres' }}");
  });
});
