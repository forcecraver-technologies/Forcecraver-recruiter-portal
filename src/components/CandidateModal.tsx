"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Check, AlertCircle, Briefcase, User, IndianRupee, Clock, Building, MapPin, Sparkles, Loader2, Search, FileText, Upload, Paperclip, Trash2 } from "lucide-react";
import { JobDescription, Recruiter, ScreeningStatus } from "@/types";

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedJdId?: string;
}

export default function CandidateModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedJdId,
}: CandidateModalProps) {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>(preselectedJdId || "");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("All");
  const [jdSearchTerm, setJdSearchTerm] = useState<string>("");
  const [recruiterName, setRecruiterName] = useState<string>("");
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentCompany: "",
    currentDesignation: "",
    experienceYears: "",
    budget: "",
    noticePeriodDays: "30 Days",
    location: "",
    skills: "",
    resumeLink: "",
    resumeFileName: "",
    screeningStatus: "Processing" as ScreeningStatus,
    screeningNotes: "",
    status: "Submitted",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isMaster = useMemo(() => {
    if (!loggedInUser) return false;
    if (loggedInUser.email?.toLowerCase() === "test@forcecraver.com") return false;
    return (
      loggedInUser.email?.toLowerCase() === "sarthak@forcecraver.com" ||
      loggedInUser.email?.toLowerCase() === "admin@forcecraver.com" ||
      loggedInUser.role === "DEVELOPER" ||
      loggedInUser.role === "ADMIN" ||
      Boolean(loggedInUser.isDeveloper)
    );
  }, [loggedInUser]);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved recruiter name from localStorage
    try {
      const saved = localStorage.getItem("recruiter_portal_name");
      if (saved) setRecruiterName(saved);
    } catch {}

    async function loadData() {
      setFetchingData(true);
      try {
        const [jdsRes, recRes, meRes] = await Promise.all([
          fetch("/api/jds?status=Open"),
          fetch("/api/recruiters"),
          fetch("/api/auth/me"),
        ]);
        const jdsData = await jdsRes.json();
        const recData = await recRes.json();
        const meData = await meRes.json();

        if (meData.success && meData.user) {
          setLoggedInUser(meData.user);
          setRecruiterName(meData.user.name);
        }

        if (jdsData.success) {
          setJds(jdsData.data);
          if (preselectedJdId) {
            setSelectedJdId(preselectedJdId);
          } else if (jdsData.data.length > 0 && !selectedJdId) {
            setSelectedJdId(jdsData.data[0].id);
          }
        }

        if (recData.success && recData.data.length > 0) {
          setRecruiters(recData.data);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setFetchingData(false);
      }
    }

    loadData();
  }, [isOpen, preselectedJdId]);

  // Unique companies list for dropdown filter
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    jds.forEach((j) => {
      if (j.client && j.client.trim()) {
        set.add(j.client.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jds]);

  // Company and JD wise filtered list
  const filteredJds = useMemo(() => {
    return jds.filter((jd) => {
      const matchesCompany =
        selectedCompanyFilter === "All" ||
        (jd.client && jd.client.toLowerCase() === selectedCompanyFilter.toLowerCase());

      const query = jdSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        jd.title.toLowerCase().includes(query) ||
        (jd.client && jd.client.toLowerCase().includes(query)) ||
        (jd.requiredSkills && jd.requiredSkills.some((s) => s.toLowerCase().includes(query)));

      return matchesCompany && matchesSearch;
    });
  }, [jds, selectedCompanyFilter, jdSearchTerm]);

  // Auto-select JD if currently selected is filtered out
  useEffect(() => {
    if (filteredJds.length > 0) {
      const stillValid = filteredJds.some((j) => j.id === selectedJdId);
      if (!stillValid) {
        setSelectedJdId(filteredJds[0].id);
      }
    } else {
      setSelectedJdId("");
    }
  }, [filteredJds, selectedJdId]);

  const activeSelectedJd = jds.find((j) => j.id === selectedJdId);

  // AI Skill Match Score computation
  const skillMatch = useMemo(() => {
    if (!activeSelectedJd || !activeSelectedJd.requiredSkills || activeSelectedJd.requiredSkills.length === 0) {
      return null;
    }
    if (!formData.skills) return null;

    const enteredSkills = formData.skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    setErrorMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.success && result.url) {
        setFormData((prev) => ({
          ...prev,
          resumeLink: result.url,
          resumeFileName: result.fileName || file.name,
        }));
      } else {
        setErrorMessage(result.error || "Failed to upload resume file.");
      }
    } catch {
      setErrorMessage("Network error uploading resume file.");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedJdId) {
      setErrorMessage("Please select an Open JD for the candidate.");
      return;
    }
    if (!recruiterName.trim()) {
      setErrorMessage("Please enter your Recruiter Name.");
      return;
    }

    // Save recruiter name for future submissions
    try {
      localStorage.setItem("recruiter_portal_name", recruiterName.trim());
    } catch {}

    setLoading(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget,
          expectedBudget: formData.budget,
          currentCtc: formData.budget,
          resumeLink: formData.resumeLink,
          resumeFileName: formData.resumeFileName,
          jdId: selectedJdId,
          recruiterName: recruiterName.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setErrorMessage(result.error || "Candidate submission failed");
      } else {
        setSuccessMessage("Candidate profile successfully mapped to Open JD!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 600);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <User className="w-4 h-4" />
              </span>
              <span>Map Candidate Profile to Open JD</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit candidate profile and map instantly to an active Open JD.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: JD & Recruiter Mapping */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                Step 1: Map to Live Open JD
              </div>
              <span className="text-[10px] text-indigo-700 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                {filteredJds.length} of {jds.length} JDs Live
              </span>
            </div>

            {/* Quick Filter: Company & JD Search */}
            <div className="p-2.5 bg-white rounded-xl border border-indigo-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                  Search &amp; Filter Open JDs
                </span>
                {(selectedCompanyFilter !== "All" || jdSearchTerm.trim() !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompanyFilter("All");
                      setJdSearchTerm("");
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Filter by Company */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3 text-indigo-500" />
                    Company / Client Wise
                  </label>
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All">All Companies ({uniqueCompanies.length})</option>
                    {uniqueCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. JD Search */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Search className="w-3 h-3 text-indigo-500" />
                    JD / Role Wise Search
                  </label>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search JD e.g. Salesforce, React..."
                        value={jdSearchTerm}
                        onChange={(e) => setJdSearchTerm(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white pl-2.5 pr-7 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {jdSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setJdSearchTerm("")}
                          className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <Search className="w-3 h-3" />
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Select Open JD <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    {filteredJds.length} of {jds.length} JDs Live
                  </span>
                </label>
                <select
                  value={selectedJdId}
                  onChange={(e) => setSelectedJdId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={fetchingData}
                  required
                >
                  <option value="">
                    {filteredJds.length === 0
                      ? "-- No JDs match search filter --"
                      : `-- Choose Open JD (${filteredJds.length} Available) --`}
                  </option>
                  {filteredJds.map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title} &bull; {jd.client} ({jd.budget || "Budget N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Recruiter Name <span className="text-red-500">*</span></span>
                  {isMaster ? (
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      ★ Master Admin (Self-Type / Assign)
                    </span>
                  ) : loggedInUser ? (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Logged-in Recruiter
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-600 font-medium">Enter Recruiter Name</span>
                  )}
                </label>
                <input
                  type="text"
                  list="recruiter-suggestions"
                  required
                  readOnly={Boolean(loggedInUser && !isMaster)}
                  placeholder="Enter Recruiter Name..."
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  className={`w-full text-sm rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    loggedInUser && !isMaster ? "bg-slate-100 text-slate-700 cursor-not-allowed" : "bg-white"
                  }`}
                />
                <datalist id="recruiter-suggestions">
                  {recruiters.map((rec) => (
                    <option key={rec.id} value={rec.name} />
                  ))}
                </datalist>
                {isMaster ? (
                  <span className="text-[10px] text-indigo-600 mt-1 block">
                    Master Access: You can manually type or assign any recruiter name.
                  </span>
                ) : loggedInUser ? (
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Candidate will automatically be mapped to your profile (<strong>{loggedInUser.name}</strong>).
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    You can enter your recruiter name.
                  </span>
                )}
              </div>
            </div>

            {/* Live JD Preview card */}
            {activeSelectedJd && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-200/80 text-xs text-slate-700 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-indigo-900 text-sm">
                    {activeSelectedJd.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    Status: {activeSelectedJd.status} ({activeSelectedJd.openings} Openings)
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  <span>Client: <strong className="text-slate-900">{activeSelectedJd.client}</strong></span>
                  <span>Budget: <strong className="text-slate-900">{activeSelectedJd.budget}</strong></span>
                  <span>Exp Req: <strong className="text-slate-900">{activeSelectedJd.experienceRequired}</strong></span>
                  <span>Location: <strong className="text-slate-900">{activeSelectedJd.location}</strong></span>
                </div>
                {activeSelectedJd.requiredSkills && activeSelectedJd.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-slate-400 font-medium">JD Skills:</span>
                    {activeSelectedJd.requiredSkills.map((s, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-100">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
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
                  placeholder="Candidate full name"
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
                  placeholder="candidate@email.com"
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
                <span className="text-[10px] text-slate-400">10-digit mobile number</span>
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
                    placeholder="e.g. TCS / Infosys / Startup"
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
                  placeholder="e.g. Senior Software Engineer"
                  value={formData.currentDesignation}
                  onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Experience (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Years"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Budget & Notice Period Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget (LPA / LPM) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-indigo-600" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14 LPA / 1.2 LPM"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Period (Days) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15 Days / 30 Days / Immediate"
                    value={formData.noticePeriodDays}
                    onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred / Current Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Bangalore (Open to Hybrid)"
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
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : skillMatch.percentage >= 40
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{skillMatch.percentage}% Match ({skillMatch.matchedCount}/{skillMatch.totalCount} skills)</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="React, Next.js, TypeScript, Tailwind"
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
                  Default: <strong>Processing</strong>
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
                    <option value="Processing">⏳ Processing (Default - Screening in Progress)</option>
                    <option value="Good">🟢 Good (Recommended for Interview)</option>
                    <option value="Average">🟡 Average (Eligible for Interview)</option>
                    <option value="Worst">🔴 Worst (Not Recommended)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  {formData.screeningStatus === "Good" || formData.screeningStatus === "Average" ? (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 w-full">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Interview Portal Sync:</strong> This candidate will be visible live in the Interview Scheduling System.</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-1.5 w-full">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Only candidates with status <strong>Good</strong> or <strong>Average</strong> appear in the Interview Portal.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Upload & Document Link Section */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Candidate Resume (Upload File or Document Link)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">PDF, DOC, DOCX up to 10MB</span>
              </label>

              {formData.resumeFileName ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-950 truncate">{formData.resumeFileName}</span>
                    <span className="text-[10px] text-emerald-700 font-medium">✓ Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, resumeLink: "", resumeFileName: "" })}
                    className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-100 cursor-pointer"
                    title="Remove resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors text-xs font-semibold text-indigo-700">
                      {uploadingResume ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading Resume...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-indigo-600" />
                          <span>Upload Resume File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingResume}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="relative">
                      <Paperclip className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="url"
                        placeholder="Or paste resume link (Drive, etc.)"
                        value={formData.resumeLink}
                        onChange={(e) => {
                          const link = e.target.value;
                          setFormData({
                            ...formData,
                            resumeLink: link,
                            resumeFileName: link ? "Online Resume Link" : "",
                          });
                        }}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recruiter Screening Comments / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Mention why candidate is a good fit, relevant project experience, communication skills, etc."
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
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Candidate Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Candidate Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
