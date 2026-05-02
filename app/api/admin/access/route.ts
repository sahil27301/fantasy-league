import { getAdminAccessKey, getAdminCookieName } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const configuredKey = getAdminAccessKey();

  console.info("[api/admin/access] Admin access attempt", {
    hasConfiguredKey: Boolean(configuredKey),
    hasProvidedKey: Boolean(key),
    returnTo,
  });

  if (!configuredKey) {
    return NextResponse.json(
      { error: "ADMIN_ACCESS_KEY is not configured" },
      { status: 500 },
    );
  }

  if (key !== configuredKey) {
    return NextResponse.json(
      { error: "Invalid admin access key" },
      { status: 401 },
    );
  }

  const response = NextResponse.redirect(new URL(returnTo, url.origin));
  response.cookies.set({
    name: getAdminCookieName(),
    value: configuredKey,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
