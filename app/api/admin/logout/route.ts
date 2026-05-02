import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";

  console.info("[api/admin/logout] Clearing admin session", { returnTo });
  const response = NextResponse.redirect(new URL(returnTo, url.origin));
  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
