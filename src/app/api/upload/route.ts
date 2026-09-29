import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login to upload files." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate extension
    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    const allowedExtensions = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only PDF, DOC, DOCX, and image files are allowed.",
        },
        { status: 400 }
      );
    }

    // Limit size to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size exceeds maximum limit of 10MB." },
        { status: 400 }
      );
    }

    // Generate safe unique filename
    const sanitizedBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const savedFileName = `${sanitizedBase}_${uniqueSuffix}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, savedFileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/resumes/${savedFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
