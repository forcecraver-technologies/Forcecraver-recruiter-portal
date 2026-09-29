"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Briefcase,
  UserCheck,
  TrendingUp,
  Download,
  Filter,
  Search,
  PlusCircle,
  Clock,
  IndianRupee,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Building,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Star,
  Sparkles,
  FileText,
  CheckSquare,
  Square,
  Video,
} from "lucide-react";
import { Candidate, JobDescription, Recruiter, DashboardStats, CandidateStatus, ScreeningStatus } from "@/types";
import CandidateModal from "@/components/CandidateModal";
import JDModal from "@/components/JDModal";
import EditCandidateModal from "@/components/EditCandidateModal";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"candidates" | "jds" | "recruiters">("candidates");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [selectedCandIds, setSelectedCandIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<CandidateStatus>("Interview Scheduled");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("All");
  const [filterJd, setFilterJd] = useState("All");
  const [filterRecruiter, setFilterRecruiter] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterScreeningStatus, setFilterScreeningStatus] = useState("All");
  const [screeningUpdatingId, setScreeningUpdatingId] = useState<string | null>(null);

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

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showAddJDModal, setShowAddJDModal] = useState(false);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(
    null
  );

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [deletingJdId, setDeletingJdId] = useState<string | null>(null);

  const handleDeleteJD = async (jdId: string, jdTitle: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Open JD "${jdTitle}" (${jdId})? It will be permanently removed from the portal.`
    );
    if (!confirmDelete) return;

    setDeletingJdId(jdId);
    try {
      const res = await fetch(`/api/jds?id=${encodeURIComponent(jdId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setJds((prev) => prev.filter((j) => j.id !== jdId));
        // Refresh stats
        fetch("/api/stats")
          .then((r) => r.json())
          .then((d) => d.success && setStats(d.data));
      } else {
        alert(data.error || "Failed to delete JD");
      }
    } catch (err) {
      console.error("Failed to delete JD", err);
      alert("Error deleting JD. Please try again.");
    } finally {
      setDeletingJdId(null);
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedCandIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const promises = selectedCandIds.map((id) =>
        fetch("/api/candidates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: bulkStatus }),
        })
      );
      await Promise.all(promises);
      setCandidates((prev) =>
        prev.map((c) => (selectedCandIds.includes(c.id) ? { ...c, status: bulkStatus } : c))
      );
      setSelectedCandIds([]);
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d) => d.success && setStats(d.data));
    } catch (err) {
      console.error("Bulk status update error", err);
      alert("Error updating some candidates");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCandIds.length === 0) return;
    const confirmBulk = window.confirm(
      `Are you sure you want to permanently delete these ${selectedCandIds.length} candidate profiles?`
    );
    if (!confirmBulk) return;

    setIsBulkDeleting(true);
    try {
      const promises = selectedCandIds.map((id) =>
        fetch(`/api/candidates?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        })
      );
      await Promise.all(promises);
      setCandidates((prev) => prev.filter((c) => !selectedCandIds.includes(c.id)));
      setSelectedCandIds([]);
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d) => d.success && setStats(d.data));
    } catch (err) {
      console.error("Bulk delete error", err);
      alert("Error deleting some candidates");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [candRes, jdRes, recRes, statsRes, meRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch("/api/jds"),
        fetch("/api/recruiters"),
        fetch("/api/stats"),
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
      const statsData = await statsRes.json();

      if (candData.success) setCandidates(candData.data);
      if (jdData.success) setJds(jdData.data);
      if (recData.success) setRecruiters(recData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error("Failed to load admin data", err);
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

  // Inline status updater for candidates
  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    setStatusUpdatingId(candidateId);
    try {
      const res = await fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidateId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
        );
        // Refresh stats
        fetch("/api/stats")
          .then((r) => r.json())
          .then((d) => d.success && setStats(d.data));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Inline screening status updater for candidates
  const handleScreeningStatusChange = async (
    candidateId: string,
    newScreeningStatus: ScreeningStatus
  ) => {
    setScreeningUpdatingId(candidateId);
    try {
      const res = await fetch("/api/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidateId, screeningStatus: newScreeningStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, screeningStatus: newScreeningStatus } : c
          )
        );
        if (selectedCandidateForDetails?.id === candidateId) {
          setSelectedCandidateForDetails((prev) =>
            prev ? { ...prev, screeningStatus: newScreeningStatus } : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to update screening status", err);
    } finally {
      setScreeningUpdatingId(null);
    }
  };

  // Toggle JD Status (Open / Closed)
  const handleToggleJDStatus = async (jd: JobDescription) => {
    const nextStatus = jd.status === "Open" ? "Closed" : "Open";
    try {
      const res = await fetch("/api/jds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jd.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setJds((prev) => prev.map((j) => (j.id === jd.id ? { ...j, status: nextStatus } : j)));
      }
    } catch (err) {
      console.error("Failed to toggle JD status", err);
    }
  };

  // Delete candidate with user confirmation
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
        // Refresh stats
        fetch("/api/stats")
          .then((r) => r.json())
          .then((d) => d.success && setStats(d.data));
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

  // Export to CSV with separate Current CTC & Expected Budget columns and Screening Status
  const handleExportCSV = () => {
    const headers = [
      "Candidate ID",
      "Full Name",
      "Email",
      "Phone",
      "Current Company",
      "Designation",
      "Experience",
      "Current CTC (LPA / LPM)", // Separate Column
      "Expected Budget (LPA / LPM)", // Separate Column
      "Notice Period",
      "Location",
      "Primary Skills",
      "Screening Status", // Processing / Good / Average / Worst
      "Mapped Open JD ID",
      "Job Title",
      "Client",
      "Recruiter Name",
      "Pipeline Status",
      "Screening Notes",
      "Submitted At",
    ];

    const rows = filteredCandidates.map((c) => [
      c.id,
      `"${c.fullName}"`,
      c.email,
      `"${c.phone}"`,
      `"${c.currentCompany}"`,
      `"${c.currentDesignation}"`,
      `"${c.experienceYears}"`,
      `"${c.currentCtc}"`, // Separate Cell
      `"${c.expectedBudget}"`, // Separate Cell
      `"${c.noticePeriodDays}"`,
      `"${c.location}"`,
      `"${c.skills.join(", ")}"`,
      c.screeningStatus || "Processing",
      c.jdId,
      `"${c.jdTitle}"`,
      `"${c.clientName}"`,
      `"${c.recruiterName}"`,
      c.status,
      `"${c.screeningNotes.replace(/"/g, '""')}"`,
      c.submittedAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Recruiter_Candidate_Tracker_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Candidate filtering
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.currentCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.jdTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.recruiterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCompany =
      filterCompany === "All" ||
      c.clientName?.toLowerCase() === filterCompany.toLowerCase();

    const matchesJd = filterJd === "All" || c.jdId === filterJd;
    const matchesRecruiter =
      filterRecruiter === "All" ||
      c.recruiterId === filterRecruiter ||
      c.recruiterName.toLowerCase() === filterRecruiter.toLowerCase() ||
      (filterRecruiter.toLowerCase().includes("test") && c.recruiterName.toLowerCase().includes("test"));
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    const matchesScreeningStatus =
      filterScreeningStatus === "All" ||
      (c.screeningStatus || "Processing").toLowerCase() === filterScreeningStatus.toLowerCase();

    return matchesSearch && matchesCompany && matchesJd && matchesRecruiter && matchesStatus && matchesScreeningStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              {isPortalManager
                ? "Admin Control Center"
                : "Recruiter Control Center"}
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Logged in: <strong>{currentUser?.name}</strong> ({currentUser?.role || "Recruiter"})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Recruiter & Open JD Master Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage candidate submissions, Open JDs inventory, and pipeline progress across all recruiters in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddJDModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <Briefcase className="w-4 h-4 text-slate-600" />
            <span>Create Open JD</span>
          </button>
          <button
            onClick={() => setShowAddCandidateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Candidate to JD</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Open JDs</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.totalOpenJDs ?? jds.filter((j) => j.status === "Open").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Available for mapping</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Profiles</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.totalSubmissions ?? candidates.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Mapped to open JDs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Recruiters</span>
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.activeRecruiters ?? recruiters.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Contributing talent pool</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Pipeline</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.inPipeline ?? 0}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Screening & Interview</div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Offered / Joined</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {(stats?.offeredCount ?? 0) + (stats?.joinedCount ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Conversions achieved</div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`pb-3 relative transition-all ${
            activeTab === "candidates"
              ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Master Candidate Tracker ({candidates.length})
        </button>

        <button
          onClick={() => setActiveTab("jds")}
          className={`pb-3 relative transition-all ${
            activeTab === "jds"
              ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Open JDs Management ({jds.length})
        </button>

        {isPortalManager && (
          <button
            onClick={() => setActiveTab("recruiters")}
            className={`pb-3 relative transition-all ${
              activeTab === "recruiters"
                ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Recruiter Performance & Team ({recruiters.length})
          </button>
        )}
      </div>

      {/* TAB 1: MASTER CANDIDATE TRACKER */}
      {activeTab === "candidates" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidate name, email, phone, company, recruiter, or skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                  title="Download full candidate list in Excel / CSV format with Current CTC and Expected Budget separate cells"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to Excel / CSV</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Filter by Company */}
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate"
              >
                <option value="All">All Companies ({companies.length})</option>
                {companies.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>

              {/* Filter by Open JD */}
              <select
                value={filterJd}
                onChange={(e) => setFilterJd(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px] truncate"
              >
                <option value="All">All Open JDs</option>
                {jds.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.id}: {j.title}
                  </option>
                ))}
              </select>

              {/* Filter by Recruiter (Portal Manager Only) */}
              {isPortalManager && (
                <select
                  value={filterRecruiter}
                  onChange={(e) => setFilterRecruiter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">All Recruiters</option>
                  {recruiters.map((r) => (
                    <option key={r.id} value={r.id}>
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
                <option value="Processing">⏳ Processing (In Screening)</option>
                <option value="Good">🟢 Good (Live on Interview Portal)</option>
                <option value="Average">🟡 Average (Live on Interview Portal)</option>
                <option value="Worst">🔴 Worst (Excluded)</option>
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

              {(filterCompany !== "All" || filterJd !== "All" || filterRecruiter !== "All" || filterStatus !== "All" || filterScreeningStatus !== "All" || searchTerm) && (
                <button
                  onClick={() => {
                    setFilterCompany("All");
                    setFilterJd("All");
                    setFilterRecruiter("All");
                    setFilterStatus("All");
                    setFilterScreeningStatus("All");
                    setSearchTerm("");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline ml-auto"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedCandIds.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-950 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                  {selectedCandIds.length} candidate(s) selected
                </span>
                <button
                  onClick={() => setSelectedCandIds([])}
                  className="text-xs text-indigo-700 hover:text-indigo-900 underline font-semibold"
                >
                  Deselect all
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold">Change Status:</span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as CandidateStatus)}
                    className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Screening">Screening</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Offered">Offered</option>
                    <option value="Joined">Joined</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button
                    onClick={handleBulkStatusUpdate}
                    disabled={isBulkUpdating}
                    className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isBulkUpdating ? "Updating..." : "Apply Status"}
                  </button>
                </div>

                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-semibold rounded-lg hover:bg-rose-100 transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isBulkDeleting ? "Deleting..." : "Delete Selected"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Master Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.length > 0 &&
                          selectedCandIds.length === filteredCandidates.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCandIds(filteredCandidates.map((c) => c.id));
                          } else {
                            setSelectedCandIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select / Deselect all visible candidates"
                      />
                    </th>
                    <th className="py-3 px-3">Candidate & Contact</th>
                    <th className="py-3 px-3">Mapped Open JD & Match</th>
                    <th className="py-3 px-3">Recruiter</th>
                    {/* Separate Cells for Current CTC and Expected Budget */}
                    <th className="py-3 px-3 bg-amber-50/60 text-amber-900 border-x border-amber-100">
                      Current CTC
                    </th>
                    <th className="py-3 px-3 bg-emerald-50/60 text-emerald-900 border-r border-emerald-100">
                      Expected Budget
                    </th>
                    <th className="py-3 px-3">Exp / Notice</th>
                    <th className="py-3 px-3">Skills & Rating</th>
                    <th className="py-3 px-3 bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                      Screening Status
                    </th>
                    <th className="py-3 px-3">Pipeline Status & Schedule</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading Candidate records...
                      </td>
                    </tr>
                  ) : filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No candidates match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand) => {
                      const matchScore = getMatchScore(cand);
                      const isSelected = selectedCandIds.includes(cand.id);

                      return (
                        <tr
                          key={cand.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? "bg-indigo-50/40" : ""
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectCandidate(cand.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Candidate Name & Contact */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{cand.fullName}</span>
                              {cand.resumeFileName && (
                                <a
                                  href={`/uploads/resumes/${cand.resumeFileName}`}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                  title="Download Attached Resume File"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {cand.email} &bull; {cand.phone}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {cand.currentCompany} ({cand.currentDesignation})
                            </div>
                          </td>

                          {/* Mapped Open JD & Match */}
                          <td className="py-3 px-3 max-w-[180px]">
                            <div className="font-semibold text-indigo-700 truncate">
                              {cand.jdTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{cand.clientName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                {cand.jdId}
                              </span>
                              {matchScore > 0 && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 ${
                                    matchScore >= 70
                                      ? "bg-emerald-100 text-emerald-800"
                                      : matchScore >= 40
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                  title="AI Skill Match with Mapped Open JD"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{matchScore}% Match</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Recruiter Name */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              {cand.recruiterName}
                            </span>
                          </td>

                          {/* SEPARATE CELL: Current CTC */}
                          <td className="py-3 px-3 font-semibold text-amber-900 bg-amber-50/30 border-x border-amber-100 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>₹</span>
                              <span>{cand.currentCtc || "N/A"}</span>
                            </div>
                            <span className="text-[10px] text-amber-700/70 font-normal">
                              Present CTC
                            </span>
                          </td>

                          {/* SEPARATE CELL: Expected Budget */}
                          <td className="py-3 px-3 font-bold text-emerald-900 bg-emerald-50/30 border-r border-emerald-100 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>₹</span>
                              <span>{cand.expectedBudget || "N/A"}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700/70 font-normal">
                              Expected Budget
                            </span>
                          </td>

                          {/* Exp / Notice */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-700">{cand.experienceYears}</div>
                            <div className="text-[11px] text-slate-500">
                              {cand.noticePeriodDays}
                            </div>
                          </td>

                          {/* Skills & Rating */}
                          <td className="py-3 px-3 max-w-[160px]">
                            <div className="flex flex-wrap gap-1">
                              {cand.skills.slice(0, 2).map((s, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]"
                                >
                                  {s}
                                </span>
                              ))}
                              {cand.skills.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{cand.skills.length - 2}
                                </span>
                              )}
                            </div>
                            {cand.rating && (
                              <div className="flex items-center gap-0.5 mt-1 text-amber-500 font-bold text-[11px]">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{cand.rating} / 5</span>
                              </div>
                            )}
                          </td>

                          {/* Screening Status Cell */}
                          <td className="py-3 px-3 whitespace-nowrap bg-indigo-50/20 border-x border-indigo-100">
                            <select
                              value={cand.screeningStatus || "Processing"}
                              disabled={screeningUpdatingId === cand.id}
                              onChange={(e) =>
                                handleScreeningStatusChange(cand.id, e.target.value as ScreeningStatus)
                              }
                              className={`text-xs font-bold px-2.5 py-1 rounded-md border focus:outline-none cursor-pointer shadow-2xs ${
                                cand.screeningStatus === "Good"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : cand.screeningStatus === "Average"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : cand.screeningStatus === "Worst"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : "bg-blue-50 text-blue-800 border-blue-300"
                              }`}
                            >
                              <option value="Processing">⏳ Processing</option>
                              <option value="Good">🟢 Good</option>
                              <option value="Average">🟡 Average</option>
                              <option value="Worst">🔴 Worst</option>
                            </select>
                            <div className="mt-1">
                              {cand.screeningStatus === "Good" || cand.screeningStatus === "Average" ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Visible in Interview Schedule System">
                                  ✓ Live in Portal 3001
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="Screening in progress / Excluded from Portal 3001">
                                  ⏳ In Screening Only
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status & Schedule */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={cand.status}
                              disabled={statusUpdatingId === cand.id}
                              onChange={(e) =>
                                handleStatusChange(cand.id, e.target.value as CandidateStatus)
                              }
                              className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none ${
                                cand.status === "Offered" || cand.status === "Joined"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : cand.status === "Interview Scheduled"
                                  ? "bg-blue-50 text-blue-800 border-blue-300"
                                  : cand.status === "Rejected"
                                  ? "bg-red-50 text-red-800 border-red-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              <option value="Submitted">Submitted</option>
                              <option value="Screening">Screening</option>
                              <option value="Interview Scheduled">Interview Scheduled</option>
                              <option value="Offered">Offered</option>
                              <option value="Joined">Joined</option>
                              <option value="Rejected">Rejected</option>
                            </select>

                            {(cand.interviewDate || cand.interviewTime) && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                <Calendar className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                <span>
                                  {cand.interviewDate}{" "}
                                  {cand.interviewTime ? `• ${cand.interviewTime}` : ""}
                                </span>
                                {cand.interviewRound && (
                                  <span className="bg-blue-200/60 px-1 rounded text-[9px]">
                                    {cand.interviewRound}
                                  </span>
                                )}
                                {cand.interviewLink && (
                                  <a
                                    href={cand.interviewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-700 underline font-bold ml-0.5"
                                    title="Join Interview"
                                  >
                                    Meet ↗
                                  </a>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedCandidateForDetails(cand)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => setEditingCandidate(cand)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                                title="Edit candidate profile"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCandidate(cand.id, cand.fullName)}
                                disabled={deletingCandidateId === cand.id}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                title="Delete candidate profile"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>
                                  {deletingCandidateId === cand.id ? "Deleting..." : "Delete"}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </span>
              <span className="text-[11px] text-slate-400">
                Notice: Current CTC and Expected Budget are tracked in distinct cells for accurate
                budget analysis.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPEN JDS MANAGEMENT */}
      {activeTab === "jds" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Open Job Descriptions Dataset</h2>
              <p className="text-xs text-slate-500">
                These JDs appear live in the recruiter submission dropdown.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingJd(null);
                setShowAddJDModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Open JD</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">JD ID & Role</th>
                    <th className="py-3 px-3">Client / Hiring Company</th>
                    <th className="py-3 px-3">Posted By</th>
                    <th className="py-3 px-3">Location & Mode</th>
                    <th className="py-3 px-3">Experience</th>
                    <th className="py-3 px-3">Offered Budget</th>
                    <th className="py-3 px-3">Openings / Filled</th>
                    <th className="py-3 px-3">Candidates Mapped</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jds.map((jd) => {
                    const mappedCount = candidates.filter((c) => c.jdId === jd.id).length;
                    return (
                      <tr key={jd.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {jd.id}
                          </span>
                          <div className="font-bold text-slate-900 mt-1">{jd.title}</div>
                          <div className="text-[11px] text-slate-400">{jd.department}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{jd.client}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {jd.createdBy || "Lead Admin"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {jd.location} ({jd.workMode})
                        </td>
                        <td className="py-3 px-3 text-slate-700">{jd.experienceRequired}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{jd.budget}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{jd.openings}</span> Openings
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-indigo-700">{mappedCount}</span> profiles
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleJDStatus(jd)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                              jd.status === "Open"
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                            title="Click to toggle Open / Closed"
                          >
                            {jd.status}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingJd(jd);
                                setShowAddJDModal(true);
                              }}
                              className="text-xs text-indigo-600 hover:underline font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteJD(jd.id, jd.title)}
                              disabled={deletingJdId === jd.id}
                              className="text-xs text-rose-600 hover:underline font-semibold disabled:opacity-50"
                            >
                              {deletingJdId === jd.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECRUITER PERFORMANCE & TEAM */}
      {activeTab === "recruiters" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recruiter Team Performance</h2>
              <p className="text-xs text-slate-500">
                Track candidate pipeline contribution for each recruiter.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recruiters.map((rec) => {
              const recCandidates = candidates.filter((c) => c.recruiterId === rec.id);
              const placed = recCandidates.filter(
                (c) => c.status === "Offered" || c.status === "Joined"
              ).length;
              const inProgress = recCandidates.filter(
                (c) => c.status === "Submitted" || c.status === "Screening" || c.status === "Interview Scheduled"
              ).length;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {rec.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rec.name}</h3>
                    <p className="text-xs text-indigo-600 font-medium">{rec.role}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px]">Submitted</span>
                      <span className="font-bold text-slate-900">{recCandidates.length}</span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <span className="text-amber-600 block text-[10px]">In Pipeline</span>
                      <span className="font-bold text-amber-800">{inProgress}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <span className="text-emerald-600 block text-[10px]">Placed</span>
                      <span className="font-bold text-emerald-800">{placed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                    Candidate Screening Evaluation
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
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
                        : "⏳ Processing (Screening in Progress)"}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {selectedCandidateForDetails.screeningStatus === "Good" ||
                      selectedCandidateForDetails.screeningStatus === "Average"
                        ? "✓ Live in Interview Portal (port 3001)"
                        : "⏳ In Screening - Hidden from Interview Portal"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-xs font-medium">Status:</span>
                  <select
                    value={selectedCandidateForDetails.screeningStatus || "Processing"}
                    onChange={(e) =>
                      handleScreeningStatusChange(
                        selectedCandidateForDetails.id,
                        e.target.value as ScreeningStatus
                      )
                    }
                    className="text-xs font-bold rounded-lg border border-slate-300 px-2.5 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    <option value="Processing">⏳ Processing</option>
                    <option value="Good">🟢 Good</option>
                    <option value="Average">🟡 Average</option>
                    <option value="Worst">🔴 Worst</option>
                  </select>
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

              {/* Resume / Portfolio Link & Uploaded File */}
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

      {/* Edit Candidate Modal */}
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

      {/* Add Candidate Modal */}
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

      {/* Add / Edit Open JD Modal */}
      {showAddJDModal && (
        <JDModal
          isOpen={showAddJDModal}
          initialData={editingJd}
          onClose={() => {
            setShowAddJDModal(false);
            setEditingJd(null);
          }}
          onSuccess={() => {
            setShowAddJDModal(false);
            setEditingJd(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
