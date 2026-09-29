import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, clearUserOtpAndRecordLogin } from "@/lib/users";
import { signAuthToken, AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }
    const otpInput = (body.otp || "").trim();

    if (!rawEmail || !otpInput) {
      return NextResponse.json({ error: "Email and OTP code are required." }, { status: 400 });
    }

    const isTestUser = rawEmail === "test@forcecraver.com";
    const user = await findUserByEmail(rawEmail);

    if (!user) {
      return NextResponse.json({ error: "Recruiter account not found." }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is deactivated. Contact your Lead Administrator." },
        { status: 403 }
      );
    }

    // Verify OTP code
    const isMatched = user.otpCode && user.otpCode.trim() === otpInput;

    if (!isMatched) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // Check expiration
    if (user.otpExpiresAt) {
      const expDate = new Date(user.otpExpiresAt);
      if (expDate < new Date()) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }
    }

    // Clear OTP and record login
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
    console.error("Verify OTP Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify OTP code." },
      { status: 500 }
    );
  }
}
