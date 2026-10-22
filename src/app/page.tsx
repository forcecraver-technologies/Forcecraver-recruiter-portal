"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  Search,
  Filter,
  PlusCircle,
  Clock,
  IndianRupee,
  Building,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Candidate, Recruiter, JobDescription } from "@/types";
import CandidateModal from "@/components/CandidateModal";
import CandidateDetailModal from "@/components/CandidateDetailModal";

function formatBudget(val?: string) {
  if (!val || val === "N/A") return "N/A";
  const clean = val.trim();
  if (clean.startsWith("₹") || clean.startsWith("Rs") || clean.startsWith("INR")) {
    return clean;
  }
  return `₹ ${clean}`;
}

export default function HomePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("All");
  const [filterRecruiter, setFilterRecruiter] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterScreeningStatus, setFilterScreeningStatus] = useState("All");
  const [filterJd, setFilterJd] = useState("All");
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const isPortalManager = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.email?.toLowerCase() === "test@forcecraver.com") return false;
    return (
      currentUser.email?.toLowerCase() === "sarthak@forcecraver.com" ||
      currentUser.email?.toLowerCase() === "admin@forcecraver.com" ||
      currentUser.role === "DEVELOPER" ||
      currentUser.role === "ADMIN" ||
      Boolean(currentUser.isDeveloper)
    );
  }, [currentUser]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    jds.forEach((j) => {
      if (j.client && j.client.trim()) set.add(j.client.trim());
    });
    candidates.forEach((c) => {
      if (c.clientName && c.clientName.trim()) set.add(c.clientName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jds, candidates]);

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(
    null
  );
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete candidate "${candidateName}"? This profile will be permanently removed from the portal.`
    );
    if (!confirmDelete) return;

    setDeletingCandidateId(candidateId);
    try {
      const res = await fetch(`/api/candidates?id=${encodeURIComponent(candidateId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        if (selectedCandidateForDetails?.id === candidateId) {
          setSelectedCandidateForDetails(null);
        }
      } else {
        alert(data.error || "Failed to delete candidate");
      }
    } catch (err) {
      console.error("Failed to delete candidate", err);
      alert("Error deleting candidate. Please try again.");
    } finally {
      setDeletingCandidateId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [candRes, recRes, jdsRes, meRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/recruiters"),
        fetch("/api/jds?status=Open"),
        fetch("/api/auth/me"),
      ]);

      const meData = await meRes.json();
      if (!meData.success || !meData.user) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(meData.user);

      const candData = await candRes.json();
      const recData = await recRes.json();
      const jdsData = await jdsRes.json();

      if (candData.success) setCandidates(candData.data);
      if (recData.success) setRecruiters(recData.data);
      if (jdsData.success) setJds(jdsData.data);
    } catch (err) {
      console.error("Failed to load candidates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener("refresh-data", handleRefresh);
    return () => window.removeEventListener("refresh-data", handleRefresh);
  }, []);

  const filteredCandidates = candidates.filter((c) => {
    const matchesCompany =
      filterCompany === "All" ||
      c.clientName?.toLowerCase() === filterCompany.toLowerCase();

    const matchesRecruiter =
      filterRecruiter === "All" ||
      c.recruiterId === filterRecruiter ||
      c.recruiterName.toLowerCase() === filterRecruiter.toLowerCase() ||
      (filterRecruiter.toLowerCase().includes("test") && c.recruiterName.toLowerCase().includes("test"));

    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    const matchesScreeningStatus =
      filterScreeningStatus === "All" ||
      (c.screeningStatus || "Processing").toLowerCase() === filterScreeningStatus.toLowerCase();
    const matchesJd = filterJd === "All" || c.jdId === filterJd;

    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.currentCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.jdTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.recruiterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCompany && matchesRecruiter && matchesStatus && matchesScreeningStatus && matchesJd && matchesSearch;
  });

  // Calculate quick stats
  const totalCount = candidates.length;
  const inPipeline = candidates.filter(
    (c) => c.status === "Submitted" || c.status === "Screening" || c.status === "Interview Scheduled"
  ).length;
  const placedCount = candidates.filter((c) => c.status === "Offered" || c.status === "Joined").length;
  const activeRecruitersCount = new Set(candidates.map((c) => c.recruiterName)).size;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            {isPortalManager
              ? "Portal Manager Control: Master Board"
              : `Recruiter Workspace: ${currentUser?.name || "HR Recruiter"}`}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isPortalManager
              ? "Master Recruiter Candidate Profiles"
              : "My Submitted Candidate Profiles"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {isPortalManager
              ? "Portal Manager View: Candidate profiles submitted across all recruiters are monitored and managed live here."
              : `Candidate profiles submitted by you (${currentUser?.name || "HR Recruiter"}) for active Open JDs are shown here.`}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setShowAddCandidateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Map Candidate to Open JD</span>
            </button>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <span>Admin Master Table &rarr;</span>
            </a>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none"></div>
      </div>

      {/* Mini Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Candidates
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Profiles submitted</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            In Pipeline
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 mt-1">{inPipeline}</div>
          <span className="text-[10px] text-amber-600">Screening & Interview</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Offered / Joined
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900 mt-1">{placedCount}</div>
          <span className="text-[10px] text-emerald-600">Success conversions</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
            Contributing Recruiters
          </span>
          <div className="text-xl sm:text-2xl font-bold text-indigo-900 mt-1">{activeRecruitersCount}</div>
          <span className="text-[10px] text-indigo-600">Active team members</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, role, skills, company, recruiter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <button
            onClick={() => setShowAddCandidateModal(true)}
            className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Map Candidate</span>
          </button>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Filter by Company */}
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate"
          >
            <option value="All">All Companies ({companies.length})</option>
            {companies.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>

          {/* Filter by Recruiter: Portal Manager only */}
          {isPortalManager && (
            <select
              value={filterRecruiter}
              onChange={(e) => setFilterRecruiter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Recruiters ({recruiters.length})</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Filter by Screening Status */}
          <select
            value={filterScreeningStatus}
            onChange={(e) => setFilterScreeningStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Screening Status</option>
            <option value="Processing">⏳ Processing</option>
            <option value="Good">🟢 Good</option>
            <option value="Average">🟡 Average</option>
            <option value="Worst">🔴 Worst</option>
          </select>

          {/* Filter by Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Pipeline Stages</option>
            <option value="Submitted">Submitted</option>
            <option value="Screening">Screening</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Offered">Offered</option>
            <option value="Joined">Joined</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Filter by Mapped Open JD */}
          <select
            value={filterJd}
            onChange={(e) => setFilterJd(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate"
          >
            <option value="All">All Open JDs</option>
            {jds.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.client})
              </option>
            ))}
          </select>

          {(filterCompany !== "All" || filterRecruiter !== "All" || filterStatus !== "All" || filterScreeningStatus !== "All" || filterJd !== "All" || searchTerm) && (
            <button
              onClick={() => {
                setFilterCompany("All");
                setFilterRecruiter("All");
                setFilterStatus("All");
                setFilterScreeningStatus("All");
                setFilterJd("All");
                setSearchTerm("");
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Submitted Candidate Profiles</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredCandidates.length} Profiles
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Showing candidate cards mapped to Open JDs
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white rounded-xl border border-slate-200">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs sm:text-sm">Loading Candidate Cards...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No matching candidate profiles found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Candidates submitted by your recruitment team will appear here in card view.
            </p>
            <button
              onClick={() => setShowAddCandidateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Map First Candidate to Open JD</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Main Info */}
                <div className="p-5 space-y-3.5">
                  {/* Top Bar: Recruiter Name badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md truncate max-w-[170px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0"></span>
                      <span>By: {cand.recruiterName}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                          cand.screeningStatus === "Good"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : cand.screeningStatus === "Average"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : cand.screeningStatus === "Worst"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : "bg-blue-50 text-blue-800 border-blue-300"
                        }`}
                      >
                        {cand.screeningStatus === "Good"
                          ? "🟢 Good"
                          : cand.screeningStatus === "Average"
                          ? "🟡 Average"
                          : cand.screeningStatus === "Worst"
                          ? "🔴 Worst"
                          : "⏳ Processing"}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          cand.status === "Offered" || cand.status === "Joined"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : cand.status === "Interview Scheduled"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : cand.status === "Rejected"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {cand.status}
                      </span>
                    </div>
                  </div>

                  {/* Candidate Name & Current Role */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cand.fullName}
                    </h3>
                    <div className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">
                      {cand.currentDesignation}{cand.currentCompany && cand.currentCompany !== "N/A" && (<> &bull; <span className="text-slate-500">{cand.currentCompany}</span></>)}
                    </div>
                  </div>

                  {/* Mapped Open JD Banner (From Open JD System) */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Briefcase className="w-3 h-3 text-indigo-600" />
                      <span>Mapped Open JD (Open JD System):</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {cand.jdTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>Client: <strong>{cand.clientName}</strong></span>
                    </div>
                  </div>

                  {/* Single Budget Box */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Budget
                    </span>
                    <span className="font-bold text-emerald-950 text-sm">
                      {formatBudget(cand.budget || cand.expectedBudget || cand.currentCtc)}
                    </span>
                  </div>

                  {/* Exp, Notice, Location */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Exp: <strong>{cand.experienceYears}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Notice: <strong>{cand.noticePeriodDays}</strong></span>
                    </div>
                    {cand.location && (
                      <div className="col-span-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{cand.location}</span>
                      </div>
                    )}
                    {/* Direct Contact Details on Card */}
                    {(cand.phone || cand.email) && (
                      <div className="col-span-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                        {cand.phone && (
                          <a
                            href={`tel:${cand.phone.replace(/\s+/g, '')}`}
                            className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium transition-colors"
                            title="Call candidate"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{cand.phone}</span>
                          </a>
                        )}
                        {cand.email && (
                          <a
                            href={`mailto:${cand.email}`}
                            className="flex items-center gap-1 text-slate-600 hover:text-indigo-700 font-medium transition-colors truncate max-w-[170px]"
                            title="Email candidate"
                          >
                            <Mail className="w-3 h-3 text-indigo-500" />
                            <span className="truncate">{cand.email}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Skills badges & Skill Match */}
                  {cand.skills && cand.skills.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {(() => {
                        const mappedJd = jds.find((j) => j.id === cand.jdId);
                        if (!mappedJd || !mappedJd.requiredSkills || mappedJd.requiredSkills.length === 0) return null;
                        const reqSkills = mappedJd.requiredSkills;
                        const candSkillsLower = cand.skills.map((s) => s.toLowerCase());
                        const matched = reqSkills.filter((r) =>
                          candSkillsLower.some((cs) => cs.includes(r.toLowerCase()) || r.toLowerCase().includes(cs))
                        ).length;
                        const percent = Math.round((matched / reqSkills.length) * 100);

                        return (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider">AI Skill Match:</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full ${
                                percent >= 70
                                  ? "bg-emerald-100 text-emerald-800"
                                  : percent >= 40
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {percent}% Match ({matched}/{reqSkills.length})
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap gap-1">
                        {cand.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {cand.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{cand.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interview Scheduled Quick Badge */}
                  {cand.interviewDate && (
                    <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-200 text-[11px] text-blue-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1 text-[10px] text-blue-700 uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        <span>Interview: {cand.interviewRound || "Scheduled"}</span>
                      </div>
                      <div className="font-semibold">
                        📅 {cand.interviewDate} {cand.interviewTime ? `• ⏰ ${cand.interviewTime}` : ""}
                      </div>
                      {cand.interviewLink && (
                        <a
                          href={cand.interviewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline flex items-center gap-1 font-semibold text-[10px] mt-0.5"
                        >
                          <span>Join Meeting Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rating Stars if evaluated */}
                  {Boolean(cand.rating) && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50/70 p-1.5 rounded-md border border-amber-100">
                      <span>Evaluation:</span>
                      <div className="flex text-amber-400">
                        {"★".repeat(cand.rating || 0)}
                        {"☆".repeat(5 - (cand.rating || 0))}
                      </div>
                      <span className="text-slate-500 font-normal">({cand.rating}/5)</span>
                    </div>
                  )}

                  {/* Screening comment note */}
                  {cand.screeningNotes && (
                    <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600 italic line-clamp-2">
                      &ldquo;{cand.screeningNotes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Card Footer: View Details & Contact */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cand.id}
                  </span>
                  <button
                    onClick={() => setSelectedCandidateForDetails(cand)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    View Full Profile &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Add Candidate Modal */}
      {showAddCandidateModal && (
        <CandidateModal
          isOpen={showAddCandidateModal}
          onClose={() => setShowAddCandidateModal(false)}
          onSuccess={() => {
            setShowAddCandidateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Candidate Full Profile View Modal */}
      {selectedCandidateForDetails && (
        <CandidateDetailModal
          candidate={selectedCandidateForDetails}
          onClose={() => setSelectedCandidateForDetails(null)}
          onDelete={handleDeleteCandidate}
          jds={jds}
        />
      )}
    </div>
  );
}
