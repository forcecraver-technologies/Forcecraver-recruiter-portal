import fs from "fs/promises";
import path from "path";
import { Candidate, CandidateStatus, ScreeningStatus, JobDescription, Recruiter, DashboardStats } from "@/types";
import { getPgPool } from "./pg";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const JDS_FILE = path.join(DATA_DIR, "jds.json");
const CANDIDATES_FILE = path.join(DATA_DIR, "candidates.json");
const RECRUITERS_FILE = path.join(DATA_DIR, "recruiters.json");

// Helper to ensure file exists and read safely
async function readJsonFile<T>(filePath: string, defaultData: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
    } catch {}
    return defaultData;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    // Gracefully handle read-only environments (Vercel serverless)
  }
}

// Convert PostgreSQL job row into JobDescription interface
interface PgJobRow {
  id: string;
  company_name: string;
  job_title: string;
  skills: string | null;
  experience: string | null;
  location: string | null;
  salary_budget: string | null;
  job_description: string | null;
  posted_date: string | Date | null;
  status: string;
  shift_timing: string | null;
  notes: string | null;
}

function mapPgJobToJD(row: PgJobRow): JobDescription {
  const loc = row.location || "Remote";
  const locLower = loc.toLowerCase();
  const workMode: "Remote" | "Hybrid" | "Onsite" = locLower.includes("remote")
    ? "Remote"
    : locLower.includes("hybrid")
    ? "Hybrid"
    : "Onsite";

  const skillsList = row.skills
    ? row.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  let postedStr = new Date().toISOString().split("T")[0];
  if (row.posted_date) {
    postedStr = new Date(row.posted_date).toISOString().split("T")[0];
  }

  let createdBy: string | undefined = (row as any).created_by || undefined;
  let creatorId: string | undefined = (row as any).creator_id || undefined;
  let creatorEmail: string | undefined = (row as any).creator_email || undefined;

  if (!createdBy && row.notes && row.notes.includes("CreatedBy:")) {
    const match = row.notes.match(/CreatedBy:\s*([^|(\n]+)(?:\(([^)]+)\))?/);
    if (match) {
      createdBy = match[1]?.trim();
      creatorEmail = match[2]?.trim();
    }
  }

  return {
    id: row.id,
    title: row.job_title,
    client: row.company_name,
    department: row.shift_timing || "Engineering",
    location: loc,
    workMode,
    experienceRequired: row.experience || "Not Specified",
    budget: row.salary_budget || "Not Disclosed",
    openings: 1,
    filled: 0,
    status: row.status === "ACTIVE" ? "Open" : "Closed",
    requiredSkills: skillsList,
    description: row.job_description || "",
    postedDate: postedStr,
    createdBy,
    creatorId,
    creatorEmail,
    notes: row.notes || undefined,
  };
}

// JDs API helpers: Fetches live from Open JD System (PostgreSQL jobs table)
export async function getJDs(statusFilter?: string): Promise<JobDescription[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      let query = `
        SELECT id, company_name, job_title, skills, experience, location, 
               salary_budget, job_description, posted_date, status, shift_timing, notes,
               created_by, creator_id, creator_email
        FROM jobs
      `;
      const values: string[] = [];

      if (statusFilter && statusFilter !== "All") {
        const pgStatus = statusFilter.toLowerCase() === "open" ? "ACTIVE" : "CLOSED";
        query += ` WHERE status = $1`;
        values.push(pgStatus);
      }

      query += ` ORDER BY posted_date DESC, created_at DESC LIMIT 150`;

      const result = await pool.query(query, values);
      return (result.rows || []).map(mapPgJobToJD);
    } catch (pgErr) {
      console.warn("Direct PostgreSQL fetch failed, falling back to local dataset:", pgErr);
    }
  }

  // Fallback to local jds.json
  const jds = await readJsonFile<JobDescription[]>(JDS_FILE, []);
  if (statusFilter && statusFilter !== "All") {
    return jds.filter((jd) => jd.status.toLowerCase() === statusFilter.toLowerCase());
  }
  return jds;
}

export async function getJDById(id: string): Promise<JobDescription | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, company_name, job_title, skills, experience, location, 
                salary_budget, job_description, posted_date, status, shift_timing, notes
         FROM jobs WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (result.rows.length > 0) {
        return mapPgJobToJD(result.rows[0]);
      }
    } catch (err) {
      console.warn("PostgreSQL getJDById error, checking local store:", err);
    }
  }

  const jds = await getJDs();
  return jds.find((jd) => jd.id === id) || null;
}

export async function createJD(
  data: Omit<JobDescription, "id" | "postedDate" | "filled">
): Promise<JobDescription> {
  const creatorTag = data.createdBy
    ? `CreatedBy: ${data.createdBy}${data.creatorEmail ? ` (${data.creatorEmail})` : ""}`
    : "";
  const combinedNotes = data.notes
    ? `${data.notes} | ${creatorTag}`.trim()
    : creatorTag;

  const pool = getPgPool();
  if (pool) {
    try {
      const skillsStr = data.requiredSkills.join(", ");
      const statusStr = data.status === "Open" ? "ACTIVE" : "CLOSED";
      const res = await pool.query(
        `INSERT INTO jobs (id, company_name, job_title, skills, experience, location, salary_budget, job_description, status, notes, posted_date, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, NOW(), NOW())
         RETURNING id, company_name, job_title, skills, experience, location, salary_budget, job_description, posted_date, status, shift_timing, notes`,
        [
          data.client,
          data.title,
          skillsStr,
          data.experienceRequired,
          data.location,
          data.budget,
          data.description,
          statusStr,
          combinedNotes || null,
        ]
      );
      if (res.rows.length > 0) {
        const jd = mapPgJobToJD(res.rows[0]);
        jd.createdBy = data.createdBy;
        jd.creatorId = data.creatorId;
        jd.creatorEmail = data.creatorEmail;
        return jd;
      }
    } catch (err) {
      console.error("PostgreSQL insert job failed, saving to local store:", err);
    }
  }

  const jds = await readJsonFile<JobDescription[]>(JDS_FILE, []);
  const nextNumber = jds.length + 101;
  const newJD: JobDescription = {
    ...data,
    id: `JD-${nextNumber}`,
    filled: 0,
    postedDate: new Date().toISOString().split("T")[0],
    createdBy: data.createdBy,
    creatorId: data.creatorId,
    creatorEmail: data.creatorEmail,
    notes: combinedNotes || undefined,
  };
  jds.unshift(newJD);
  await writeJsonFile(JDS_FILE, jds);
  return newJD;
}

export async function updateJD(
  id: string,
  updates: Partial<JobDescription>
): Promise<JobDescription | null> {
  const pool = getPgPool();
  if (pool && updates.status) {
    try {
      const pgStatus = updates.status === "Open" ? "ACTIVE" : "CLOSED";
      await pool.query(`UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2`, [
        pgStatus,
        id,
      ]);
    } catch (err) {
      console.warn("PostgreSQL status update failed:", err);
    }
  }

  const jds = await readJsonFile<JobDescription[]>(JDS_FILE, []);
  const index = jds.findIndex((jd) => jd.id === id);
  if (index !== -1) {
    jds[index] = { ...jds[index], ...updates };
    await writeJsonFile(JDS_FILE, jds);
    return jds[index];
  }
  return await getJDById(id);
}

export async function deleteJD(id: string): Promise<boolean> {
  let pgSuccess = false;
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]);
      if ((res.rowCount ?? 0) > 0) {
        pgSuccess = true;
      }
    } catch (err) {
      console.warn("PostgreSQL deleteJD failed:", err);
    }
  }

  const jds = await readJsonFile<JobDescription[]>(JDS_FILE, []);
  const filtered = jds.filter((j) => j.id !== id);
  const jsonDeleted = filtered.length !== jds.length;
  if (jsonDeleted) {
    await writeJsonFile(JDS_FILE, filtered);
  }

  if (pool) {
    return pgSuccess || jsonDeleted;
  }
  return jsonDeleted;
}

// Recruiters API helpers: allows recruiters to add their own name dynamically
export async function getRecruiters(): Promise<Recruiter[]> {
  return await readJsonFile<Recruiter[]>(RECRUITERS_FILE, []);
}

export async function findOrCreateRecruiterByName(name: string): Promise<Recruiter> {
  const recruiters = await getRecruiters();
  const trimmed = name.trim();
  const existing = recruiters.find(
    (r) => r.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  // Create new recruiter dynamically with their self-entered name
  const nextId = `REC-${String(recruiters.length + 1).padStart(2, "0")}`;
  const newRecruiter: Recruiter = {
    id: nextId,
    name: trimmed,
    email: "",
    role: "Recruiter",
    phone: "",
    activeStatus: true,
  };
  recruiters.push(newRecruiter);
  await writeJsonFile(RECRUITERS_FILE, recruiters);
  return newRecruiter;
}

export async function createRecruiter(
  data: Omit<Recruiter, "id">
): Promise<Recruiter> {
  return await findOrCreateRecruiterByName(data.name);
}

// Convert PostgreSQL candidate row into Candidate interface
function mapPgCandidateToCandidate(row: any): Candidate {
  const skillsList = row.skills
    ? (typeof row.skills === "string"
        ? row.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(row.skills) ? row.skills : [])
    : [];

  let status: CandidateStatus = "Submitted";
  const rawStatus = (row.screening_status || row.interview_status || "").trim();
  if (rawStatus === "Screening" || rawStatus === "SCREENING") status = "Screening";
  else if (rawStatus === "Interview Scheduled" || rawStatus === "SCHEDULED") status = "Interview Scheduled";
  else if (rawStatus === "Offered" || rawStatus === "OFFERED") status = "Offered";
  else if (rawStatus === "Joined" || rawStatus === "JOINED") status = "Joined";
  else if (rawStatus === "Rejected" || rawStatus === "REJECTED") status = "Rejected";

  // Screening Status: Processing (default), Good, Average, Worst
  let screeningStatus: ScreeningStatus = "Processing";
  const rawScreening = (row.screening_status || "").trim().toLowerCase();
  if (rawScreening === "good") screeningStatus = "Good";
  else if (rawScreening === "average") screeningStatus = "Average";
  else if (rawScreening === "worst") screeningStatus = "Worst";
  else screeningStatus = "Processing";

  return {
    id: row.id,
    fullName: row.name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unnamed Candidate",
    email: row.email || "",
    phone: row.phone || "",
    currentCompany: row.current_company || "",
    currentDesignation: row.current_role || "",
    experienceYears: row.experience || "",
    currentCtc: row.current_ctc || "",
    expectedBudget: row.expected_ctc || "",
    noticePeriodDays: row.notice_period || "30 Days",
    location: row.location || "",
    skills: skillsList,
    screeningStatus,
    resumeLink: row.resume_url || "",
    resumeFileName: row.resume_file_name || undefined,
    interviewDate: row.interview_date ? (typeof row.interview_date === 'string' ? row.interview_date.split('T')[0] : new Date(row.interview_date).toISOString().split('T')[0]) : undefined,
    interviewTime: row.interview_time || undefined,
    interviewLink: row.interview_link || undefined,
    interviewerName: row.interviewer_name || undefined,
    interviewRound: row.interview_round || undefined,
    rating: row.rating ? Number(row.rating) : undefined,
    jdId: row.job_id || "",
    jdTitle: row.job_title || "",
    clientName: row.company_name || "",
    recruiterId: row.recruiter_id || "REC-01",
    recruiterName: row.sourced_by || row.screened_by || "Independent Recruiter",
    recruiterEmail: row.recruiter_email || "",
    status,
    screeningNotes: row.screening_notes || row.notes || "",
    submittedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// Candidates API helpers
export async function getCandidates(filters?: {
  recruiterId?: string;
  recruiterName?: string;
  jdId?: string;
  status?: string;
  screeningStatus?: string;
  search?: string;
}): Promise<Candidate[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      let query = `
        SELECT id, name, first_name, last_name, email, phone, experience, location,
               "current_role", current_company, current_ctc, expected_ctc, notice_period,
               resume_url, resume_file_name, skills, notes, screening_notes, screening_status, interview_status,
               interview_date, interview_time, interview_link, interviewer_name, interview_round, rating,
               job_id, company_name, job_title, recruiter_id, recruiter_email, sourced_by,
               created_at, updated_at
        FROM candidates
        ORDER BY created_at DESC
      `;
      const res = await pool.query(query);
      let list = (res.rows || []).map(mapPgCandidateToCandidate);

      if (filters?.recruiterId && filters.recruiterId !== "All") {
        list = list.filter((c) => c.recruiterId === filters.recruiterId);
      }
      if (filters?.recruiterName && filters.recruiterName !== "All") {
        list = list.filter(
          (c) => c.recruiterName.toLowerCase() === filters.recruiterName?.toLowerCase()
        );
      }
      if (filters?.jdId && filters.jdId !== "All") {
        list = list.filter((c) => c.jdId === filters.jdId);
      }
      if (filters?.status && filters.status !== "All") {
        list = list.filter(
          (c) => c.status.toLowerCase() === filters.status?.toLowerCase()
        );
      }
      if (filters?.screeningStatus && filters.screeningStatus !== "All") {
        list = list.filter(
          (c) => c.screeningStatus.toLowerCase() === filters.screeningStatus?.toLowerCase()
        );
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.currentCompany.toLowerCase().includes(q) ||
            c.recruiterName.toLowerCase().includes(q) ||
            c.skills.some((s) => s.toLowerCase().includes(q))
        );
      }
      return list;
    } catch (pgErr) {
      console.warn("PostgreSQL getCandidates failed, fallback to local store:", pgErr);
    }
  }

  let candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);

  // Ensure default screeningStatus on local records if missing
  candidates = candidates.map((c) => ({
    ...c,
    screeningStatus: c.screeningStatus || "Processing",
  }));

  if (filters?.recruiterId && filters.recruiterId !== "All") {
    candidates = candidates.filter((c) => c.recruiterId === filters.recruiterId);
  }

  if (filters?.recruiterName && filters.recruiterName !== "All") {
    candidates = candidates.filter(
      (c) => c.recruiterName.toLowerCase() === filters.recruiterName?.toLowerCase()
    );
  }

  if (filters?.jdId && filters.jdId !== "All") {
    candidates = candidates.filter((c) => c.jdId === filters.jdId);
  }

  if (filters?.status && filters.status !== "All") {
    candidates = candidates.filter(
      (c) => c.status.toLowerCase() === filters.status?.toLowerCase()
    );
  }

  if (filters?.screeningStatus && filters.screeningStatus !== "All") {
    candidates = candidates.filter(
      (c) => c.screeningStatus.toLowerCase() === filters.screeningStatus?.toLowerCase()
    );
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.currentCompany.toLowerCase().includes(q) ||
        c.recruiterName.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
    );
  }

  return candidates.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function createCandidate(
  data: Omit<Candidate, "id" | "submittedAt" | "updatedAt">
): Promise<Candidate> {
  const pool = getPgPool();

  let jdPrefix = (data.jdId || "").trim();
  if (jdPrefix.startsWith("JD-")) {
    jdPrefix = jdPrefix;
  } else {
    const cleanId = jdPrefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    jdPrefix = cleanId ? `JD-${cleanId}` : `JD-GENERAL`;
  }

  // Generate guaranteed unique candidate ID using PostgreSQL records when available
  let nextId = "";
  if (pool) {
    try {
      const existingRes = await pool.query(
        `SELECT id FROM candidates WHERE job_id = $1 OR id LIKE $2`,
        [data.jdId || "", `${jdPrefix}-C%`]
      );

      let maxNum = 0;
      for (const row of existingRes.rows) {
        const match = (row.id || "").match(/-C(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      // Check iteratively to guarantee no collision with existing candidates
      let candNum = maxNum + 1;
      while (true) {
        const testId = `${jdPrefix}-C${String(candNum).padStart(2, "0")}`;
        const check = await pool.query(`SELECT 1 FROM candidates WHERE id = $1 LIMIT 1`, [testId]);
        if ((check.rowCount ?? 0) === 0) {
          nextId = testId;
          break;
        }
        candNum++;
        if (candNum > maxNum + 500) {
          nextId = `${jdPrefix}-C${Date.now().toString().slice(-4)}`;
          break;
        }
      }
    } catch (e) {
      console.warn("Failed to query existing candidate IDs from PG:", e);
    }
  }

  // Fallback to local store if pool was not available or nextId not set
  if (!nextId) {
    const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
    const existingForJd = candidates.filter((c) => c.jdId === data.jdId || c.id?.startsWith(jdPrefix));
    let maxNum = 0;
    for (const c of existingForJd) {
      const match = (c.id || "").match(/-C(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    nextId = `${jdPrefix}-C${String(maxNum + 1).padStart(2, "0")}`;
  }

  // Ensure recruiter is registered if typed by name
  let recName = data.recruiterName?.trim() || "Independent Recruiter";
  let recId = data.recruiterId;

  if (recName) {
    const rec = await findOrCreateRecruiterByName(recName);
    recId = rec.id;
    recName = rec.name;
  }

  const now = new Date().toISOString();
  const skillsStr = data.skills ? (Array.isArray(data.skills) ? data.skills.join(", ") : data.skills) : "";
  const initialScreeningStatus = data.screeningStatus || "Processing";

  // Insert to PostgreSQL
  if (pool) {
    try {
      const res = await pool.query(
        `INSERT INTO candidates (
           id, name, email, phone, experience, location, "current_role", current_company,
           current_ctc, expected_ctc, notice_period, resume_url, resume_file_name, skills, screening_notes,
           screening_status, interview_status, interview_date, interview_time, interview_link, interviewer_name, interview_round, rating,
           job_id, company_name, job_title, recruiter_id, recruiter_email, sourced_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW())
         RETURNING *`,
        [
          nextId,
          data.fullName,
          data.email || null,
          data.phone || null,
          data.experienceYears || null,
          data.location || null,
          data.currentDesignation || null,
          data.currentCompany || null,
          data.currentCtc || null,
          data.expectedBudget || null,
          data.noticePeriodDays || null,
          data.resumeLink || null,
          data.resumeFileName || null,
          skillsStr,
          data.screeningNotes || null,
          initialScreeningStatus,
          data.status || "Submitted",
          data.interviewDate || null,
          data.interviewTime || null,
          data.interviewLink || null,
          data.interviewerName || null,
          data.interviewRound || null,
          data.rating || null,
          data.jdId || null,
          data.clientName || null,
          data.jdTitle || null,
          recId || null,
          data.recruiterEmail || null,
          recName || null,
        ]
      );
      if (res.rows.length > 0) {
        const created = mapPgCandidateToCandidate(res.rows[0]);
        // Also keep local store in sync
        try {
          const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
          candidates.unshift(created);
          await writeJsonFile(CANDIDATES_FILE, candidates);
        } catch {}
        return created;
      }
    } catch (err) {
      console.error("PostgreSQL insert candidate error:", err);
      throw err;
    }
  }

  const newCandidate: Candidate = {
    ...data,
    id: nextId,
    screeningStatus: initialScreeningStatus,
    recruiterId: recId,
    recruiterName: recName,
    submittedAt: now,
    updatedAt: now,
  };

  const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
  candidates.unshift(newCandidate);
  await writeJsonFile(CANDIDATES_FILE, candidates);
  return newCandidate;
}

export async function updateCandidate(
  id: string,
  updates: Partial<Candidate>
): Promise<Candidate | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      const skillsStr = updates.skills ? (Array.isArray(updates.skills) ? updates.skills.join(", ") : updates.skills) : undefined;
      const res = await pool.query(
        `UPDATE candidates
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             experience = COALESCE($4, experience),
             location = COALESCE($5, location),
             "current_role" = COALESCE($6, "current_role"),
             current_company = COALESCE($7, current_company),
             current_ctc = COALESCE($8, current_ctc),
             expected_ctc = COALESCE($9, expected_ctc),
             notice_period = COALESCE($10, notice_period),
             resume_url = COALESCE($11, resume_url),
             resume_file_name = COALESCE($12, resume_file_name),
             skills = COALESCE($13, skills),
             screening_notes = COALESCE($14, screening_notes),
             screening_status = COALESCE($15, screening_status),
             interview_status = COALESCE($16, interview_status),
             interview_date = COALESCE($17, interview_date),
             interview_time = COALESCE($18, interview_time),
             interview_link = COALESCE($19, interview_link),
             interviewer_name = COALESCE($20, interviewer_name),
             interview_round = COALESCE($21, interview_round),
             rating = COALESCE($22, rating),
             job_id = COALESCE($23, job_id),
             company_name = COALESCE($24, company_name),
             job_title = COALESCE($25, job_title),
             updated_at = NOW()
         WHERE id = $26
         RETURNING *`,
        [
          updates.fullName || null,
          updates.email || null,
          updates.phone || null,
          updates.experienceYears || null,
          updates.location || null,
          updates.currentDesignation || null,
          updates.currentCompany || null,
          updates.currentCtc || null,
          updates.expectedBudget || null,
          updates.noticePeriodDays || null,
          updates.resumeLink || null,
          updates.resumeFileName || null,
          skillsStr || null,
          updates.screeningNotes || null,
          updates.screeningStatus || null,
          updates.status || null,
          updates.interviewDate || null,
          updates.interviewTime || null,
          updates.interviewLink || null,
          updates.interviewerName || null,
          updates.interviewRound || null,
          updates.rating || null,
          updates.jdId || null,
          updates.clientName || null,
          updates.jdTitle || null,
          id,
        ]
      );
      if (res.rows.length > 0) {
        const updated = mapPgCandidateToCandidate(res.rows[0]);
        // Also update local store
        const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
        const index = candidates.findIndex((c) => c.id === id);
        if (index !== -1) {
          candidates[index] = { ...candidates[index], ...updates, updatedAt: new Date().toISOString() };
          await writeJsonFile(CANDIDATES_FILE, candidates);
        }
        return updated;
      }
    } catch (err) {
      console.warn("PostgreSQL updateCandidate failed:", err);
    }
  }

  const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
  const index = candidates.findIndex((c) => c.id === id);
  if (index === -1) return null;

  candidates[index] = {
    ...candidates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(CANDIDATES_FILE, candidates);
  return candidates[index];
}

export async function deleteCandidate(id: string): Promise<boolean> {
  let pgSuccess = false;
  const pool = getPgPool();
  if (pool) {
    try {
      try {
        await pool.query(`DELETE FROM interviews WHERE candidate_id = $1`, [id]);
      } catch {}
      const res = await pool.query(`DELETE FROM candidates WHERE id = $1`, [id]);
      if ((res.rowCount ?? 0) > 0) {
        pgSuccess = true;
      }
    } catch (err) {
      console.warn("PostgreSQL deleteCandidate failed:", err);
    }
  }

  let jsonDeleted = false;
  try {
    const candidates = await readJsonFile<Candidate[]>(CANDIDATES_FILE, []);
    const filtered = candidates.filter((c) => c.id !== id);
    jsonDeleted = filtered.length !== candidates.length;
    if (jsonDeleted) {
      await writeJsonFile(CANDIDATES_FILE, filtered);
    }
  } catch {}

  if (pool) {
    return pgSuccess || jsonDeleted;
  }
  return jsonDeleted;
}

// Dashboard KPIs
export async function getDashboardStats(): Promise<DashboardStats> {
  const [jds, candidates, recruiters] = await Promise.all([
    getJDs(),
    getCandidates(),
    getRecruiters(),
  ]);

  const openJDs = jds.filter((j) => j.status === "Open").length;
  const inPipeline = candidates.filter(
    (c) => c.status === "Submitted" || c.status === "Screening" || c.status === "Interview Scheduled"
  ).length;
  const offeredCount = candidates.filter((c) => c.status === "Offered").length;
  const joinedCount = candidates.filter((c) => c.status === "Joined").length;
  const rejectedCount = candidates.filter((c) => c.status === "Rejected").length;

  return {
    totalOpenJDs: openJDs,
    totalSubmissions: candidates.length,
    activeRecruiters: recruiters.filter((r) => r.activeStatus).length,
    inPipeline,
    offeredCount,
    joinedCount,
    rejectedCount,
  };
}
