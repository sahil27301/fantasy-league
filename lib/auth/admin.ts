import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "fantasy_admin_access";

export function getAdminAccessKey() {
  return process.env.ADMIN_ACCESS_KEY ?? "";
}

export async function isAdminSession() {
  const accessKey = getAdminAccessKey();
  if (!accessKey) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? "";
  return sessionValue === accessKey;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}
