// Tests for `scripts/teardown-vercel-project.mjs`.
//
// Run via `node --test scripts/__tests__/teardown-vercel-project.test.mjs`.
// Uses `node:test` (built-in); Vercel API fully mocked.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createVercelFetch } from "../vercel-api.mjs";
import { teardownProject } from "../teardown-vercel-project.mjs";

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

test("teardownProject errors when app-name is missing", async () => {
  const { vercelFetch } = makeStubFetch(() => ({ status: 200, body: {} }));
  await assert.rejects(
    () => teardownProject({ vercelFetch, appName: "" }),
    /app-name is required/,
  );
});

test("teardownProject exits cleanly when project does not exist", async () => {
  const { vercelFetch, calls } = makeStubFetch(() => ({
    status: 404,
    body: { error: { code: "not_found" } },
  }));

  const result = await teardownProject({
    appName: "earn",
    vercelFetch,
    skipConfirm: true,
    logger: silentLogger(),
  });

  assert.deepEqual(result, {
    deleted: false,
    projectName: "dynamic-demos-earn",
    reason: "not-found",
  });
  // Only the lookup call.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v9/projects/dynamic-demos-earn");
});

test("teardownProject deletes when project exists and --yes is set", async () => {
  const { vercelFetch, calls } = makeStubFetch((path, init) => {
    if (init.method === undefined && path.startsWith("/v9/projects/")) {
      return {
        status: 200,
        body: { id: "prj_existing", name: "dynamic-demos-earn" },
      };
    }
    if (init.method === "DELETE" && path.startsWith("/v9/projects/")) {
      return { status: 200, body: {} };
    }
    return { status: 500, body: { error: "unexpected" } };
  });

  const result = await teardownProject({
    appName: "earn",
    vercelFetch,
    skipConfirm: true,
    logger: silentLogger(),
  });

  assert.deepEqual(result, {
    deleted: true,
    projectName: "dynamic-demos-earn",
  });
  // Lookup + DELETE
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.method, "DELETE");
  assert.equal(calls[1].path, "/v9/projects/dynamic-demos-earn");
});

test("teardownProject prompts when --yes is omitted and aborts on mismatch", async () => {
  const { vercelFetch, calls } = makeStubFetch((path, init) => {
    if (init.method === undefined && path.startsWith("/v9/projects/")) {
      return { status: 200, body: { id: "prj_existing" } };
    }
    return { status: 500, body: { error: "DELETE must not be called" } };
  });

  const confirm = async () => false;
  const result = await teardownProject({
    appName: "earn",
    vercelFetch,
    confirm,
    logger: silentLogger(),
  });

  assert.deepEqual(result, {
    deleted: false,
    projectName: "dynamic-demos-earn",
    reason: "declined",
  });
  // Only the lookup — DELETE never issued.
  assert.equal(calls.length, 1);
});

test("teardownProject deletes when confirm returns true", async () => {
  const { vercelFetch, calls } = makeStubFetch((path, init) => {
    if (init.method === undefined && path.startsWith("/v9/projects/")) {
      return { status: 200, body: { id: "prj_existing" } };
    }
    if (init.method === "DELETE") {
      return { status: 200, body: {} };
    }
    return { status: 500, body: { error: "unexpected" } };
  });

  let confirmCalls = 0;
  const confirm = async (name) => {
    confirmCalls += 1;
    assert.equal(name, "earn");
    return true;
  };

  const result = await teardownProject({
    appName: "earn",
    vercelFetch,
    confirm,
    logger: silentLogger(),
  });

  assert.equal(result.deleted, true);
  assert.equal(confirmCalls, 1);
  assert.equal(calls.length, 2);
});
