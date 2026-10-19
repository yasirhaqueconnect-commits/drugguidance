"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

export default function PharmacistForgotPasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Mode: "reset_password" | "forgot_email"
  const [activeTab, setActiveTab] = useState<"reset_password" | "forgot_email">("reset_password");

  // Step for reset password: 1 = enter email, 2 = enter OTP and new password
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Reset Password form state
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Email form state
  const [phone, setPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered pharmacist email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendPasswordResetOtp({
        email: cleanEmail,
        role: "pharmacist",
      });
      setSuccessMsg(res.message || "A 6-digit verification code has been dispatched to your email.");
      setResetStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError(null);
    setResending(true);
    try {
      const res = await api.sendPasswordResetOtp({
        email: email.trim().toLowerCase(),
        role: "pharmacist",
      });
      setSuccessMsg("A new verification code has been dispatched to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Verify OTP and Reset Password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyAndResetPassword({
        email: email.trim().toLowerCase(),
        role: "pharmacist",
        otp_code: cleanOtp,
        new_password: newPassword,
      });

      setSuccessMsg(res.message || "Password successfully reset! Redirecting to login...");
      setTimeout(() => {
        router.push(`/pharmacist/login?reset=true&email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check the OTP and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Find Email using Phone Number
  const handleFindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setFoundEmail(null);
    setFoundName(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setError("Please enter a valid registered phone number (at least 7 digits).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotEmailFind({
        phone: cleanPhone,
        role: "pharmacist",
      });
      setFoundEmail(res.email);
      setFoundName(res.full_name);
      setSuccessMsg("Pharmacist account located! Your registered email address is shown below.");
    } catch (err: any) {
      setError(err.message || "No registered pharmacist account found matching this phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (foundEmail) {
      navigator.clipboard.writeText(foundEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseEmailToReset = () => {
    if (foundEmail) {
      setEmail(foundEmail);
      setActiveTab("reset_password");
      setResetStep(1);
      setError(null);
      setSuccessMsg(null);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}
    >
      <div className="max-w-md w-full">
        {/* Back Link */}
        <Link
          href="/pharmacist/login"
          className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            isLight
              ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <div
          className={`rounded-2xl p-8 shadow-2xl border transition-colors ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "glass-panel border-slate-800 text-white"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 p-2 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Pharmacist Recovery</h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Recover credentials for clinical practitioner portal
              </p>
            </div>
          </div>

          {/* Recovery Method Tabs */}
          <div className={`grid grid-cols-2 p-1 rounded-xl mb-6 ${isLight ? "bg-slate-100" : "bg-slate-900"}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("reset_password");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "reset_password"
                  ? isLight
                    ? "bg-white text-purple-600 shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Reset Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot_email");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "forgot_email"
                  ? isLight
                    ? "bg-white text-purple-600 shadow-sm"
                    : "bg-purple-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Forgot Email?
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: RESET PASSWORD ================= */}
          {activeTab === "reset_password" && (
            <>
              {resetStep === 1 ? (
                // Step 1: Request OTP
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    Enter your registered clinical pharmacist email. We will send you a 6-digit verification code.
                  </p>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Pharmacist Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="pharmacist@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Sending Verification Code..." : "Send Verification Code"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                // Step 2: Verify OTP and Set New Password
                <form onSubmit={handleVerifyAndReset} className="space-y-4">
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                      isLight ? "bg-purple-50/70 border-purple-200 text-purple-800" : "bg-purple-950/30 border-purple-800/60 text-purple-300"
                    }`}
                  >
                    <span className="truncate">
                      Code sent to: <strong className="font-semibold">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-[11px] underline font-bold ml-2 shrink-0 hover:opacity-80"
                    >
                      Change
                    </button>
                  </div>

                  {/* 6-Digit OTP */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      6-Digit Clinical Security Code (OTP)
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center text-base outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Resetting Password..." : "Update & Reset Password"}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:underline disabled:opacity-50 font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                      <span>{resending ? "Resending code..." : "Didn't receive code? Resend"}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ================= TAB 2: FORGOT EMAIL ================= */}
          {activeTab === "forgot_email" && (
            <div className="space-y-4">
              <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                Cannot recall your clinical account email? Enter the contact phone number registered with your pharmacist profile.
              </p>

              <form onSubmit={handleFindEmail} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Registered Pharmacist Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                          : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {loading ? "Searching Practitioner Records..." : "Find My Pharmacist Email"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Found Email Display Box */}
              {foundEmail && (
                <div
                  className={`mt-4 p-4 rounded-xl border ${
                    isLight ? "bg-purple-50/80 border-purple-200 text-slate-900" : "bg-purple-950/30 border-purple-800 text-slate-100"
                  }`}
                >
                  <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                    Pharmacist Account Located
                  </div>
                  {foundName && (
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      Registered Practitioner: <strong className={isLight ? "text-slate-800" : "text-white"}>{foundName}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-black/40 border border-purple-500/20">
                    <span className="font-mono text-xs font-bold text-purple-600 select-all">{foundEmail}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-1 rounded text-slate-400 hover:text-purple-600 transition"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/pharmacist/login?email=${encodeURIComponent(foundEmail)}`)}
                      className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition text-center"
                    >
                      Sign In Now
                    </button>
                    <button
                      type="button"
                      onClick={handleUseEmailToReset}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition text-center ${
                        isLight
                          ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                          : "border-purple-700 text-purple-300 bg-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div
            className={`mt-6 text-center text-xs border-t pt-4 ${
              isLight ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-400"
            }`}
          >
            <span>
              Remember your credentials?{" "}
              <Link href="/pharmacist/login" className="font-bold text-purple-600 hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
