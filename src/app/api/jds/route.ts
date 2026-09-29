import { NextRequest, NextResponse } from "next/server";
import { getJDs, getJDById, createJD, updateJD, deleteJD } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

function isJdOwnedByUser(
  jd: any,
  session: { id?: string; email?: string; name?: string; role?: string }
): boolean {
  if (!session || !jd) return false;
  const sessId = (session.id || "").toLowerCase().trim();
  const sessEmail = (session.email || "").toLowerCase().trim();
  const sessName = (session.name || "").toLowerCase().trim();

  const jdCreatorId = (jd.creatorId || "").toLowerCase().trim();
  const jdCreatorEmail = (jd.creatorEmail || "").toLowerCase().trim();
  const jdCreatedBy = (jd.createdBy || "").toLowerCase().trim();

  // 1. Direct ID match
  if (jdCreatorId && sessId && (jdCreatorId === sessId || jdCreatorId.includes(sessId))) {
    return true;
  }

  // 2. Direct Email match
  if (jdCreatorEmail && sessEmail && jdCreatorEmail === sessEmail) {
    return true;
  }

  // 3. Name match
  if (jdCreatedBy && sessName) {
    if (jdCreatedBy === sessName || jdCreatedBy.startsWith(sessName) || sessName.startsWith(jdCreatedBy)) {
      return true;
    }
  }

  return false;
}

function isMasterAdmin(session: any): boolean {
  if (!session) return false;
  if (session.email?.toLowerCase() === "test@forcecraver.com") return false;
  return (
    session.email?.toLowerCase() === "sarthak@forcecraver.com" ||
    session.email?.toLowerCase() === "admin@forcecraver.com" ||
    session.role === "DEVELOPER" ||
    session.role === "ADMIN" ||
    Boolean(session.isDeveloper)
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const jds = await getJDs(status);
    return NextResponse.json({ success: true, data: jds });
  } catch (error) {
    console.error("Failed to fetch JDs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch JDs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login to post a Job Description." },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.title || !body.client || !body.budget) {
      return NextResponse.json(
        { success: false, error: "Title, Client, and Budget are required" },
        { status: 400 }
      );
    }

    const newJD = await createJD({
      title: body.title,
      client: body.client,
      department: body.department || "General",
      location: body.location || "Remote",
      workMode: body.workMode || "Hybrid",
      experienceRequired: body.experienceRequired || "3 - 5 Years",
      budget: body.budget,
      openings: Number(body.openings) || 1,
      status: body.status || "Open",
      requiredSkills: Array.isArray(body.requiredSkills)
        ? body.requiredSkills
        : (body.requiredSkills || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
      description: body.description || "",
      createdBy: session.name || "HR Recruiter",
      creatorId: session.id,
      creatorEmail: session.email,
    });
    return NextResponse.json({ success: true, data: newJD }, { status: 201 });
  } catch (error) {
    console.error("Failed to create JD:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create JD" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login to update Job Description." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "JD ID is required" },
        { status: 400 }
      );
    }

    // Creator ownership check: Only the person who posted the JD (or Lead Admin) can edit it
    const existingJD = await getJDById(id);
    if (!existingJD) {
      return NextResponse.json(
        { success: false, error: "JD not found" },
        { status: 404 }
      );
    }

    const isOwner = isJdOwnedByUser(existingJD, session);
    const isMaster = isMasterAdmin(session);

    if (!isOwner && !isMaster) {
      return NextResponse.json(
        {
          success: false,
          error: "Aap sirf apne dale huye Open JDs hi update ya modify kar sakte hain.",
        },
        { status: 403 }
      );
    }

    const updated = await updateJD(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update JD:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update JD" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login to delete Job Description." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "JD ID is required" },
        { status: 400 }
      );
    }

    // Creator ownership check: Only the person who posted the JD (or Lead Admin) can remove it
    const existingJD = await getJDById(id);
    if (!existingJD) {
      return NextResponse.json(
        { success: false, error: "JD not found or already removed" },
        { status: 404 }
      );
    }

    const isOwner = isJdOwnedByUser(existingJD, session);
    const isMaster = isMasterAdmin(session);

    if (!isOwner && !isMaster) {
      return NextResponse.json(
        {
          success: false,
          error: "Aap sirf apne dale huye Open JDs hi remove/delete kar sakte hain.",
        },
        { status: 403 }
      );
    }

    const deleted = await deleteJD(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete JD" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Open JD successfully removed." });
  } catch (error) {
    console.error("Failed to delete JD:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete JD" },
      { status: 500 }
    );
  }
}
