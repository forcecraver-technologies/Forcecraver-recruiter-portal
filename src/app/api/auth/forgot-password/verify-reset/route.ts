import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, updateUserPassword } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }

    const otp = (body.otp || "").trim();
    const password = (body.password || "").trim();
    const confirmPassword = (body.confirmPassword || "").trim();

    if (!rawEmail || !otp || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Email, OTP Code, New Password, and Confirm Password are required." },
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
        { error: `No registered account found with email: ${rawEmail}` },
        { status: 404 }
      );
    }

    if (!user.resetOtpCode || user.resetOtpCode.trim() !== otp) {
      return NextResponse.json(
        { error: "Invalid 6-digit password reset code." },
        { status: 400 }
      );
    }

    if (user.resetOtpExpiresAt) {
      const expDate = new Date(user.resetOtpExpiresAt);
      if (expDate < new Date()) {
        return NextResponse.json(
          { error: "Password reset code has expired. Please request a new code." },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await updateUserPassword(rawEmail, hashedPassword);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (err: any) {
    console.error("Forgot password verify-reset error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
