import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUSINESS_EMAILS_ENDPOINT = "https://start-point-email.vercel.app/api/business-emails";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(BUSINESS_EMAILS_ENDPOINT, {
      headers: {
        Authorization: authorization,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    let payload: any;
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = { error: await response.text() };
    }

    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching business emails:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch business emails",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
