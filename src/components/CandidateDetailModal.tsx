"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Clock,
  IndianRupee,
  Calendar,
  Star,
  Sparkles,
  ExternalLink,
  Trash2,
  Pencil,
  Copy,
  Check,
  FileText,
  MessageCircle,
  Video,
  User,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Candidate, JobDescription } from "@/types";

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onDelete?: (id: string, name: string) => void;
  onEdit?: (candidate: Candidate) => void;
  jds?: JobDescription[];
}

function formatBudget(val?: string) {
  if (!val || val === "N/A") return "N/A";
  const clean = val.trim();
  if (clean.startsWith("₹") || clean.startsWith("Rs") || clean.startsWith("INR")) {
    return clean;
  }
  return `₹ ${clean}`;
}

export default function CandidateDetailModal({
  candidate,
  onClose,
  onDelete,
  onEdit,
  jds = [],
}: CandidateDetailModalProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!candidate) return null;

  const handleCopyEmail = () => {
    if (!candidate.email) return;
    navigator.clipboard.writeText(candidate.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!candidate.phone) return;
    navigator.clipboard.writeText(candidate.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Clean phone digits for tel & whatsapp links
  const rawPhoneDigits = candidate.phone ? candidate.phone.replace(/\D/g, "") : "";
  const whatsappNumber = rawPhoneDigits.startsWith("91")
    ? rawPhoneDigits
    : rawPhoneDigits.length === 10
    ? `91${rawPhoneDigits}`
    : rawPhoneDigits;

  const mappedJd = jds.find((j) => j.id === candidate.jdId);

  // AI Skill match percentage
  let matchScore: { percent: number; matched: number; total: number } | null = null;
  if (mappedJd && mappedJd.requiredSkills && mappedJd.requiredSkills.length > 0 && candidate.skills && candidate.skills.length > 0) {
    const req = mappedJd.requiredSkills;
    const candLower = candidate.skills.map((s) => s.toLowerCase().trim());
    const matchedCount = req.filter((r) =>
      candLower.some((c) => c.includes(r.toLowerCase()) || r.toLowerCase().includes(c))
    ).length;
    matchScore = {
      percent: Math.round((matchedCount / req.length) * 100),
      matched: matchedCount,
      total: req.length,
    };
  }

  const budgetDisplay = formatBudget(candidate.budget || candidate.expectedBudget || candidate.currentCtc);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30">
                {candidate.id}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  candidate.screeningStatus === "Good"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    : candidate.screeningStatus === "Average"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                    : candidate.screeningStatus === "Worst"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                    : "bg-blue-500/20 text-blue-300 border border-blue-400/40"
                }`}
              >
                {candidate.screeningStatus === "Good"
                  ? "🟢 Good"
                  : candidate.screeningStatus === "Average"
                  ? "🟡 Average"
                  : candidate.screeningStatus === "Worst"
                  ? "🔴 Worst"
                  : "⏳ Processing"}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                {candidate.status}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
              {candidate.fullName}
            </h2>
            <div className="text-xs text-indigo-200 font-medium flex items-center gap-1.5 flex-wrap">
              <span>{candidate.currentDesignation || "Software Professional"}</span>
              {candidate.currentCompany && candidate.currentCompany !== "N/A" && (
                <>
                  <span>&bull;</span>
                  <span className="text-white font-semibold">{candidate.currentCompany}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Quick Action Contact Bar */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              Quick Candidate Connect:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {candidate.phone && (
                <>
                  <a
                    href={`tel:${candidate.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs shadow-2xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold text-xs shadow-2xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </>
              )}
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs shadow-2xs transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              )}
            </div>
          </div>

          {/* Section 1: Detailed Contact & Personal Information Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Candidate Contact &amp; Profile Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Phone Number
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {candidate.phone || "Not Provided"}
                  </span>
                </div>
                {candidate.phone && (
                  <button
                    onClick={handleCopyPhone}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Copy phone number"
                  >
                    {copiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                    Email Address
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate block">
                    {candidate.email || "Not Provided"}
                  </span>
                </div>
                {candidate.email && (
                  <button
                    onClick={handleCopyEmail}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors shrink-0"
                    title="Copy email address"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Experience */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Total Experience
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {candidate.experienceYears ? `${candidate.experienceYears} Years` : "Not Specified"}
                </span>
              </div>

              {/* Notice Period */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Notice Period
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {candidate.noticePeriodDays || "Immediate / 30 Days"}
                </span>
              </div>

              {/* Location */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Current / Preferred Location
                </span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.location || "Bengaluru / Pan India"}</span>
                </span>
              </div>

              {/* Current Company & Role */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Current Company
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {candidate.currentCompany && candidate.currentCompany !== "N/A"
                    ? candidate.currentCompany
                    : "Not Disclosed / Independent"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Compensation / Budget Box */}
          <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Candidate Budget (LPA / LPM)
              </span>
              <span className="text-lg font-extrabold text-emerald-950 mt-0.5 block">
                {budgetDisplay}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              Single Budget Standard
            </span>
          </div>

          {/* Section 3: Mapped Open JD Card */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-indigo-600" />
                Mapped Open JD (Open JD System)
              </span>
              <span className="font-mono text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {candidate.jdId}
              </span>
            </div>
            <div className="text-sm font-bold text-indigo-950">
              {candidate.jdTitle}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-3">
              <span>Client / Hiring: <strong className="text-slate-900">{candidate.clientName}</strong></span>
              {matchScore && (
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    matchScore.percent >= 70
                      ? "bg-emerald-100 text-emerald-800"
                      : matchScore.percent >= 40
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                  {matchScore.percent}% Skill Match ({matchScore.matched}/{matchScore.total})
                </span>
              )}
            </div>
          </div>

          {/* Section 4: Skills List */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider block">
                Key Technical &amp; Domain Skills:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Recruiter & Screening Information */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Submitted By Recruiter
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {candidate.recruiterName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                  Submission Date
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(candidate.submittedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {candidate.screeningNotes && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                  Recruiter Screening Comments
                </span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 italic leading-relaxed">
                  &ldquo;{candidate.screeningNotes}&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Interview Schedule (if scheduled) */}
          {(candidate.interviewDate || candidate.interviewLink || candidate.interviewRound) && (
            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Interview Schedule: {candidate.interviewRound || "Scheduled"}</span>
                </span>
                {Boolean(candidate.rating) && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500" />
                    <span>Rating: {candidate.rating}/5</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Interview Date</span>
                  <span className="font-bold text-slate-900">{candidate.interviewDate || "TBD"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Timing</span>
                  <span className="font-bold text-slate-900">{candidate.interviewTime || "TBD"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Interviewer</span>
                  <span className="font-bold text-slate-900">{candidate.interviewerName || "Pending Assignment"}</span>
                </div>
              </div>

              {candidate.interviewLink && (
                <div className="pt-2 border-t border-blue-200/60">
                  <a
                    href={candidate.interviewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-2xs transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Online Interview Meeting ↗</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Section 7: Resume Document */}
          {candidate.resumeLink ? (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-900 block truncate text-xs">
                    {candidate.resumeFileName || "Candidate Resume Document"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate block">
                    {candidate.resumeLink}
                  </span>
                </div>
              </div>

              <a
                href={candidate.resumeLink}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs shrink-0 shadow-2xs transition-colors"
              >
                <span>View / Download Resume</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
              <span>📄 No resume document attached yet.</span>
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(candidate);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs underline cursor-pointer"
                >
                  Upload Resume Now
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(candidate.id, candidate.fullName);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? "Deleting..." : "Delete Profile"}</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(candidate);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
