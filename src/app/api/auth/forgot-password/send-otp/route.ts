import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, setUserResetOtp } from "@/lib/users";
import { generateOTP, sendOtpEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }

    if (!rawEmail) {
      return NextResponse.json(
        { error: "Registered email address is required." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(rawEmail);
    if (!user) {
      return NextResponse.json(
        { error: `No registered recruiter account found with email: ${rawEmail}` },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This recruiter account is deactivated. Please contact your Lead Administrator." },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await setUserResetOtp(rawEmail, otp, expiresAt);
    await sendOtpEmail(rawEmail, otp, user.name, "reset");

    return NextResponse.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${rawEmail}`,
      email: rawEmail,
      ...(process.env.NODE_ENV === "development" ? { demoOtp: otp } : {}),
    });
  } catch (err: any) {
    console.error("Forgot password send-otp error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send password reset code." },
      { status: 500 }
    );
  }
}
