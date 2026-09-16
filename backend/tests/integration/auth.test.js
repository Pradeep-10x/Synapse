import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import supertest from "supertest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db.js";

// Ensure required secrets exist before the app module is imported. dotenv does
// not override already-set vars, so these win during tests.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
process.env.NODE_ENV = "test";

let request;

const validUser = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  username: "jane_doe",
  password: "supersecret",
};

beforeAll(async () => {
  await connectTestDB();
  // Dynamic import so the DB connection & env are ready first.
  const { app } = await import("../../src/app.js");
  request = supertest(app);
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe("POST /api/v1/user/register", () => {
  it("registers a valid user and never returns the password", async () => {
    const res = await request.post("/api/v1/user/register").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe("jane_doe");
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();
  });

  it("rejects an invalid payload (short password) with 400", async () => {
    const res = await request
      .post("/api/v1/user/register")
      .send({ ...validUser, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects duplicate email/username", async () => {
    await request.post("/api/v1/user/register").send(validUser);
    const res = await request.post("/api/v1/user/register").send(validUser);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/user/login", () => {
  beforeAll(async () => {
    // nothing; users created per-test
  });

  it("logs in with valid credentials and sets auth cookies", async () => {
    await request.post("/api/v1/user/register").send(validUser);
    const res = await request
      .post("/api/v1/user/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toContain("accessToken");
    expect(cookies).toContain("refreshToken");
  });

  it("rejects wrong credentials with 401", async () => {
    await request.post("/api/v1/user/register").send(validUser);
    const res = await request
      .post("/api/v1/user/login")
      .send({ email: validUser.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects NoSQL operator injection in credentials with 400", async () => {
    await request.post("/api/v1/user/register").send(validUser);
    const res = await request
      .post("/api/v1/user/login")
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/user/me", () => {
  it("returns the current user when authenticated", async () => {
    await request.post("/api/v1/user/register").send(validUser);
    const login = await request
      .post("/api/v1/user/login")
      .send({ email: validUser.email, password: validUser.password });
    const cookies = login.headers["set-cookie"];

    const res = await request.get("/api/v1/user/me").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(validUser.email);
  });

  it("returns 401 without a token", async () => {
    const res = await request.get("/api/v1/user/me");
    expect(res.status).toBe(401);
  });
});
