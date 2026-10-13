import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, clearUserOtpAndRecordLogin } from "@/lib/users";
import { signAuthToken, AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME, isAllowedEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }
    const password = (body.password || "").trim();

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Work Email and Password are required." },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid work email address." },
        { status: 403 }
      );
    }

    const user = await findUserByEmail(rawEmail);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password. If you are logging in for the first time, switch to '1st Time Setup'." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your recruiter account is deactivated. Please contact your Lead Administrator." },
        { status: 403 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error: "You have not set a password yet. Please switch to the '1st Time Setup' tab to verify via OTP and create your password.",
          needsSetup: true,
        },
        { status: 400 }
      );
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const updatedUser = (await clearUserOtpAndRecordLogin(rawEmail)) || user;

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role,
      designation: updatedUser.designation,
      canPostJd: updatedUser.canPostJd,
      canScreenCandidates: updatedUser.canScreenCandidates,
      canAccessCandidates: true,
      canScheduleInterviews: updatedUser.canScheduleInterviews,
      isDeveloper: updatedUser.isDeveloper,
    };

    const token = await signAuthToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: "Login successful! Welcome back.",
      user: tokenPayload,
    });

    const cookieOptions = {
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax" as const,
    };

    response.cookies.set({ name: RECRUITER_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: AUTH_COOKIE_NAME, ...cookieOptions });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error during login." },
      { status: 500 }
    );
  }
}
