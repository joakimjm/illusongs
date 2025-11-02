import { describe, expect, it } from "vitest";
import { AccessTokenPermissions } from "@/features/tokens/token-types";
import { InvalidTokenRequestError, parseCreatePayload } from "./route";

describe("parseCreatePayload", () => {
  it("returns trimmed token label when label is valid", () => {
    const payload = parseCreatePayload({
      label: "  automation  ",
    });

    expect(payload.label).toBe("automation");
    expect(payload.permissions).toEqual([]);
  });

  it("returns permissions when provided", () => {
    const payload = parseCreatePayload({
      label: "automation",
      permissions: ["administrator"],
    });

    expect(payload.permissions).toEqual([AccessTokenPermissions.Administrator]);
  });

  it("deduplicates permissions", () => {
    const payload = parseCreatePayload({
      label: "automation",
      permissions: ["administrator", "administrator"],
    });

    expect(payload.permissions).toEqual([AccessTokenPermissions.Administrator]);
  });

  it("throws when payload is not an object", () => {
    const act = () => parseCreatePayload(undefined);

    expect(act).toThrowError(InvalidTokenRequestError);
    expect(act).toThrowError("Payload must be a JSON object.");
  });

  it("throws when label is missing or empty", () => {
    const act = () =>
      parseCreatePayload({
        label: " ",
      });

    expect(act).toThrowError(InvalidTokenRequestError);
    expect(act).toThrowError("Token label is required.");
  });

  it("throws when permissions is not an array", () => {
    const act = () =>
      parseCreatePayload({
        label: "automation",
        permissions: "administrator",
      });

    expect(act).toThrowError(InvalidTokenRequestError);
    expect(act).toThrowError("Token permissions must be provided as an array.");
  });

  it("throws when permissions include invalid values", () => {
    const act = () =>
      parseCreatePayload({
        label: "automation",
        permissions: ["invalid-permission"],
      });

    expect(act).toThrowError(InvalidTokenRequestError);
    expect(act).toThrowError("Invalid token permission provided.");
  });
});
