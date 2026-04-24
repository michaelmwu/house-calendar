import { NextResponse } from "next/server";
import { bootstrapAdmin, setAdminSessionCookie } from "@/lib/server/auth";

function redirectWithError(request: Request, error: string) {
  const url = new URL("/admin/setup", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await bootstrapAdmin({
    bootstrapCode: String(formData.get("bootstrapCode") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return redirectWithError(request, result.error);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  setAdminSessionCookie(response, result.session);
  return response;
}
