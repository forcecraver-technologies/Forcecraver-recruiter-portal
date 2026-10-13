"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import confetti from "canvas-confetti";
import {
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  User,
  Phone,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Tab: 'login' | 'first_time' | 'forgot_password'
  const [activeTab, setActiveTab] = useState<"login" | "first_time" | "forgot_password">("login");

  // Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 1st Time Setup state
  // Step 1: Info (Email, First Name, Last Name, Phone)
  // Step 2: OTP + Password + Confirm Password
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [regEmail, setRegEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password state
  // Step 1: Email -> Step 2: OTP + New Password + Confirm
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Common UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [existingSession, setExistingSession] = useState<any | null>(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setExistingSession(data.user);
        }
      } catch {
        // Not logged in
      }
    };
    checkSession();
  }, []);

  // Smartly auto-populate first and last name from email
  const handleRegEmailChange = (val: string) => {
    setRegEmail(val);
    const clean = val.trim().toLowerCase();
    if (clean.includes("@") && !firstName) {
      const prefix = clean.split("@")[0];
      const parts = prefix.split(/[._-]/);
      if (parts.length >= 1 && parts[0]) {
        setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      }
      if (parts.length >= 2 && parts[1] && !lastName) {
        setLastName(parts[1].charAt(0).toUpperCase() + parts[1].slice(1));
      }
    }
  };

  // ----------------------------------------------------
  // OTP Digits Helpers for 1st Time Setup
  // ----------------------------------------------------
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 1) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = cleanValue[i] || "";
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(cleanValue.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = cleanValue.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;
    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    const nextFocus = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  // ----------------------------------------------------
  // OTP Digits Helpers for Forgot Password
  // ----------------------------------------------------
  const handleForgotOtpDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 1) {
      const newDigits = [...forgotOtpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = cleanValue[i] || "";
      }
      setForgotOtpDigits(newDigits);
      const nextFocus = Math.min(cleanValue.length, 5);
      forgotOtpRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = cleanValue.slice(-1);
    const newDigits = [...forgotOtpDigits];
    newDigits[index] = singleDigit;
    setForgotOtpDigits(newDigits);

    if (singleDigit && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !forgotOtpDigits[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;
    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setForgotOtpDigits(newDigits);
    const nextFocus = Math.min(pastedData.length, 5);
    forgotOtpRefs.current[nextFocus]?.focus();
  };

  // ----------------------------------------------------
  // 1. Regular Sign In (Email + Password)
  // ----------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your work email address.");
      return;
    }

    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsSetup) {
          setError(data.error);
          setRegEmail(cleanEmail);
          handleRegEmailChange(cleanEmail);
          setTimeout(() => {
            setActiveTab("first_time");
          }, 1200);
        } else {
          setError(data.error || "Failed to log in.");
        }
      } else {
        setSuccessMsg("✅ Login successful! Redirecting to portal...");
        setTimeout(() => {
          window.location.href = "/";
        }, 350);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 2. 1st Time Setup: Step 1 (Send OTP)
  // ----------------------------------------------------
  const handleSendSetupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Work Email address is required.");
      return;
    }

    if (!firstName.trim()) {
      setError("First Name is compulsory.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyRegistered) {
          setError(data.error);
          setLoginEmail(cleanEmail);
          setTimeout(() => {
            setActiveTab("login");
          }, 1500);
        } else {
          setError(data.error || "Failed to send setup verification code.");
        }
      } else {
        setSuccessMsg(data.message || `A 6-digit setup code has been sent to ${cleanEmail}`);
        setSetupStep(2);
        setCountdown(60);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      }
    } catch {
      setError("Network error. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. 1st Time Setup: Step 2 (Verify OTP & Set Password)
  // ----------------------------------------------------
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const otpCode = otpDigits.join("").trim();
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!regPassword) {
      setError("Please create a password.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== confirmPassword) {
      setError("Password and Re-entered Password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim().toLowerCase(),
          otp: otpCode,
          password: regPassword,
          confirmPassword: confirmPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to verify code or set password.");
      } else {
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}

        setSuccessMsg("🎉 Account activated and password set successfully! Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 600);
      }
    } catch {
      setError("Network error during verification.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 4. Forgot Password: Step 1 (Send Reset OTP)
  // ----------------------------------------------------
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send password reset code.");
      } else {
        setSuccessMsg(data.message || `Password reset code sent to ${cleanEmail}`);
        setForgotStep(2);
        setCountdown(60);
        setTimeout(() => {
          forgotOtpRefs.current[0]?.focus();
        }, 150);
      }
    } catch {
      setError("Network error while sending reset code.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 5. Forgot Password: Step 2 (Verify OTP & Reset Password)
  // ----------------------------------------------------
  const handleForgotVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const otpCode = forgotOtpDigits.join("").trim();
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit reset code.");
      return;
    }

    if (!forgotPassword) {
      setError("Please create a new password.");
      return;
    }

    if (forgotPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (forgotPassword !== forgotConfirmPassword) {
      setError("New Password and Re-entered Password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/verify-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: otpCode,
          password: forgotPassword,
          confirmPassword: forgotConfirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } catch {}

        setLoginEmail(forgotEmail.trim().toLowerCase());
        setLoginPassword("");
        setActiveTab("login");
        setSuccessMsg(data.message || "Password reset successfully! You can now sign in.");
      }
    } catch {
      setError("Network error during password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-indigo-600 selection:text-white">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-100/60 blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
            <Image
              src="/logo.png"
              alt="Forcecraver Logo"
              width={150}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Forcecraver Recruiter Portal
            </h1>
            <p className="mt-1 text-xs font-bold tracking-wider text-indigo-600 uppercase">
              Talent Acquisition & Candidate Management Hub
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 relative space-y-5">
          {/* Active session banner if user is already logged in */}
          {existingSession && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-slate-500 text-[10px] font-medium">Currently active session:</div>
                  <div className="font-bold text-indigo-950 text-xs">
                    {existingSession.name}{" "}
                    <span className="font-normal text-indigo-700">({existingSession.email})</span>
                  </div>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-indigo-200/60 text-indigo-800 rounded font-semibold text-[10px]">
                    {existingSession.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/";
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Go to Portal ➔
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      setExistingSession(null);
                      setLoginEmail("");
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs hover:bg-red-50 hover:text-red-700 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Master Recruiter Login Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 transition-colors hover:border-indigo-200 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-indigo-100/80 text-indigo-700 rounded-lg shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">Master Recruiter / Admin Access</div>
                <div className="text-[11px] text-slate-500 truncate">Dedicated admin sign-in for portal settings</div>
              </div>
            </div>
            <Link
              href="/master-login"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-sm inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Master Login</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Form Tabs: Sign In vs 1st Time Setup */}
          {activeTab !== "forgot_password" ? (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("first_time");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "first_time"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1st Time Setup
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Forgot Password</h2>
                  <p className="text-[10px] text-slate-400">
                    {forgotStep === 1 ? "Enter work email to receive OTP" : "Verify OTP & set new password"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: REGULAR SIGN IN (Email + Password)               */}
          {/* ======================================================== */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@forcecraver.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("forgot_password");
                      setForgotStep(1);
                      setForgotEmail(loginEmail);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-[11px] text-slate-500">
                  First time here? Switch to{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("first_time");
                      setRegEmail(loginEmail);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    1st Time Setup
                  </button>{" "}
                  to activate via OTP.
                </p>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 1ST TIME SETUP (One-Time OTP & Password Setup)   */}
          {/* ======================================================== */}
          {activeTab === "first_time" && (
            <>
              {setupStep === 1 && (
                <form onSubmit={handleSendSetupOtp} className="space-y-4">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                    <span>
                      <strong>One-Time Recruiter Activation:</strong> Enter your work email below. We'll send a 6-digit verification code to set your permanent login password.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Work Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => handleRegEmailChange(e.target.value)}
                        placeholder="name@forcecraver.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile / Contact Number (Optional)
                    </label>
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
                      <span className="inline-flex items-center px-3 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone.replace(/^\+91\s*/, "")}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setPhone(digits ? `+91 ${digits}` : "");
                        }}
                        placeholder="98765 43210"
                        className="w-full px-3 py-2 text-xs text-slate-900 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code (OTP)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {setupStep === 2 && (
                <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSetupStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Info</span>
                    </button>
                    <span className="text-[11px] font-medium text-slate-500">{regEmail}</span>
                  </div>

                  {/* 6 OTP Boxes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                      Enter 6-Digit Verification Code
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {otpDigits.map((val, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={val}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-10 h-12 text-center text-lg font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Set Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.some((v) => !v)}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Account & Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    {countdown > 0 ? (
                      <span className="text-xs text-slate-400">
                        Resend code in <strong className="text-slate-600">{countdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendSetupOtp()}
                        className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Verification Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FORGOT PASSWORD FLOW                              */}
          {/* ======================================================== */}
          {activeTab === "forgot_password" && (
            <>
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Work Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@forcecraver.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Reset Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyAndReset} className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Email</span>
                    </button>
                    <span className="text-[11px] font-medium text-slate-500">{forgotEmail}</span>
                  </div>

                  {/* 6 OTP Boxes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                      Enter 6-Digit Password Reset Code
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {forgotOtpDigits.map((val, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            forgotOtpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={val}
                          onChange={(e) => handleForgotOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                          onPaste={handleForgotOtpPaste}
                          className="w-10 h-12 text-center text-lg font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showForgotPassword ? "text" : "password"}
                        required
                        value={forgotPassword}
                        onChange={(e) => setForgotPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showForgotConfirmPassword ? "text" : "password"}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || forgotOtpDigits.some((v) => !v)}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password & Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    {countdown > 0 ? (
                      <span className="text-xs text-slate-400">
                        Resend code in <strong className="text-slate-600">{countdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleForgotSendOtp(new Event("submit") as any)}
                        className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
