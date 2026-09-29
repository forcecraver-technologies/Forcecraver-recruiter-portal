import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  const clearOptions = {
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
  };

  response.cookies.set({ name: RECRUITER_COOKIE_NAME, ...clearOptions });
  response.cookies.set({ name: AUTH_COOKIE_NAME, ...clearOptions });

  return response;
}
