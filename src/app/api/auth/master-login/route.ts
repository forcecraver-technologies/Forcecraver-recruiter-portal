import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, clearUserOtpAndRecordLogin } from "@/lib/users";
import { signAuthToken, AUTH_COOKIE_NAME, RECRUITER_COOKIE_NAME } from "@/lib/auth";

// Master Recruiter Admin Credentials
const MASTER_ADMIN_EMAIL = (process.env.MASTER_ADMIN_EMAIL || "admin@forcecraver.com").toLowerCase();
const MASTER_ADMIN_PASS = process.env.MASTER_ADMIN_PASSWORD || process.env.MASTER_ADMIN_PASS || "Fcadmin@123";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = (body.email || "").trim().toLowerCase();
    const rawPassword = (body.password || "").trim();

    if (!rawEmail || !rawPassword) {
      return NextResponse.json(
        { success: false, error: "Master Recruiter Email ID and Password are both required." },
        { status: 400 }
      );
    }

    // Verify authorized master email & password
    if (rawEmail !== MASTER_ADMIN_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized email. This email is not registered for Master Recruiter access.",
        },
        { status: 403 }
      );
    }

    if (rawPassword !== MASTER_ADMIN_PASS) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect password. Please enter the valid Master Recruiter password.",
        },
        { status: 401 }
      );
    }

    // Find or automatically provision the master admin in the DB
    let user = await findUserByEmail(MASTER_ADMIN_EMAIL);
    if (!user) {
      user = await createUser({
        email: MASTER_ADMIN_EMAIL,
        name: "Master Recruiter Admin",
        firstName: "Master",
        lastName: "Admin",
        role: "ADMIN",
        designation: "Master Portal Administrator",
      });
    }

    // Record login timestamp
    const updatedUser = (await clearUserOtpAndRecordLogin(user.email)) || user;

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      firstName: updatedUser.firstName || "Master",
      lastName: updatedUser.lastName || "Admin",
      phone: updatedUser.phone || null,
      role: "ADMIN",
      designation: updatedUser.designation || "Master Portal Administrator",
      canPostJd: true,
      canScreenCandidates: true,
      canAccessCandidates: true,
      canScheduleInterviews: true,
      isDeveloper: true,
    };

    const token = await signAuthToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: "Master Recruiter Authentication Successful! Redirecting to Admin Dashboard...",
      redirectUrl: "/admin",
      user: tokenPayload,
    });

    const cookieOptions = {
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax" as const,
    };

    response.cookies.set({ name: RECRUITER_COOKIE_NAME, ...cookieOptions });
    response.cookies.set({ name: AUTH_COOKIE_NAME, ...cookieOptions });

    return response;
  } catch (err: any) {
    console.error("Master Login Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process Master login." },
      { status: 500 }
    );
  }
}
