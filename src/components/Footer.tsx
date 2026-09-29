"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Briefcase, ShieldCheck, Database, Users, Sparkles, ExternalLink } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on login/master-login pages for a cleaner look
  if (pathname === "/login" || pathname === "/master-login") {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Logo */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Forcecraver Logo"
                width={130}
                height={36}
                className="h-8 w-auto object-contain"
              />
              <span className="text-lg font-bold text-slate-900">
                Forcecraver <span className="text-indigo-600">Recruiter Portal</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              Unified Recruiter & Candidate Management Platform integrated with Forcecraver Open JD System. Screen candidate profiles, track hiring pipelines, and map talent to active client openings seamlessly.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                <Database className="w-3.5 h-3.5 text-indigo-600" /> PostgreSQL & Neon DB
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                <Users className="w-3.5 h-3.5 text-emerald-600" /> Multi-Recruiter System
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> RBAC Protected
              </span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recruiter Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/" className="hover:text-indigo-600 transition-colors">
                  Candidate Directory
                </Link>
              </li>
              <li>
                <Link href="/my-submissions" className="hover:text-indigo-600 transition-colors">
                  My Pipeline & Submissions
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:3000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>Open JD System</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Administration */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Administration</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/master-login" className="hover:text-indigo-600 transition-colors">
                  Master Recruiter Login
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-indigo-600 transition-colors">
                  Standard Recruiter (OTP) Login
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-indigo-600 transition-colors">
                  Admin Control Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Forcecraver. All rights reserved.</p>
          <p className="font-mono text-[11px] text-slate-400">Forcecraver Recruiter & Open JD System</p>
        </div>
      </div>
    </footer>
  );
}
