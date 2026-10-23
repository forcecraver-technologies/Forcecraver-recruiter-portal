import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getRecruiters, createRecruiter, getCandidates } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    const recruiters = await getRecruiters();
    const candidates = await getCandidates();

    // Enrich recruiters with submission statistics
    const enriched = recruiters.map((rec) => {
      const recCandidates = candidates.filter((c) => c.recruiterId === rec.id);
      const placed = recCandidates.filter(
        (c) => c.status === "Offered" || c.status === "Joined"
      ).length;
      return {
        ...rec,
        totalSubmissions: recCandidates.length,
        placedCount: placed,
        activeInPipeline: recCandidates.filter(
          (c) => c.status === "Submitted" || c.status === "Screening" || c.status === "Interview Scheduled"
        ).length,
      };
    });

    // If standard recruiter (including Test Recruiter), only return themselves!
    if (session) {
      const isTestRecruiter = session.email?.toLowerCase() === "test@forcecraver.com";
      const isMaster =
        !isTestRecruiter &&
        (session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
          session.role === "DEVELOPER" ||
          session.role === "ADMIN" ||
          Boolean(session.isDeveloper));

      if (!isMaster) {
        return NextResponse.json({
          success: true,
          data: enriched.filter(
            (r) =>
              r.id === session.id ||
              r.name.toLowerCase() === session.name.toLowerCase()
          ),
        });
      }
    }

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Failed to fetch recruiters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recruiters" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Recruiter name is required" },
        { status: 400 }
      );
    }
    const newRecruiter = await createRecruiter({
      name: body.name,
      email: body.email || "",
      role: body.role || "Recruiter",
      phone: body.phone || "",
      activeStatus: true,
    });
    return NextResponse.json({ success: true, data: newRecruiter }, { status: 201 });
  } catch (error) {
    console.error("Failed to create recruiter:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create recruiter" },
      { status: 500 }
    );
  }
}
