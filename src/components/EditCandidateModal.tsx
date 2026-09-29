"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Check, AlertCircle, User, Briefcase, IndianRupee, Clock, MapPin, Building, Sparkles } from "lucide-react";
import { Candidate, JobDescription, Recruiter, ScreeningStatus } from "@/types";

interface EditCandidateModalProps {
  isOpen: boolean;
  candidate: Candidate;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditCandidateModal({
  isOpen,
  candidate,
  onClose,
  onSuccess,
}: EditCandidateModalProps) {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>(candidate.jdId || "");
  const [recruiterName, setRecruiterName] = useState<string>(candidate.recruiterName || "");

  const [formData, setFormData] = useState({
    fullName: candidate.fullName || "",
    email: candidate.email || "",
    phone: candidate.phone || "",
    currentCompany: candidate.currentCompany || "",
    currentDesignation: candidate.currentDesignation || "",
    experienceYears: candidate.experienceYears || "",
    currentCtc: candidate.currentCtc || "",
    expectedBudget: candidate.expectedBudget || "",
    noticePeriodDays: candidate.noticePeriodDays || "",
    location: candidate.location || "",
    skills: candidate.skills?.join(", ") || "",
    screeningStatus: (candidate.screeningStatus || "Processing") as ScreeningStatus,
    status: candidate.status || "Submitted",
    screeningNotes: candidate.screeningNotes || "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadMetadata() {
      try {
        const [jdsRes, recRes] = await Promise.all([
          fetch("/api/jds?status=Open"),
          fetch("/api/recruiters"),
        ]);
        const jdsData = await jdsRes.json();
        const recData = await recRes.json();

        if (jdsData.success) setJds(jdsData.data);
        if (recData.success) setRecruiters(recData.data);
      } catch (err) {
        console.error("Failed to load edit modal metadata", err);
      }
    }

    loadMetadata();
  }, [isOpen]);

  const activeSelectedJd = jds.find((j) => j.id === selectedJdId);

  // Skill Match calculation
  const skillMatch = useMemo(() => {
    if (!activeSelectedJd || !activeSelectedJd.requiredSkills || activeSelectedJd.requiredSkills.length === 0) {
      return null;
    }
    const enteredSkills = formData.skills
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (enteredSkills.length === 0) return null;

    let matched = 0;
    const reqSkills = activeSelectedJd.requiredSkills;
    reqSkills.forEach((req) => {
      const rLower = req.toLowerCase();
      if (enteredSkills.some((s) => rLower.includes(s) || s.includes(rLower))) {
        matched++;
      }
    });

    const percent = Math.round((matched / reqSkills.length) * 100);
    return {
      percentage: Math.min(100, Math.max(0, percent)),
      matchedCount: matched,
      totalCount: reqSkills.length,
    };
  }, [formData.skills, activeSelectedJd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setErrorMessage("Full Name aur Email zaroori hain.");
      return;
    }
    if (!recruiterName.trim()) {
      setErrorMessage("Recruiter Name zaroori hai.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: candidate.id,
          ...formData,
          jdId: selectedJdId,
          recruiterName: recruiterName.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setErrorMessage(result.error || "Candidate update failed");
      } else {
        setSuccessMessage("Candidate profile updated successfully!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 600);
      }
    } catch {
      setErrorMessage("Network error occurred while updating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30">
              <User className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Edit Candidate Profile</h2>
                <span className="font-mono text-[11px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30">
                  {candidate.id}
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Admin Panel se candidate ki details, CTC aur mapped JD modify karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Mapped Open JD & Recruiter */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              Step 1: Open JD & Recruiter Assignment
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mapped Open JD (Open JD System)
                </label>
                <select
                  value={selectedJdId}
                  onChange={(e) => setSelectedJdId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={candidate.jdId}>
                    {candidate.jdTitle} ({candidate.clientName}) [Current]
                  </option>
                  {jds
                    .filter((j) => j.id !== candidate.jdId)
                    .map((jd) => (
                      <option key={jd.id} value={jd.id}>
                        {jd.title} &bull; {jd.client} ({jd.budget || "Budget N/A"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Recruiter Name <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-medium">Assigned Recruiter</span>
                </label>
                <input
                  type="text"
                  list="edit-recruiter-suggestions"
                  required
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="edit-recruiter-suggestions">
                  {recruiters.map((rec) => (
                    <option key={rec.id} value={rec.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {activeSelectedJd && (
              <div className="p-2.5 bg-white rounded-lg border border-indigo-200 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Client: <strong className="text-slate-900">{activeSelectedJd.client}</strong></span>
                <span>Budget: <strong className="text-slate-900">{activeSelectedJd.budget}</strong></span>
                <span>Exp: <strong className="text-slate-900">{activeSelectedJd.experienceRequired}</strong></span>
                <span>Location: <strong className="text-slate-900">{activeSelectedJd.location}</strong></span>
              </div>
            )}
          </div>

          {/* Section 2: Candidate Basic Details */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Step 2: Candidate Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                  <span className="inline-flex items-center px-3 bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold border-r border-slate-200 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={formData.phone.replace(/^\+91\s*/, "")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, phone: digits ? `+91 ${digits}` : "" });
                    }}
                    className="w-full text-sm px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Company
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Designation
                </label>
                <input
                  type="text"
                  value={formData.currentDesignation}
                  onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Experience (Years)
                </label>
                <input
                  type="text"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Compensation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Current CTC (LPA / LPM) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14 LPA / 1.2 LPM"
                    value={formData.currentCtc}
                    onChange={(e) => setFormData({ ...formData, currentCtc: e.target.value })}
                    className="w-full text-sm rounded-lg border border-amber-300 pl-7 pr-3 py-2 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Expected Budget (LPA / LPM) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20 LPA / 1.5 LPM"
                    value={formData.expectedBudget}
                    onChange={(e) => setFormData({ ...formData, expectedBudget: e.target.value })}
                    className="w-full text-sm rounded-lg border border-emerald-300 pl-7 pr-3 py-2 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Period
                </label>
                <input
                  type="text"
                  value={formData.noticePeriodDays}
                  onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Primary Skills (Comma separated)
                  </label>
                  {skillMatch && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        skillMatch.percentage >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : skillMatch.percentage >= 40
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{skillMatch.percentage}% Match</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Screening Status Evaluation Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Screening Status <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Interview Portal Visibility Filter
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={formData.screeningStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, screeningStatus: e.target.value as ScreeningStatus })
                    }
                    className={`w-full text-sm rounded-lg border px-3 py-2 font-semibold focus:outline-none focus:ring-2 bg-white ${
                      formData.screeningStatus === "Good"
                        ? "border-emerald-400 text-emerald-800 focus:ring-emerald-500"
                        : formData.screeningStatus === "Average"
                        ? "border-amber-400 text-amber-800 focus:ring-amber-500"
                        : formData.screeningStatus === "Worst"
                        ? "border-rose-400 text-rose-800 focus:ring-rose-500"
                        : "border-indigo-400 text-indigo-800 focus:ring-indigo-500"
                    }`}
                  >
                    <option value="Processing">⏳ Processing (Screening in Progress)</option>
                    <option value="Good">🟢 Good (Recommended for Interview)</option>
                    <option value="Average">🟡 Average (Eligible for Interview)</option>
                    <option value="Worst">🔴 Worst (Not Recommended)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  {formData.screeningStatus === "Good" || formData.screeningStatus === "Average" ? (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 w-full">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Interview Portal Sync:</strong> Yeh candidate Interview Schedule System me live show hoga.</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-1.5 w-full">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Interview Portal me sirf <strong>Good</strong> ya <strong>Average</strong> candidates show hote hain.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Screening Notes / Recruiter Comments
              </label>
              <textarea
                rows={2}
                value={formData.screeningNotes}
                onChange={(e) => setFormData({ ...formData, screeningNotes: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Candidate Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
