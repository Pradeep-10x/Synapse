import { describe, it, expect } from "vitest";
import {
  registerUserSchema,
  loginUserSchema,
  changePasswordSchema,
} from "../../src/middlewares/ZodValidator.js";

describe("registerUserSchema", () => {
  const valid = {
    fullName: "Jane Doe",
    email: "JANE@Example.com",
    password: "supersecret",
    username: "jane_doe",
  };

  it("accepts a valid payload and normalizes email/username casing", () => {
    const result = registerUserSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe("jane@example.com");
  });

  it("rejects short passwords", () => {
    const result = registerUserSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = registerUserSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects usernames with illegal characters", () => {
    const result = registerUserSchema.safeParse({ ...valid, username: "bad name!" });
    expect(result.success).toBe(false);
  });
});

describe("loginUserSchema", () => {
  it("requires either email or username", () => {
    const result = loginUserSchema.safeParse({ password: "supersecret" });
    expect(result.success).toBe(false);
  });

  it("accepts a username + password", () => {
    const result = loginUserSchema.safeParse({ username: "jane", password: "supersecret" });
    expect(result.success).toBe(true);
  });

  it("rejects operator-injection objects instead of strings", () => {
    const result = loginUserSchema.safeParse({ email: { $ne: null }, password: "x" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("enforces a minimum new-password length", () => {
    const result = changePasswordSchema.safeParse({ oldPassword: "a", newPassword: "short" });
    expect(result.success).toBe(false);
  });
});
