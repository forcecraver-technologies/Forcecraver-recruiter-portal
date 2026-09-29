export type CandidateStatus =
  | "Submitted"
  | "Screening"
  | "Interview Scheduled"
  | "Offered"
  | "Joined"
  | "Rejected";

export type ScreeningStatus = "Processing" | "Good" | "Average" | "Worst";

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentDesignation: string;
  experienceYears: string;
  currentCtc: string; // Separate Cell: e.g. "12 LPA / 1 LPM"
  expectedBudget: string; // Separate Cell: e.g. "16 LPA / 1.5 LPM"
  noticePeriodDays: string;
  location: string;
  skills: string[];
  screeningStatus: ScreeningStatus; // "Processing" (default), "Good", "Average", "Worst"
  resumeLink?: string;
  resumeFileName?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLink?: string;
  interviewerName?: string;
  interviewRound?: string;
  rating?: number; // 1 to 5 stars
  jdId: string;
  jdTitle: string;
  clientName: string;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail?: string;
  status: CandidateStatus;
  screeningNotes: string;
  submittedAt: string;
  updatedAt: string;
}

export type JDStatus = "Open" | "In Progress" | "Closed";

export interface JobDescription {
  id: string;
  title: string;
  client: string;
  department: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  experienceRequired: string; // e.g. "3 - 6 Years"
  budget: string; // e.g. "15 - 22 LPA"
  openings: number;
  filled: number;
  status: JDStatus;
  requiredSkills: string[];
  description: string;
  postedDate: string;
  createdBy?: string;
  creatorId?: string;
  creatorEmail?: string;
  notes?: string;
}

export interface Recruiter {
  id: string;
  name: string;
  email?: string;
  role: string;
  phone?: string;
  activeStatus: boolean;
}

export interface DashboardStats {
  totalOpenJDs: number;
  totalSubmissions: number;
  activeRecruiters: number;
  inPipeline: number;
  offeredCount: number;
  joinedCount: number;
  rejectedCount: number;
}
