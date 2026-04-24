import { NextResponse } from "next/server";
import { loginAdmin, setAdminSessionCookie } from "@/lib/server/auth";

function redirectWithParams(request: Request, params: Record<string, string>) {
  const url = new URL("/admin/login", request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await loginAdmin({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return redirectWithParams(request, { error: result.error });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  setAdminSessionCookie(response, result.session);
  return response;
}
