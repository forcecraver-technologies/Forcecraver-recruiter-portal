"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Briefcase, Plus } from "lucide-react";
import { JobDescription } from "@/types";

interface JDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: JobDescription | null;
}

export default function JDModal({ isOpen, onClose, onSuccess, initialData }: JDModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    client: initialData?.client || "",
    department: initialData?.department || "Engineering",
    location: initialData?.location || "Bengaluru",
    workMode: initialData?.workMode || "Hybrid",
    experienceRequired: initialData?.experienceRequired || "3 - 6 Years",
    budget: initialData?.budget || "20 - 30 LPA",
    openings: initialData?.openings || 2,
    status: initialData?.status || "Open",
    requiredSkills: initialData?.requiredSkills?.join(", ") || "",
    description: initialData?.description || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        client: initialData.client || "",
        department: initialData.department || "Engineering",
        location: initialData.location || "Bengaluru",
        workMode: initialData.workMode || "Hybrid",
        experienceRequired: initialData.experienceRequired || "3 - 6 Years",
        budget: initialData.budget || "20 - 30 LPA",
        openings: initialData.openings || 2,
        status: initialData.status || "Open",
        requiredSkills: Array.isArray(initialData.requiredSkills)
          ? initialData.requiredSkills.join(", ")
          : (initialData.requiredSkills || ""),
        description: initialData.description || "",
      });
    } else {
      setFormData({
        title: "",
        client: "",
        department: "Engineering",
        location: "Bengaluru",
        workMode: "Hybrid",
        experienceRequired: "3 - 6 Years",
        budget: "20 - 30 LPA",
        openings: 2,
        status: "Open",
        requiredSkills: "",
        description: "",
      });
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isEdit = !!initialData?.id;
      const url = "/api/jds";
      const method = isEdit ? "PATCH" : "POST";
      const skillsArray = formData.requiredSkills
        ? formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const body = isEdit
        ? { ...formData, requiredSkills: skillsArray, id: initialData.id }
        : { ...formData, requiredSkills: skillsArray };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save Job Description");
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30">
              <Briefcase className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? "Edit Open Job Description" : "Create New Open JD"}
              </h2>
              <p className="text-xs text-slate-300">
                This JD will be added to the live Open JDs dataset for all recruiters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Fullstack Engineer"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client / Hiring Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PayPulse Fintech / UrbanFleet"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                placeholder="Engineering / Data / Product"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="Bengaluru / Mumbai / Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Mode
              </label>
              <select
                value={formData.workMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    workMode: e.target.value as "Remote" | "Hybrid" | "Onsite",
                  })
                }
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Experience Required
              </label>
              <input
                type="text"
                placeholder="e.g. 4 - 7 Years"
                value={formData.experienceRequired}
                onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Budget / CTC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 25 - 35 LPA"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Openings
              </label>
              <input
                type="number"
                min={1}
                value={formData.openings}
                onChange={(e) => setFormData({ ...formData, openings: Number(e.target.value) })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "Open" | "In Progress" | "Closed",
                  })
                }
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Skills (Comma separated)
              </label>
              <input
                type="text"
                placeholder="React, TypeScript, AWS, Next.js"
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description / Responsibilities
            </label>
            <textarea
              rows={3}
              placeholder="Outline responsibilities, key project expectations, and tech stack details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving JD...</span>
                </>
              ) : (
                <>
                  {initialData ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{initialData ? "Update Open JD" : "Publish Open JD"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
