// DSN passwords (live Lakebase OAuth tokens) must not reach the terminal from
// `lakebase-branch` JSON output unless --show-secrets is passed.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { redactDsnPasswords, redactDsnSecrets, REDACTED } from "../../scripts/util/redact-dsn";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl";
const DSN = `postgresql://cathy.snell%40databricks.com:${TOKEN}@ep-abc.database.us-west-2.cloud.databricks.com:5432/recipe?sslmode=require`;

describe("redactDsnPasswords", () => {
  it("masks only the password; user, host, port, db and query stay", () => {
    expect(redactDsnPasswords(DSN)).toBe(
      `postgresql://cathy.snell%40databricks.com:${REDACTED}@ep-abc.database.us-west-2.cloud.databricks.com:5432/recipe?sslmode=require`,
    );
  });

  it("handles postgres:// and an empty user", () => {
    expect(redactDsnPasswords(`postgres://:${TOKEN}@h:5432/db`)).toBe(`postgres://:${REDACTED}@h:5432/db`);
  });

  it("masks every DSN embedded in a longer string", () => {
    const out = redactDsnPasswords(`a=${DSN} b=${DSN}`);
    expect(out).not.toContain(TOKEN);
    expect(out.match(/\*\*\*@/g)).toHaveLength(2);
  });

  it("leaves DSNs without a password, and non-DSN text, unchanged", () => {
    for (const s of ["postgresql://user@h:5432/db", "postgresql://h/db", "https://u:p@example.com/", "plain text"]) {
      expect(redactDsnPasswords(s)).toBe(s);
    }
  });
});

describe("redactDsnSecrets", () => {
  it("walks nested objects and arrays without mutating the input", () => {
    const input = { branchId: "feature-x", databaseUrl: DSN, sync: { databaseUrl: DSN }, all: [DSN, 5, null] };
    const out = redactDsnSecrets(input);
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    expect(out.branchId).toBe("feature-x");
    expect(out.all.slice(1)).toEqual([5, null]);
    expect(input.databaseUrl).toBe(DSN); // library callers keep the real DSN
    expect(input.sync.databaseUrl).toBe(DSN);
  });
});

describe("lakebase-branch CLI wiring", () => {
  const src = readFileSync(`${REPO_ROOT}scripts/lakebase/branch.cli.ts`, "utf8");

  it("printJson masks through redactDsnSecrets unless --show-secrets", () => {
    const body = src.match(/function printJson\([\s\S]*?\n}/)?.[0] ?? "";
    expect(body).toMatch(/showSecrets \? result : redactDsnSecrets\(result\)/);
    expect(body).not.toMatch(/JSON\.stringify\(result/); // never serialises the raw result
    expect(src).toMatch(/case "--show-secrets":\s*out\.showSecrets = true/);
    expect(src).toMatch(/showSecrets = args\.showSecrets \?\? false/);
  });

  it("--help documents --show-secrets", () => {
    const res = spawnSync(process.execPath, ["--import", "tsx", "scripts/lakebase/branch.cli.ts", "--help"], {
      cwd: REPO_ROOT, encoding: "utf8", timeout: 20_000,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("--show-secrets");
  });
});
