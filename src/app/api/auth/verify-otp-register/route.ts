import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, activateUserWithPassword } from "@/lib/users";
import { signAuthToken, AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME, isAllowedEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }

    const otpInput = (body.otp || "").trim();
    const password = (body.password || "").trim();
    const confirmPassword = (body.confirmPassword || "").trim();
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const phone = (body.phone || "").trim();

    if (!rawEmail || !otpInput || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Work Email, OTP Code, Password, and Confirm Password are required." },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Only official work email addresses are allowed." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "New Password and Confirm Password do not match." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(rawEmail);
    if (!user) {
      return NextResponse.json(
        { error: "No account request found for this email. Please request OTP first." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your recruiter account is deactivated. Contact your Lead Administrator." },
        { status: 403 }
      );
    }

    if (!user.otpCode || user.otpCode.trim() !== otpInput) {
      return NextResponse.json(
        { error: "Invalid 6-digit verification code. Please check and re-enter." },
        { status: 400 }
      );
    }

    if (user.otpExpiresAt) {
      const expDate = new Date(user.otpExpiresAt);
      if (expDate < new Date()) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new OTP code." },
          { status: 400 }
        );
      }
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const fullName = `${firstName} ${lastName}`.trim() || user.name;

    // Activate user with new password
    const activatedUser = await activateUserWithPassword({
      email: rawEmail,
      passwordHash: hashedPassword,
      name: fullName,
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone,
    });

    const tokenPayload = {
      id: activatedUser.id,
      email: activatedUser.email,
      name: activatedUser.name,
      firstName: activatedUser.firstName,
      lastName: activatedUser.lastName,
      phone: activatedUser.phone,
      role: activatedUser.role,
      designation: activatedUser.designation,
      canPostJd: activatedUser.canPostJd,
      canScreenCandidates: activatedUser.canScreenCandidates,
      canAccessCandidates: true,
      canScheduleInterviews: activatedUser.canScheduleInterviews,
      isDeveloper: activatedUser.isDeveloper,
    };

    const token = await signAuthToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: "Account activated and password set successfully! Logging you in...",
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
    console.error("Verify OTP & Register Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete account setup." },
      { status: 500 }
    );
  }
}
