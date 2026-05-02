import { getAdminCookieName } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

function buildLogoutResponse(request: Request) {
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

export async function GET(request: Request) {
  return buildLogoutResponse(request);
}

export async function POST(request: Request) {
  return buildLogoutResponse(request);
}
