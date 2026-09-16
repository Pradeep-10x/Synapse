import { describe, it, expect } from "vitest";
import { escapeRegex } from "../../src/utils/sanitize.js";
import { sanitizeRequest } from "../../src/middlewares/sanitizeRequest.js";

describe("escapeRegex", () => {
  it("escapes regex special characters", () => {
    expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
    expect(escapeRegex("(x)+$")).toBe("\\(x\\)\\+\\$");
  });

  it("leaves plain text untouched", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
  });

  it("coerces non-strings safely", () => {
    expect(escapeRegex(123)).toBe("123");
    expect(escapeRegex(undefined)).toBe("");
  });
});

describe("sanitizeRequest middleware", () => {
  const run = (req) => {
    let called = false;
    sanitizeRequest(req, {}, () => {
      called = true;
    });
    return called;
  };

  it("strips $-prefixed operator keys from nested objects", () => {
    const req = { body: { email: { $ne: null }, name: "ok" }, params: {}, query: {} };
    const called = run(req);
    expect(called).toBe(true);
    // The operator is removed; the (now-harmless, empty) object remains and is
    // rejected downstream by Zod validation.
    expect(req.body.email.$ne).toBeUndefined();
    expect(req.body.email).toEqual({});
    expect(req.body.name).toBe("ok");
  });

  it("removes top-level $-prefixed keys entirely", () => {
    const req = { body: { $where: "malicious", name: "ok" }, params: {}, query: {} };
    run(req);
    expect(req.body.$where).toBeUndefined();
    expect(req.body.name).toBe("ok");
  });

  it("strips dotted keys and sanitizes nested objects", () => {
    const req = {
      body: { "a.b": 1, nested: { $gt: "" , keep: 2 } },
      params: {},
      query: {},
    };
    run(req);
    expect(req.body["a.b"]).toBeUndefined();
    expect(req.body.nested.$gt).toBeUndefined();
    expect(req.body.nested.keep).toBe(2);
  });
});
