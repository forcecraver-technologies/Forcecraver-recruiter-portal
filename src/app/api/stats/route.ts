import { NextResponse } from "next/server";
import { getDashboardStats, getJDs, getCandidates } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    const isTestRecruiter = session?.email?.toLowerCase() === "test@forcecraver.com";
    const isMaster =
      session &&
      !isTestRecruiter &&
      (session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
        session.email?.toLowerCase() === "admin@forcecraver.com" ||
        session.role === "DEVELOPER" ||
        session.role === "ADMIN" ||
        Boolean(session.isDeveloper));

    if (isMaster || !session) {
      const stats = await getDashboardStats();
      return NextResponse.json({ success: true, data: stats });
    }

    // Standard recruiter gets isolated stats for themselves
    const [jds, allCandidates] = await Promise.all([getJDs(), getCandidates()]);
    const myCandidates = allCandidates.filter(
      (c) =>
        c.recruiterId === session.id ||
        c.recruiterName.toLowerCase() === session.name.toLowerCase()
    );

    const openJDs = jds.filter((j) => j.status === "Open").length;
    const inPipeline = myCandidates.filter(
      (c) =>
        c.status === "Submitted" ||
        c.status === "Screening" ||
        c.status === "Interview Scheduled"
    ).length;
    const offeredCount = myCandidates.filter((c) => c.status === "Offered").length;
    const joinedCount = myCandidates.filter((c) => c.status === "Joined").length;
    const rejectedCount = myCandidates.filter((c) => c.status === "Rejected").length;

    return NextResponse.json({
      success: true,
      data: {
        totalOpenJDs: openJDs,
        totalSubmissions: myCandidates.length,
        activeRecruiters: 1,
        inPipeline,
        offeredCount,
        joinedCount,
        rejectedCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
