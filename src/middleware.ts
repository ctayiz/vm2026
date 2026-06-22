import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./lib/constants";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return new Uint8Array(32);
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return res;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return res;

    // Sliding window: Cookie bei jedem Request verlängern
    const newToken = await new SignJWT({ userId: payload.userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
      .sign(getSecret());

    res.cookies.set(SESSION_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    // Token ungültig → Cookie löschen
    res.cookies.delete(SESSION_COOKIE);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon|icon).*)"],
};
