import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_CONTENT_LENGTH = 8_192;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://jsongenerator.lumni.dev.br",
  "https://jsongenerator.danielmazzeu.com.br",
  "https://jsongenerator-seven.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const globalStore = globalThis as typeof globalThis & {
  __jsonGeneratorRateLimitStore?: Map<string, RateLimitEntry>;
};

const rateLimitStore =
  globalStore.__jsonGeneratorRateLimitStore ??
  (globalStore.__jsonGeneratorRateLimitStore = new Map<string, RateLimitEntry>());

function getConfiguredOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...(envOrigins ?? []), ...DEFAULT_ALLOWED_ORIGINS]);
}

function getRequestHost(request: NextRequest) {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function getRequestProtocol(request: NextRequest) {
  return request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isAllowedOrigin(request: NextRequest, origin: string | null) {
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestHost = getRequestHost(request);
    const requestProtocol = getRequestProtocol(request);

    if (
      requestHost &&
      originUrl.host === requestHost &&
      originUrl.protocol === `${requestProtocol}:`
    ) {
      return true;
    }

    return getConfiguredOrigins().has(origin);
  } catch {
    return false;
  }
}

export function applyApiHeaders(response: NextResponse, origin?: string | null) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "600");

  return response;
}

export function buildErrorResponse(
  message: string,
  status: number,
  origin?: string | null,
) {
  const response = NextResponse.json({ success: false, error: message }, { status });
  return applyApiHeaders(response, origin);
}

export function ensureValidApiRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;

  if (!isAllowedOrigin(request, origin)) {
    return {
      error: buildErrorResponse("Origem nao autorizada.", 403),
    };
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      error: buildErrorResponse("Content-Type invalido.", 415, origin),
    };
  }

  if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH) {
    return {
      error: buildErrorResponse("Payload muito grande.", 413, origin),
    };
  }

  return { origin };
}

export function enforceRateLimit(request: NextRequest) {
  const ip = getClientIp(request);
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return null;
}

export function buildOptionsResponse(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(request, origin)) {
    return buildErrorResponse("Origem nao autorizada.", 403);
  }

  return applyApiHeaders(new NextResponse(null, { status: 204 }), origin);
}
