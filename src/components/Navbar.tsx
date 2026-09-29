"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Briefcase, UserCheck, Shield, Users, PlusCircle, LogOut, LogIn, ExternalLink, Menu, X } from "lucide-react";
import CandidateModal from "./CandidateModal";

export default function Navbar() {
  const pathname = usePathname();
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const isMaster =
    user?.email?.toLowerCase() !== "test@forcecraver.com" &&
    (user?.email?.toLowerCase() === "sarthak@forcecraver.com" ||
      user?.email?.toLowerCase() === "admin@forcecraver.com" ||
      user?.role === "DEVELOPER" ||
      user?.role === "ADMIN" ||
      Boolean(user?.isDeveloper));

  const navLinks = [
    {
      name: "Candidate Directory",
      href: "/",
      icon: Users,
    },
    {
      name: "My Pipeline",
      href: "/my-submissions",
      icon: UserCheck,
    },
    ...(isMaster
      ? [
          {
            name: "Admin Master",
            href: "/admin",
            icon: Shield,
            badge: "Admin",
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Forcecraver Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Forcecraver Logo"
                width={130}
                height={36}
                className="h-8 sm:h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
                priority
              />
              <div className="hidden sm:block">
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-tight">
                  Forcecraver <span className="text-indigo-600 font-semibold">Portal</span>
                </span>
                <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                  Recruiter & Candidate System
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="ml-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Actions & User Profile */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Candidate</span>
                <span className="sm:hidden">Add</span>
              </button>

              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      {user.role}
                    </span>
                  </div>
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-xs"
                    title={`${user.name} (${user.email})`}
                  >
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout from session"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Recruiter Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden border-t border-slate-100 bg-slate-50/70 px-4 py-2 flex justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-1 text-xs font-medium ${
                  isActive ? "text-indigo-600 font-semibold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{link.name.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Global Add Candidate Modal */}
      {showAddCandidateModal && (
        <CandidateModal
          isOpen={showAddCandidateModal}
          onClose={() => setShowAddCandidateModal(false)}
          onSuccess={() => {
            setShowAddCandidateModal(false);
            window.dispatchEvent(new CustomEvent("refresh-data"));
          }}
        />
      )}
    </>
  );
}
