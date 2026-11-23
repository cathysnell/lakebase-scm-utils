#!/usr/bin/env node
/**
 * Database for the local promote fallback: --database, then $PGDATABASE, then
 * PGDATABASE in the project's .env (where an app with its own database records
 * it), else undefined (applyAndVerifyTierMigration then uses the default).
 * Without this the fallback migrated and verified "databricks_postgres" for a
 * project whose app DB is e.g. "recipe", and reported ok.
 */
declare function resolvePromoteDatabase(flag: string | undefined, projectDir: string): string | undefined;
declare function runScmMergeCli(argv: string[]): Promise<number>;

export { resolvePromoteDatabase, runScmMergeCli };
