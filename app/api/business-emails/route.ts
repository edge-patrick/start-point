import { proxyEmailRequest } from "@/lib/emailProxy";

export const dynamic = "force-dynamic";

const BUSINESS_EMAILS_ENDPOINT = "https://start-point-email.vercel.app/api/business-emails";

export async function GET(request: Request) {
  return proxyEmailRequest(request, {
    endpoint: BUSINESS_EMAILS_ENDPOINT,
    serviceName: "business email service",
  });
}
