import { describe, expect, it } from "vitest";
import { extractAccessToken } from "./server-identity";

const createRequest = (url: string, init?: RequestInit): Request =>
  new Request(url, init);

describe("extractAccessToken", () => {
  it("returns trimmed bearer token from authorization header", () => {
    const request = createRequest("https://illusongs.test/api", {
      headers: {
        authorization: "  Bearer   header-token  ",
      },
    });

    expect(extractAccessToken(request)).toBe("header-token");
  });

  it("ignores authorization header that lacks bearer prefix", () => {
    const url = new URL("https://illusongs.test/api");
    url.searchParams.set("token", "query-token");

    const request = createRequest(url.toString(), {
      headers: {
        authorization: "Basic abc123",
      },
    });

    expect(extractAccessToken(request)).toBe("query-token");
  });

  it("returns access token from query string when header is missing", () => {
    const url = new URL("https://illusongs.test/api");
    url.searchParams.set("token", "query-token");

    const request = createRequest(url.toString());

    expect(extractAccessToken(request)).toBe("query-token");
  });

  it("prefers header token when both header and query tokens are provided", () => {
    const url = new URL("https://illusongs.test/api");
    url.searchParams.set("token", "query-token");

    const request = createRequest(url.toString(), {
      headers: {
        authorization: "Bearer header-token",
      },
    });

    expect(extractAccessToken(request)).toBe("header-token");
  });

  it("returns null when neither header nor query token is present", () => {
    const request = createRequest("https://illusongs.test/api");

    expect(extractAccessToken(request)).toBeNull();
  });
});
