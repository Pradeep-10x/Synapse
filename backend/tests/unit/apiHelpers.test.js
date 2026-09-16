import { describe, it, expect } from "vitest";
import { ApiError } from "../../src/utils/ApiError.js";
import { ApiResponse } from "../../src/utils/ApiResponse.js";

describe("ApiError", () => {
  it("captures status code, message and errors", () => {
    const err = new ApiError(404, "Not found", [{ field: "id" }]);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.success).toBe(false);
    expect(err.errors).toEqual([{ field: "id" }]);
  });
});

describe("ApiResponse", () => {
  it("marks 2xx/3xx as success", () => {
    expect(new ApiResponse(200, {}).success).toBe(true);
    expect(new ApiResponse(201, {}).success).toBe(true);
  });

  it("marks 4xx/5xx as failure", () => {
    expect(new ApiResponse(400, null).success).toBe(false);
    expect(new ApiResponse(500, null).success).toBe(false);
  });
});
