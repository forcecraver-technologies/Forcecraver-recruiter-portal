import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  getJDById,
  getRecruiters,
  findOrCreateRecruiterByName,
} from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

function isCandidateOwnedByUser(
  cand: any,
  session: { id?: string; email?: string; name?: string; firstName?: string | null; role?: string }
): boolean {
  if (!session) return false;
  const sessId = (session.id || "").toLowerCase().trim();
  const sessEmail = (session.email || "").toLowerCase().trim();
  const sessName = (session.name || "").toLowerCase().trim();
  const sessFirstName = (session.firstName || "").toLowerCase().trim();
  const candRecId = (cand.recruiterId || "").toLowerCase().trim();
  const candRecName = (cand.recruiterName || "").toLowerCase().trim();
  const candRecEmail = (cand.recruiterEmail || "").toLowerCase().trim();

  // 1. Direct ID match
  if (candRecId && (candRecId === sessId || candRecId.includes(sessId) || sessId.includes(candRecId))) {
    return true;
  }

  // 2. Direct Email match
  if (sessEmail && candRecEmail && sessEmail === candRecEmail) {
    return true;
  }

  // 3. Exact or Normalized Name Match
  if (sessName && candRecName) {
    if (sessName === candRecName) return true;
    if (sessName.startsWith(candRecName) || candRecName.startsWith(sessName)) return true;
    if (candRecName.split(" ")[0] === sessName.split(" ")[0]) return true;
  }

  if (sessFirstName && candRecName && (candRecName === sessFirstName || candRecName.startsWith(sessFirstName))) {
    return true;
  }

  // 4. Test account specific aliases (REC-03, REC-04, Test, Test Recruiter)
  if (sessEmail === "test@forcecraver.com" || sessName.includes("test")) {
    if (
      candRecName.includes("test") ||
      candRecId === "rec-03" ||
      candRecId === "rec-04" ||
      candRecEmail.includes("test")
    ) {
      return true;
    }
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const { searchParams } = new URL(req.url);
    const recruiterId = searchParams.get("recruiterId") || undefined;
    const jdId = searchParams.get("jdId") || undefined;
    const status = searchParams.get("status") || undefined;
    const screeningStatus = searchParams.get("screeningStatus") || undefined;
    const search = searchParams.get("search") || undefined;

    // Authentication requirement
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to view candidates.", data: [] },
        { status: 401 }
      );
    }

    let candidates = await getCandidates({
      recruiterId,
      jdId,
      status,
      screeningStatus,
      search,
    });

    // DATA ISOLATION:
    // Portal Manager (DEVELOPER or ADMIN, excluding test account) manages the portal -> sees all candidates!
    // Standard Recruiter (including Test Recruiter) -> ONLY sees their own candidates!
    const isTestRecruiter = session.email?.toLowerCase() === "test@forcecraver.com";
    const isMaster =
      !isTestRecruiter &&
      (session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
        session.email?.toLowerCase() === "admin@forcecraver.com" ||
        session.role === "DEVELOPER" ||
        session.role === "ADMIN" ||
        Boolean(session.isDeveloper));

    if (!isMaster) {
      candidates = candidates.filter((c) => isCandidateOwnedByUser(c, session));
    }

    return NextResponse.json({ success: true, data: candidates, currentSession: session });
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const body = await req.json();

    if (!body.fullName || !body.email || !body.phone || !body.jdId) {
      return NextResponse.json(
        {
          success: false,
          error: "Full Name, Email, Phone, and Open JD are required",
        },
        { status: 400 }
      );
    }

    // Check JD exists
    const jd = await getJDById(body.jdId);
    if (!jd) {
      return NextResponse.json(
        { success: false, error: "Selected Open JD not found" },
        { status: 404 }
      );
    }

    // Auto-map recruiter identity from logged-in session / master override
    const isTestRecruiter = session?.email?.toLowerCase() === "test@forcecraver.com";
    const isMaster =
      !isTestRecruiter &&
      (session?.email?.toLowerCase() === "sarthak@forcecraver.com" ||
        session?.email?.toLowerCase() === "admin@forcecraver.com" ||
        session?.role === "DEVELOPER" ||
        session?.role === "ADMIN" ||
        Boolean(session?.isDeveloper));

    let effectiveRecruiterName = "";
    let effectiveRecruiterId = "";

    if (isMaster) {
      // Master recruiter can type and assign any custom recruiter name dynamically
      effectiveRecruiterName = (body.recruiterName || "").trim() || session?.name || "Master Recruiter Admin";
      const rec = await findOrCreateRecruiterByName(effectiveRecruiterName);
      effectiveRecruiterId = rec.id;
    } else {
      effectiveRecruiterName = session?.name || (body.recruiterName || "").trim();
      effectiveRecruiterId = session?.id || body.recruiterId || "REC-01";
    }

    if (!effectiveRecruiterName) {
      return NextResponse.json(
        { success: false, error: "Please log in to submit a candidate." },
        { status: 401 }
      );
    }

    // Duplicate check for same JD
    const existing = await getCandidates({ jdId: body.jdId });
    const isDuplicate = existing.some(
      (c) =>
        c.email.toLowerCase() === body.email.toLowerCase() ||
        c.phone.replace(/\D/g, "") === body.phone.replace(/\D/g, "")
    );
    if (isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `Candidate with email '${body.email}' or phone '${body.phone}' is already mapped to ${jd.title}.`,
        },
        { status: 409 }
      );
    }

    const skillsArray = Array.isArray(body.skills)
      ? body.skills
      : (body.skills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    const newCandidate = await createCandidate({
      fullName: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      currentCompany: body.currentCompany || "N/A",
      currentDesignation: body.currentDesignation || "Software Engineer",
      experienceYears: body.experienceYears || "0",
      currentCtc: body.budget || body.currentCtc || "N/A", // Distinct cell/field
      expectedBudget: body.budget || body.expectedBudget || "N/A", // Distinct cell/field
      noticePeriodDays: body.noticePeriodDays || "Immediate",
      location: body.location || "Bengaluru",
      skills: skillsArray,
      resumeLink: body.resumeLink || "",
      resumeFileName: body.resumeFileName || undefined,
      interviewDate: body.interviewDate || undefined,
      interviewTime: body.interviewTime || undefined,
      interviewLink: body.interviewLink || undefined,
      interviewerName: body.interviewerName || undefined,
      interviewRound: body.interviewRound || undefined,
      rating: body.rating ? Number(body.rating) : undefined,
      jdId: jd.id,
      jdTitle: jd.title,
      clientName: jd.client,
      recruiterId: effectiveRecruiterId,
      recruiterName: effectiveRecruiterName,
      recruiterEmail: session?.email?.toLowerCase() || undefined,
      status: body.status || "Submitted",
      screeningStatus: body.screeningStatus || "Processing",
      screeningNotes: body.screeningNotes || "",
    });

    return NextResponse.json({ success: true, data: newCandidate }, { status: 201 });
  } catch (error) {
    console.error("Failed to create candidate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit candidate profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Recruiter data ownership check
    if (session) {
      const isTestRecruiter = session.email?.toLowerCase() === "test@forcecraver.com";
      const isMaster =
        !isTestRecruiter &&
        (session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
          session.email?.toLowerCase() === "admin@forcecraver.com" ||
          session.role === "DEVELOPER" ||
          session.role === "ADMIN" ||
          Boolean(session.isDeveloper));

      if (!isMaster) {
        const allCandidates = await getCandidates();
        const cand = allCandidates.find((c) => c.id === id);
        if (cand && !isCandidateOwnedByUser(cand, session)) {
          return NextResponse.json(
            {
              success: false,
              error: "You cannot edit candidate profiles submitted by another recruiter.",
            },
            { status: 403 }
          );
        }
      }
    }

    // If jdId is updated, sync jdTitle & clientName
    if (updates.jdId) {
      const jd = await getJDById(updates.jdId);
      if (jd) {
        updates.jdTitle = jd.title;
        updates.clientName = jd.client;
      }
    }

    // If recruiterName is updated, ensure recruiter is registered
    if (updates.recruiterName) {
      const rec = await findOrCreateRecruiterByName(updates.recruiterName);
      updates.recruiterId = rec.id;
      updates.recruiterName = rec.name;
    }

    if (typeof updates.skills === "string") {
      updates.skills = updates.skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    if (updates.budget) {
      if (!updates.expectedBudget) updates.expectedBudget = updates.budget;
      if (!updates.currentCtc) updates.currentCtc = updates.budget;
    }

    const updated = await updateCandidate(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update candidate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to delete candidates." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // No body provided
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Recruiter data ownership check
    const isTestRecruiter = session.email?.toLowerCase() === "test@forcecraver.com";
    const isMaster =
      !isTestRecruiter &&
      (session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
        session.email?.toLowerCase() === "admin@forcecraver.com" ||
        session.role === "DEVELOPER" ||
        session.role === "ADMIN" ||
        Boolean(session.isDeveloper));

    if (!isMaster) {
      const allCandidates = await getCandidates();
      const cand = allCandidates.find((c) => c.id === id);
      if (cand && !isCandidateOwnedByUser(cand, session)) {
        return NextResponse.json(
          {
            success: false,
            error: "You cannot delete candidate profiles submitted by another recruiter.",
          },
          { status: 403 }
        );
      }
    }

    const deleted = await deleteCandidate(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Candidate not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Candidate profile successfully deleted" });
  } catch (error) {
    console.error("Failed to delete candidate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete candidate" },
      { status: 500 }
    );
  }
}
