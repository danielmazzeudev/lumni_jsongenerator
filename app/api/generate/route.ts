import { NextRequest, NextResponse } from "next/server";
import {
  applyApiHeaders,
  buildErrorResponse,
  buildOptionsResponse,
  enforceRateLimit,
  ensureValidApiRequest,
} from "@/app/lib/api-security";
import { generateJsonFromPrompt } from "@/app/lib/generator";

export function OPTIONS(request: NextRequest) {
  return buildOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  const validation = ensureValidApiRequest(request);
  if ("error" in validation) {
    return validation.error;
  }

  const rateLimit = enforceRateLimit(request);
  if (rateLimit) {
    const response = buildErrorResponse(
      `Limite temporario excedido. Tente novamente em ${rateLimit.retryAfter}s.`,
      429,
      validation.origin,
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfter));
    return response;
  }

  try {
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return buildErrorResponse(
        "Informe uma descricao para gerar o JSON.",
        400,
        validation.origin,
      );
    }

    if (prompt.length > 600) {
      return buildErrorResponse(
        "Use no maximo 600 caracteres.",
        400,
        validation.origin,
      );
    }

    const payload = generateJsonFromPrompt(prompt);
    return applyApiHeaders(NextResponse.json(payload), validation.origin);
  } catch {
    return buildErrorResponse(
      "Nao foi possivel processar a solicitacao.",
      500,
      validation.origin,
    );
  }
}
