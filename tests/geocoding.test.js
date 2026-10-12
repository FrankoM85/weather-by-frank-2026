import test from "node:test";
import assert from "node:assert/strict";
import { searchCities } from "../src/api/geocoding.js";

const response = (name = "Budapest") => ({
  ok: true,
  json: async () => ({
    results: [
      { id: 1, name, latitude: 47.5, longitude: 19, feature_code: "PPLC" },
    ],
  }),
});

test("successful search clears its timeout and forwards the query", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    assert.equal(url.searchParams.get("name"), "Budapest");
    requestSignal = signal;
    return response();
  });
  assert.equal((await searchCities(" Budapest "))[0].city, "Budapest");
  t.mock.timers.tick(8000);
  assert.equal(requestSignal.aborted, false);
});

for (const phase of ["network", "body"]) {
  test(`timeout bounds stalled ${phase} even when transport ignores abort`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let requestSignal;
    t.mock.method(globalThis, "fetch", (url, { signal }) => {
      requestSignal = signal;
      return phase === "network"
        ? new Promise(() => {})
        : Promise.resolve({ ok: true, json: () => new Promise(() => {}) });
    });
    const pending = searchCities("Budapest");
    const rejected = assert.rejects(pending, { name: "TimeoutError" });
    await Promise.resolve();
    t.mock.timers.tick(8000);
    await rejected;
    assert.equal(requestSignal.aborted, true);
  });
}

test("external cancellation preserves its reason and aborts transport", async (t) => {
  let requestSignal;
  t.mock.method(globalThis, "fetch", (url, { signal }) => {
    requestSignal = signal;
    return new Promise(() => {});
  });
  const controller = new AbortController();
  const pending = searchCities("Budapest", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => error === controller.signal.reason);
  assert.equal(requestSignal.aborted, true);
});

test("already cancelled search never starts a request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => response());
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    searchCities("Budapest", { signal: controller.signal }),
    { name: "AbortError" },
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("late cancelled response cannot replace a newer search result", async (t) => {
  let finishOld;
  t.mock.method(globalThis, "fetch", (url) =>
    url.searchParams.get("name") === "Old"
      ? new Promise((resolve) => {
          finishOld = resolve;
        })
      : Promise.resolve(response("New")),
  );
  const controller = new AbortController();
  const old = searchCities("Old", { signal: controller.signal });
  const rejected = assert.rejects(old, { name: "AbortError" });
  controller.abort();
  const latest = await searchCities("New");
  finishOld(response("Old"));
  await rejected;
  assert.equal(latest[0].city, "New");
});
