import { proxyEmailRequest } from "@/lib/emailProxy";

export const dynamic = "force-dynamic";

const EMAIL_SUMMARY_ENDPOINT = "https://start-point-email.vercel.app/api/summary";

export async function GET(request: Request) {
  return proxyEmailRequest(request, {
    endpoint: EMAIL_SUMMARY_ENDPOINT,
    serviceName: "email summary service",
  });
}
