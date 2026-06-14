import { NextResponse } from "next/server";

interface EmailProxyOptions {
  endpoint: string;
  serviceName: string;
}

const readPayload = async (response: Response): Promise<Record<string, unknown>> => {
  const text = await response.text();
  if (!text) return {};

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { error: text };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : { data: parsed };
  } catch {
    return {
      error: "Email service returned invalid JSON",
      details: text,
    };
  }
};

const getPayloadError = (payload: Record<string, unknown>) =>
  typeof payload.error === "string" ? payload.error : undefined;

export const proxyEmailRequest = async (
  request: Request,
  { endpoint, serviceName }: EmailProxyOptions
) => {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: authorization,
      },
      cache: "no-store",
    });

    const payload = await readPayload(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          ...payload,
          error:
            getPayloadError(payload) ||
            `${serviceName} returned ${response.status}`,
          upstreamStatus: response.status,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error(`Error fetching ${serviceName}:`, error);
    return NextResponse.json(
      {
        error: `Unable to reach ${serviceName}`,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
};
