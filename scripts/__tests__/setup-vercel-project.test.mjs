// Tests for `scripts/setup-vercel-project.mjs`.
//
// Run via `node --test scripts/__tests__/setup-vercel-project.test.mjs`.
// Uses `node:test` (built-in) — no test runner dependency required.
// Vercel API is fully mocked; no network calls are made.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createVercelFetch } from "../vercel-api.mjs";
import {
  parseEnvExample,
  setupProject,
  projectNameFor,
} from "../setup-vercel-project.mjs";

/**
 * Build a `vercelFetch` stub that records every `(path, init)` it was called
 * with and returns the response from `responder(path, init)`. Responder may
 * return `{ status, body }` or throw an `Error` with `.status` set to simulate
 * API failures (e.g. 404).
 */
function makeStubFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = url.replace("https://api.vercel.com", "");
    calls.push({ path, init });
    const { status = 200, body = {} } = responder(path, init) ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    };
  };
  const vercelFetch = createVercelFetch({ token: "test-token", fetchImpl });
  return { vercelFetch, calls };
}

function silentLogger() {
  return { log: () => {}, warn: () => {} };
}

test("parseEnvExample skips comments, blanks, and lines without =", () => {
  const input = [
    "# top-level comment",
    "",
    "FOO=bar",
    "BAZ=",
    "QUUX",
    "WITH_INLINE=value # trailing",
    'QUOTED="hello"',
    "SINGLE='quoted'",
  ].join("\n");
  const result = parseEnvExample(input);
  assert.deepEqual(result, [
    { key: "FOO", value: "bar" },
    { key: "BAZ", value: "" },
    { key: "WITH_INLINE", value: "value" },
    { key: "QUOTED", value: "hello" },
    { key: "SINGLE", value: "quoted" },
  ]);
});

test("projectNameFor prefixes with dynamic-demos-", () => {
  assert.equal(projectNameFor("earn"), "dynamic-demos-earn");
});

test("createVercelFetch requires a token", () => {
  assert.throws(() => createVercelFetch({}), /VERCEL_TOKEN is required/);
});

test("setupProject errors when app-name is missing", async () => {
  const { vercelFetch } = makeStubFetch(() => ({ status: 200, body: {} }));
  await assert.rejects(
    () => setupProject({ vercelFetch, appName: "" }),
    /app-name is required/,
  );
});

test("setupProject creates the project and uploads env placeholders", async () => {
  const readFileImpl = async (path) => {
    if (path.endsWith("package.json")) {
      return JSON.stringify({ name: "@dynamic-demos/earn" });
    }
    if (path.endsWith(".env.example")) {
      return "FOO=bar\nBAZ=\n# comment\n";
    }
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  };

  const { vercelFetch, calls } = makeStubFetch((path, init) => {
    // Simulate "project does not exist yet" on lookup
    if (init.method === undefined && path.startsWith("/v9/projects/")) {
      return { status: 404, body: { error: { code: "not_found" } } };
    }
    if (init.method === "POST" && path === "/v10/projects") {
      return { status: 200, body: { id: "prj_test", name: "test" } };
    }
    if (init.method === "POST" && path.includes("/env")) {
      return { status: 200, body: { created: true } };
    }
    return { status: 500, body: { error: "unexpected" } };
  });

  const result = await setupProject({
    appName: "earn",
    vercelFetch,
    readFileImpl,
    logger: silentLogger(),
  });

  assert.equal(result.created, true);
  assert.equal(result.projectName, "dynamic-demos-earn");
  assert.equal(result.envCount, 2);

  // First call: GET project (lookup)
  assert.equal(calls[0].path, "/v9/projects/dynamic-demos-earn");
  // Second call: POST /v10/projects with correct body
  assert.equal(calls[1].path, "/v10/projects");
  const createBody = JSON.parse(calls[1].init.body);
  assert.equal(createBody.name, "dynamic-demos-earn");
  assert.equal(createBody.framework, "nextjs");
  assert.equal(createBody.rootDirectory, "apps/earn");
  // Remaining calls: POST env vars (2 of them)
  const envCalls = calls.slice(2);
  assert.equal(envCalls.length, 2);
  for (const c of envCalls) {
    assert.equal(c.path, "/v10/projects/dynamic-demos-earn/env");
    const body = JSON.parse(c.init.body);
    assert.equal(body.value, "");
    assert.deepEqual(body.target, ["production"]);
  }
});

test("setupProject is idempotent — exits cleanly when project exists", async () => {
  const readFileImpl = async (path) => {
    if (path.endsWith("package.json")) return JSON.stringify({});
    if (path.endsWith(".env.example")) return "X=1\n";
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  };

  const { vercelFetch, calls } = makeStubFetch((path) => {
    if (path.startsWith("/v9/projects/")) {
      return {
        status: 200,
        body: { id: "prj_existing", name: "dynamic-demos-earn" },
      };
    }
    return { status: 500, body: { error: "should not be called" } };
  });

  const result = await setupProject({
    appName: "earn",
    vercelFetch,
    readFileImpl,
    logger: silentLogger(),
  });

  assert.equal(result.created, false);
  assert.equal(result.projectName, "dynamic-demos-earn");
  // Exactly one call — the lookup.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v9/projects/dynamic-demos-earn");
});

test("setupProject errors when apps/<name>/package.json is missing", async () => {
  const readFileImpl = async () => {
    const e = new Error("ENOENT");
    e.code = "ENOENT";
    throw e;
  };

  const { vercelFetch } = makeStubFetch(() => ({ status: 200, body: {} }));
  await assert.rejects(
    () =>
      setupProject({
        appName: "nonexistent",
        vercelFetch,
        readFileImpl,
        logger: silentLogger(),
      }),
    /apps\/nonexistent\/package\.json not found/,
  );
});

test("setupProject treats missing .env.example as empty env list", async () => {
  const readFileImpl = async (path) => {
    if (path.endsWith("package.json")) return JSON.stringify({});
    const e = new Error("ENOENT");
    e.code = "ENOENT";
    throw e;
  };

  const { vercelFetch, calls } = makeStubFetch((path, init) => {
    if (init.method === undefined && path.startsWith("/v9/projects/")) {
      return { status: 404, body: {} };
    }
    if (init.method === "POST" && path === "/v10/projects") {
      return { status: 200, body: {} };
    }
    return { status: 500, body: { error: "no env should be uploaded" } };
  });

  const result = await setupProject({
    appName: "no-env-app",
    vercelFetch,
    readFileImpl,
    logger: silentLogger(),
  });

  assert.equal(result.created, true);
  assert.equal(result.envCount, 0);
  // Lookup + create only — no env POSTs.
  assert.equal(calls.length, 2);
});
