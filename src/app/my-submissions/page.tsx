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
  Pencil,
  Trash2,
  Star,
  Sparkles,
  Download,
  ExternalLink,
  Video,
  Eye,
  FileText,
} from "lucide-react";
import { Candidate, Recruiter, JobDescription } from "@/types";
import CandidateModal from "@/components/CandidateModal";
import EditCandidateModal from "@/components/EditCandidateModal";

export default function MySubmissionsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>("All");
  const [filterCompany, setFilterCompany] = useState<string>("All");
  const [filterScreeningStatus, setFilterScreeningStatus] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(
    null
  );
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
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
    candidates.forEach((c) => {
      if (c.clientName && c.clientName.trim()) set.add(c.clientName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  // Map JD skills for AI Matching
  const jdSkillsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    jds.forEach((j) => {
      map.set(j.id, (j.requiredSkills || []).map((s) => s.toLowerCase().trim()));
    });
    return map;
  }, [jds]);

  const getMatchScore = (cand: Candidate) => {
    const jdSkills = jdSkillsMap.get(cand.jdId);
    if (!jdSkills || jdSkills.length === 0 || !cand.skills || cand.skills.length === 0) return 0;
    const candSet = new Set(cand.skills.map((s) => s.toLowerCase().trim()));
    const matches = jdSkills.filter((s) => candSet.has(s)).length;
    return Math.round((matches / jdSkills.length) * 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [candRes, jdRes, recRes, meRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/jds"),
        fetch("/api/recruiters"),
        fetch("/api/auth/me"),
      ]);

      const meData = await meRes.json();
      if (!meData.success || !meData.user) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(meData.user);

      const candData = await candRes.json();
      const jdData = await jdRes.json();
      const recData = await recRes.json();

      if (candData.success) setCandidates(candData.data);
      if (jdData.success) setJds(jdData.data);
      if (recData.success) setRecruiters(recData.data);
    } catch (err) {
      console.error("Failed to load submissions", err);
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

  const filteredCandidates = candidates.filter((c) => {
    const matchesCompany =
      filterCompany === "All" ||
      c.clientName?.toLowerCase() === filterCompany.toLowerCase();

    const matchesRecruiter =
      selectedRecruiterId === "All" ||
      c.recruiterId === selectedRecruiterId ||
      c.recruiterName.toLowerCase() === selectedRecruiterId.toLowerCase() ||
      (selectedRecruiterId.toLowerCase().includes("test") && c.recruiterName.toLowerCase().includes("test"));
    const matchesScreeningStatus =
      filterScreeningStatus === "All" ||
      (c.screeningStatus || "Processing").toLowerCase() === filterScreeningStatus.toLowerCase();
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.jdTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCompany && matchesRecruiter && matchesScreeningStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
            Recruiter Workspace
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Recruiter Candidate Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track candidate submission status, AI skill match, interview schedules, and evaluation feedback.
          </p>
        </div>

        <button
          onClick={() => setShowAddCandidateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Map New Candidate</span>
        </button>
      </div>

      {/* Recruiter Selector & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isPortalManager && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Recruiter:
              </label>
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Recruiters ({candidates.length})</option>
                {recruiters.map((rec) => {
                  const count = candidates.filter((c) => c.recruiterId === rec.id).length;
                  return (
                    <option key={rec.id} value={rec.id}>
                      {rec.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Company:
              </label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[170px] truncate"
              >
                <option value="All">All Companies ({companies.length})</option>
                {companies.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Screening:
              </label>
              <select
                value={filterScreeningStatus}
                onChange={(e) => setFilterScreeningStatus(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Screening</option>
                <option value="Processing">⏳ Processing</option>
                <option value="Good">🟢 Good</option>
                <option value="Average">🟡 Average</option>
                <option value="Worst">🔴 Worst</option>
              </select>
            </div>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, role, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Cards List */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading submissions...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No candidate submissions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              No candidate submissions found for the selected filter. Click &ldquo;Map New Candidate&rdquo; to add a candidate.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCandidates.map((cand) => {
              const matchScore = getMatchScore(cand);

              return (
                <div
                  key={cand.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          {cand.id} &bull; Submitted by: {cand.recruiterName}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {cand.fullName}
                        </h3>
                        <div className="text-xs text-slate-500">
                          {cand.currentCompany} ({cand.currentDesignation}) &bull; {cand.experienceYears}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            cand.status === "Offered" || cand.status === "Joined"
                              ? "bg-emerald-100 text-emerald-800"
                              : cand.status === "Interview Scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : cand.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {cand.status}
                        </span>
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
                      </div>
                    </div>

                  {/* Mapped JD Banner & AI Match Score */}
                  <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                        Mapped to Open JD:
                      </span>
                      {matchScore > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 ${
                            matchScore >= 70
                              ? "bg-emerald-100 text-emerald-800"
                              : matchScore >= 40
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{matchScore}% Match</span>
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-indigo-950 mt-0.5">{cand.jdTitle}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Client: <strong>{cand.clientName}</strong> ({cand.jdId})
                    </div>
                  </div>

                  {/* Interview Schedule Box if present */}
                  {(cand.interviewDate || cand.interviewTime || cand.interviewLink) && (
                    <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Interview Scheduled</span>
                        </span>
                        {cand.interviewRound && (
                          <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.2 rounded font-semibold">
                            {cand.interviewRound}
                          </span>
                        )}
                      </div>
                      <div className="text-blue-950 font-medium">
                        {cand.interviewDate || "TBD"} &bull; {cand.interviewTime || "TBD"}
                        {cand.interviewerName && <span> ({cand.interviewerName})</span>}
                      </div>
                      {cand.interviewLink && (
                        <a
                          href={cand.interviewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline mt-0.5"
                        >
                          <Video className="w-3 h-3" />
                          <span>Join Video Interview Meet ↗</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Separate Cells for Compensation */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200">
                      <span className="text-[10px] text-amber-800 font-semibold block">
                        Current CTC
                      </span>
                      <span className="font-bold text-amber-950 text-sm">₹ {cand.currentCtc}</span>
                    </div>
                    <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-semibold block">
                        Expected Budget
                      </span>
                      <span className="font-bold text-emerald-950 text-sm">₹ {cand.expectedBudget}</span>
                    </div>
                  </div>

                  {/* Rating and Skills */}
                  <div className="space-y-1 text-xs">
                    {cand.rating && (
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>Rating: {cand.rating} / 5 Stars</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {cand.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Resume downloads if attached */}
                  {(cand.resumeFileName || cand.resumeLink) && (
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      {cand.resumeFileName && (
                        <a
                          href={`/uploads/resumes/${cand.resumeFileName}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200 transition-colors text-[11px]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Resume ({cand.resumeFileName})</span>
                        </a>
                      )}
                      {cand.resumeLink && (
                        <a
                          href={cand.resumeLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold border border-slate-200 transition-colors text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Web Resume</span>
                        </a>
                      )}
                    </div>
                  )}

                  {cand.screeningNotes && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 italic">
                      &ldquo;{cand.screeningNotes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Action Buttons: View Details, Edit & Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidateForDetails(cand)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Profile</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingCandidate(cand)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                      title="Edit candidate profile"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCandidate(cand.id, cand.fullName)}
                      disabled={deletingCandidateId === cand.id}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                      title="Delete candidate profile"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{deletingCandidateId === cand.id ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Full Details Modal */}
      {selectedCandidateForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Candidate ID: {selectedCandidateForDetails.id}
                </span>
                <h2 className="text-lg font-bold">{selectedCandidateForDetails.fullName}</h2>
              </div>
              <button
                onClick={() => setSelectedCandidateForDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Mapped Open JD details & AI Match Score */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                    Mapped Open JD
                  </span>
                  {(() => {
                    const match = getMatchScore(selectedCandidateForDetails);
                    if (match <= 0) return null;
                    return (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          match >= 70
                            ? "bg-emerald-100 text-emerald-800"
                            : match >= 40
                            ? "bg-amber-100 text-amber-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Match: {match}%</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="text-sm font-bold text-indigo-950">
                  {selectedCandidateForDetails.jdTitle}
                </div>
                <div className="text-slate-600 flex items-center gap-2 flex-wrap">
                  <span>
                    Client: <strong>{selectedCandidateForDetails.clientName}</strong>
                  </span>
                  &bull;
                  <span>
                    JD ID: <span className="font-mono">{selectedCandidateForDetails.jdId}</span>
                  </span>
                </div>
              </div>

              {/* Screening Status Evaluation Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                    Screening Status Evaluation
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        selectedCandidateForDetails.screeningStatus === "Good"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : selectedCandidateForDetails.screeningStatus === "Average"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : selectedCandidateForDetails.screeningStatus === "Worst"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {selectedCandidateForDetails.screeningStatus === "Good"
                        ? "🟢 Good (Recommended)"
                        : selectedCandidateForDetails.screeningStatus === "Average"
                        ? "🟡 Average (Eligible)"
                        : selectedCandidateForDetails.screeningStatus === "Worst"
                        ? "🔴 Worst (Not Recommended)"
                        : "⏳ Processing (In Screening)"}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {selectedCandidateForDetails.screeningStatus === "Good" ||
                      selectedCandidateForDetails.screeningStatus === "Average"
                        ? "✓ Live in Interview Portal (port 3001)"
                        : "⏳ In Screening - Hidden from Interview Portal"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interview Schedule Banner if exists */}
              {(selectedCandidateForDetails.interviewDate ||
                selectedCandidateForDetails.interviewTime ||
                selectedCandidateForDetails.interviewLink) && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-blue-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Scheduled Interview Details</span>
                    </span>
                    {selectedCandidateForDetails.interviewRound && (
                      <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-semibold">
                        {selectedCandidateForDetails.interviewRound}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date & Time:</span>
                      <span className="font-bold text-slate-800">
                        {selectedCandidateForDetails.interviewDate || "TBD"} &bull;{" "}
                        {selectedCandidateForDetails.interviewTime || "TBD"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Interviewer:</span>
                      <span className="font-bold text-slate-800">
                        {selectedCandidateForDetails.interviewerName || "Not assigned"}
                      </span>
                    </div>
                    {selectedCandidateForDetails.interviewLink && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Meeting URL:</span>
                        <a
                          href={selectedCandidateForDetails.interviewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          <Video className="w-3 h-3" />
                          <span>Join Online Meet ↗</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Distinct Compensation Cells */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block font-semibold text-[11px]">
                    Current CTC (LPA / LPM)
                  </span>
                  <span className="text-amber-950 font-bold text-base">
                    ₹ {selectedCandidateForDetails.currentCtc || "N/A"}
                  </span>
                </div>

                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 block font-semibold text-[11px]">
                    Expected Budget (LPA / LPM)
                  </span>
                  <span className="text-emerald-950 font-bold text-base">
                    ₹ {selectedCandidateForDetails.expectedBudget || "N/A"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block font-medium">Recruiter</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedCandidateForDetails.recruiterName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Experience</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedCandidateForDetails.experienceYears}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Notice Period</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedCandidateForDetails.noticePeriodDays}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedCandidateForDetails.location}
                  </span>
                </div>
              </div>

              {/* Rating and Skills */}
              <div className="space-y-2">
                {selectedCandidateForDetails.rating && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs font-semibold text-amber-900">
                      Recruiter Assessment Rating:
                    </span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{selectedCandidateForDetails.rating} / 5 Stars</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block font-medium mb-1">Key Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidateForDetails.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resume / Documents */}
              {(selectedCandidateForDetails.resumeFileName ||
                selectedCandidateForDetails.resumeLink) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-slate-600 block font-semibold text-xs">
                    Candidate Resume & Documents
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidateForDetails.resumeFileName && (
                      <a
                        href={`/uploads/resumes/${selectedCandidateForDetails.resumeFileName}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-2xs text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Attached Resume ({selectedCandidateForDetails.resumeFileName})</span>
                      </a>
                    )}
                    {selectedCandidateForDetails.resumeLink && (
                      <a
                        href={selectedCandidateForDetails.resumeLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-indigo-600 hover:bg-slate-50 font-semibold transition-colors text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Web Portfolio / Resume Link</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-400 block font-medium mb-1">
                  Screening & Recruiter Notes
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                  {selectedCandidateForDetails.screeningNotes || "No notes entered yet."}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = selectedCandidateForDetails;
                    setSelectedCandidateForDetails(null);
                    setEditingCandidate(toEdit);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Candidate</span>
                </button>
                <button
                  onClick={() =>
                    handleDeleteCandidate(
                      selectedCandidateForDetails.id,
                      selectedCandidateForDetails.fullName
                    )
                  }
                  disabled={deletingCandidateId === selectedCandidateForDetails.id}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {deletingCandidateId === selectedCandidateForDetails.id
                      ? "Deleting..."
                      : "Delete Candidate"}
                  </span>
                </button>
              </div>
              <button
                onClick={() => setSelectedCandidateForDetails(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add candidate modal */}
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

      {/* Edit candidate modal */}
      {editingCandidate && (
        <EditCandidateModal
          isOpen={!!editingCandidate}
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSuccess={() => {
            setEditingCandidate(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
