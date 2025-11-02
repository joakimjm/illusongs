import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  resolveServerIdentity,
  type ServerIdentity,
} from "@/features/auth/server-identity";

type ApiHandlerContext<TParams extends Record<string, string>> = {
  request: NextRequest;
  identity: ServerIdentity;
  params: TParams;
};

type ApiRouteHandlers<TParams extends Record<string, string>> = Partial<{
  GET: (context: ApiHandlerContext<TParams>) => Response | Promise<Response>;
  POST: (context: ApiHandlerContext<TParams>) => Response | Promise<Response>;
  PUT: (context: ApiHandlerContext<TParams>) => Response | Promise<Response>;
  PATCH: (context: ApiHandlerContext<TParams>) => Response | Promise<Response>;
  DELETE: (context: ApiHandlerContext<TParams>) => Response | Promise<Response>;
  OPTIONS: (
    context: ApiHandlerContext<TParams>,
  ) => Response | Promise<Response>;
}>;

const unauthorizedResponse = () =>
  NextResponse.json(
    { ok: false, detail: "Authentication required." },
    { status: 401 },
  );

const methodNotAllowedResponse = () =>
  NextResponse.json(
    { ok: false, detail: "Method not allowed." },
    { status: 405 },
  );

const normalizeParams = <T extends Record<string, string>>(
  params: unknown,
): T => {
  if (typeof params !== "object" || params === null) {
    return {} as T;
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? value : String(value),
    ]),
  ) as T;
};

type RouteContext<TParams extends Record<string, string>> = {
  params?: Promise<TParams> | TParams;
};

export const createApiRoute = <
  TParams extends Record<string, string> = Record<string, string>,
>(
  handlers: ApiRouteHandlers<TParams>,
) => {
  const supportedMethods = new Set(Object.keys(handlers));

  const invokeHandler = async (
    method: keyof ApiRouteHandlers<TParams>,
    request: NextRequest,
    context?: RouteContext<TParams>,
  ): Promise<Response> => {
    const handler = handlers[method];
    if (!handler) {
      return methodNotAllowedResponse();
    }

    const identity = await resolveServerIdentity(request);
    if (!identity) {
      return unauthorizedResponse();
    }

    const params =
      context?.params === undefined
        ? ({} as TParams)
        : normalizeParams<TParams>(await Promise.resolve(context.params));

    return await handler({
      request,
      identity,
      params,
    });
  };

  return {
    GET: supportedMethods.has("GET")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("GET", request, context)
      : undefined,
    POST: supportedMethods.has("POST")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("POST", request, context)
      : undefined,
    PUT: supportedMethods.has("PUT")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("PUT", request, context)
      : undefined,
    PATCH: supportedMethods.has("PATCH")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("PATCH", request, context)
      : undefined,
    DELETE: supportedMethods.has("DELETE")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("DELETE", request, context)
      : undefined,
    OPTIONS: supportedMethods.has("OPTIONS")
      ? async (request: NextRequest, context?: RouteContext<TParams>) =>
          await invokeHandler("OPTIONS", request, context)
      : undefined,
  };
};
