// A post-checkout hook runs INSIDE `git checkout`, after HEAD has moved. When
// the kit's checkout timeout fires during a slow hook (the documented
// sync-.env-to-Lakebase hook routinely takes >10 s), the branch IS checked out.
// The kit must report that, not "Failed to create/switch git branch".

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkoutLandedDespiteTimeout } from "../../scripts/lakebase/paired-branch";

let repo: string;
const git = (...a: string[]) => execFileSync("git", a, { cwd: repo, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), "kit-checkout-timeout-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("config", "core.hooksPath", ".git/hooks");
  git("commit", "-q", "--allow-empty", "-m", "init");
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function slowHook(seconds: number) {
  const hook = path.join(repo, ".git", "hooks", "post-checkout");
  writeFileSync(hook, `#!/bin/sh\nsleep ${seconds}\n`);
  chmodSync(hook, 0o755);
}

function checkoutWithTimeout(args: string[], timeout: number): unknown {
  try {
    execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "pipe"], timeout });
    return null;
  } catch (err) {
    return err;
  }
}

describe("checkoutLandedDespiteTimeout", () => {
  it("true when the timeout fired in a slow post-checkout hook after HEAD moved", () => {
    slowHook(5);
    const err = checkoutWithTimeout(["checkout", "-b", "feature-x"], 1_000);
    expect((err as { code?: string }).code).toBe("ETIMEDOUT");
    expect(checkoutLandedDespiteTimeout(err, repo, "feature-x")).toBe(true);
  });

  it("false for a timeout when HEAD is not on the target branch", () => {
    expect(checkoutLandedDespiteTimeout({ code: "ETIMEDOUT" }, repo, "feature-x")).toBe(false);
  });

  it("false for a real checkout failure (not a timeout)", () => {
    const err = checkoutWithTimeout(["checkout", "no-such-branch"], 10_000);
    expect(err).not.toBeNull();
    expect(checkoutLandedDespiteTimeout(err, repo, "no-such-branch")).toBe(false);
  });

  it("false when cwd is not a git repo", () => {
    expect(checkoutLandedDespiteTimeout({ code: "ETIMEDOUT" }, tmpdir(), "main")).toBe(false);
  });
});
