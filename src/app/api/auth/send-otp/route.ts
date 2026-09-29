import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, setUserOtp } from "@/lib/users";
import { isAllowedEmail, signAuthToken, AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME } from "@/lib/auth";
import { generateOTP, sendOtpEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawEmail = (body.email || "").trim().toLowerCase();
    if (rawEmail === "test@forcecraver" || rawEmail.startsWith("test@forcecraver")) {
      rawEmail = "test@forcecraver.com";
    }

    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const phone = (body.phone || "").trim();

    if (!rawEmail) {
      return NextResponse.json({ error: "Work email address / User ID is required." }, { status: 400 });
    }

    if (!isAllowedEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid work email address." },
        { status: 403 }
      );
    }

    const computedFullName =
      `${firstName} ${lastName}`.trim() ||
      firstName ||
      lastName ||
      rawEmail
        .split("@")[0]
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

    // Find or create user
    let user = await findUserByEmail(rawEmail);
    if (!user) {
      user = await createUser({
        email: rawEmail,
        firstName,
        lastName,
        name: computedFullName,
        phone,
      });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your recruiter account has been deactivated. Please contact your Lead Administrator." },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await setUserOtp(rawEmail, otp, expiresAt);
    await sendOtpEmail(rawEmail, otp, user.name);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code (OTP) has been sent to ${rawEmail}`,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("Send OTP Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
