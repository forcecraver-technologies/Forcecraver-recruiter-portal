import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, setUserOtp } from "@/lib/users";
import { isAllowedEmail } from "@/lib/auth";
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
        { error: "Invalid email domain. Only official work email addresses are allowed (e.g. name@forcecraver.com)." },
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

    // Check if account already exists with active password
    const existingUser = await findUserByEmail(rawEmail);
    if (existingUser && existingUser.password) {
      return NextResponse.json(
        {
          error: `An account for ${rawEmail} is already registered with a password. Please switch to the "Sign In" tab to log in.`,
          alreadyRegistered: true,
        },
        { status: 409 }
      );
    }

    // Find or create user
    let user = existingUser;
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
    await sendOtpEmail(rawEmail, otp, user.name || computedFullName, "setup");

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code (OTP) has been sent to ${rawEmail}`,
      email: rawEmail,
      demoOtp: otp,
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
