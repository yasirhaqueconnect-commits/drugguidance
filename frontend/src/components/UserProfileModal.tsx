"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface UserProfileModalProps {
  isOpen: boolean;
  theme?: "dark" | "light";
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  theme = "light",
  onClose,
  onProfileUpdated,
}) => {
  const isLight = theme === "light";

  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("");
  const [pregnancyType, setPregnancyType] = useState<"month" | "week">("month");
  const [pregnancyValue, setPregnancyValue] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyProfile();
      if (data && data.profile) {
        setAge(data.profile.age ?? "");
        setGender(data.profile.gender || "");
        setHeight(data.profile.height || "");
        setWeight(data.profile.weight || "");

        const rawPregnancy = data.profile.pregnancy_status || "";
        const lowerP = rawPregnancy.toLowerCase();
        if (lowerP.includes("pregnant") && !lowerP.includes("not pregnant")) {
          setPregnancyStatus("Pregnant");
          const weekM = rawPregnancy.match(/week\s*(\d+)/i);
          const monthM = rawPregnancy.match(/month\s*(\d+)/i);
          if (weekM) {
            setPregnancyType("week");
            setPregnancyValue(weekM[1]);
          } else if (monthM) {
            setPregnancyType("month");
            setPregnancyValue(monthM[1]);
          }
        } else {
          setPregnancyStatus(rawPregnancy);
        }

        setAllergies(data.profile.allergies || "");
        setMedicalConditions(data.profile.medical_conditions || "");
        setCurrentMedications(data.profile.current_medications || "");
      }
    } catch (err: any) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      let finalPregnancy = pregnancyStatus.trim();
      if (finalPregnancy === "Pregnant") {
        if (pregnancyValue) {
          finalPregnancy = `Pregnant (${pregnancyType === "week" ? `Week ${pregnancyValue}` : `Month ${pregnancyValue}`})`;
        } else {
          finalPregnancy = "Pregnant";
        }
      }

      await api.updateUserProfile({
        age: age !== "" ? Number(age) : null,
        gender: gender.trim(),
        height: height.trim(),
        weight: weight.trim(),
        pregnancy_status: finalPregnancy,
        allergies: allergies.trim(),
        medical_conditions: medicalConditions.trim(),
        current_medications: currentMedications.trim(),
      });

      setSavedSuccess(true);
      onProfileUpdated();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || "Failed to save medical profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-6 flex items-center justify-center bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <section
        className={`relative w-full max-w-[730px] max-h-[90vh] my-auto flex flex-col rounded-[22px] border font-sans overflow-hidden transition-colors ${
          isLight
            ? "bg-white text-slate-800 border-slate-200/90 shadow-[0_22px_55px_rgba(29,48,83,0.18)]"
            : "bg-slate-900 text-slate-100 border-slate-800 shadow-[0_22px_55px_rgba(0,0,0,0.6)]"
        }`}
      >
        {/* Fixed Top Header */}
        <div
          className={`shrink-0 p-5 sm:p-7 pb-4 border-b relative z-10 transition-colors ${
            isLight ? "bg-white border-slate-100" : "bg-slate-900 border-slate-800"
          }`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-5 right-5 border-0 w-8 h-8 rounded-full flex items-center justify-center text-xl cursor-pointer transition ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100"
            }`}
            aria-label="Close"
          >
            ×
          </button>

          {/* Header Title & Subtitle */}
          <div className="flex items-center gap-3.5 pr-8">
            <div
              className={`w-12 h-12 sm:w-[52px] sm:h-[52px] flex-none rounded-2xl grid place-items-center ${
                isLight ? "bg-teal-50 text-teal-600 border border-teal-200/60" : "bg-teal-950/60 text-teal-400 border border-teal-800/60"
              }`}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="6" y="4.5" width="12" height="16" rx="1.8" />
                <path d="M9 4.5V3.4c0-.8.6-1.4 1.4-1.4h3.2c.8 0 1.4.6 1.4 1.4v1.1" />
                <path d="M9 11h6M9 14h6M9 17h3" />
              </svg>
            </div>
            <div>
              <h1 className={`m-0 mb-0.5 text-base sm:text-[19px] leading-snug font-[750] ${isLight ? "text-slate-900" : "text-white"}`}>
                Complete Your Profile
              </h1>
              <p className={`m-0 text-[11px] sm:text-[11.5px] leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Please provide the following information to personalize your drug guidance recommendations.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              ❌ {error}
            </div>
          )}

          {savedSuccess && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
              ✓ Medical Profile Saved Successfully!
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {/* Age */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                    <path d="M8 3v4M16 3v4M4 10h16" />
                  </svg>
                  Age
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                    className={`w-full h-[44px] sm:h-[48px] px-3.5 border rounded-xl text-[12px] outline-none transition ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    }`}
                  />
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Years
                  </span>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <circle cx="12" cy="7" r="3" />
                    <path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6" />
                  </svg>
                  Gender
                </label>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={`w-full h-[44px] sm:h-[48px] px-3.5 pr-9 border rounded-xl text-[12px] outline-none appearance-none transition ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        : "bg-slate-950/80 border-slate-800 text-slate-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    ⌄
                  </span>
                </div>
              </div>

              {/* Height */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="m7 20 10-10M5 17l2 2M9 13l2 2M13 9l2 2M17 5l2 2" />
                    <path d="m16 3 5 5" />
                  </svg>
                  Height
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className={`w-full h-[44px] sm:h-[48px] px-3.5 border rounded-xl text-[12px] outline-none transition ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    }`}
                  />
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    cm
                  </span>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <rect x="5" y="7" width="14" height="13" rx="2" />
                    <path d="M9 7a3 3 0 0 1 6 0M12 12v3M10 14h4" />
                  </svg>
                  Weight
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={`w-full h-[44px] sm:h-[48px] px-3.5 border rounded-xl text-[12px] outline-none transition ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    }`}
                  />
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    kg
                  </span>
                </div>
              </div>

              {/* Pregnancy Status */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3" />
                    <path d="M7 20c.5-4 2.2-6 5-6s4.5 2 5 6M5 8h2M17 8h2" />
                  </svg>
                  Pregnancy Status
                </label>
                <div className="relative">
                  <select
                    value={pregnancyStatus}
                    onChange={(e) => {
                      setPregnancyStatus(e.target.value);
                      if (e.target.value !== "Pregnant") {
                        setPregnancyValue("");
                      }
                    }}
                    className={`w-full h-[44px] sm:h-[48px] px-3.5 pr-9 border rounded-xl text-[12px] outline-none appearance-none transition ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                        : "bg-slate-950/80 border-slate-800 text-slate-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    }`}
                  >
                    <option value="">Select status</option>
                    <option value="Not applicable">Not applicable</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Not pregnant">Not pregnant</option>
                  </select>
                  <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    ⌄
                  </span>
                </div>

                {/* Conditional Duration: Months or Weeks */}
                {pregnancyStatus === "Pregnant" && (
                  <div className={`mt-2.5 p-2.5 rounded-xl border transition-all ${
                    isLight ? "bg-teal-50/60 border-teal-200/80" : "bg-teal-950/30 border-teal-800/60"
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-bold ${isLight ? "text-teal-900" : "text-teal-200"}`}>
                        Pregnancy Stage:
                      </span>
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/60 dark:bg-slate-800 text-[10.5px]">
                        <button
                          type="button"
                          onClick={() => {
                            setPregnancyType("month");
                            setPregnancyValue("");
                          }}
                          className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                            pregnancyType === "month"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-300 hover:text-teal-600"
                          }`}
                        >
                          Months
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPregnancyType("week");
                            setPregnancyValue("");
                          }}
                          className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                            pregnancyType === "week"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-300 hover:text-teal-600"
                          }`}
                        >
                          Weeks
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {pregnancyType === "month" ? (
                        <select
                          value={pregnancyValue}
                          onChange={(e) => setPregnancyValue(e.target.value)}
                          className={`w-full h-[38px] px-3 pr-8 border rounded-lg text-[11.5px] outline-none appearance-none transition ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-900 focus:border-teal-500"
                              : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-400"
                          }`}
                        >
                          <option value="">Select Month (1–9)</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                            <option key={m} value={m}>
                              Month {m} {m <= 3 ? "(1st Trimester)" : m <= 6 ? "(2nd Trimester)" : "(3rd Trimester)"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={pregnancyValue}
                          onChange={(e) => setPregnancyValue(e.target.value)}
                          className={`w-full h-[38px] px-3 pr-8 border rounded-lg text-[11.5px] outline-none appearance-none transition ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-900 focus:border-teal-500"
                              : "bg-slate-900 border-slate-700 text-slate-100 focus:border-teal-400"
                          }`}
                        >
                          <option value="">Select Week (1–40)</option>
                          {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => (
                            <option key={w} value={w}>
                              Week {w} {w <= 13 ? "(1st Trimester)" : w <= 27 ? "(2nd Trimester)" : "(3rd Trimester)"}
                            </option>
                          ))}
                        </select>
                      )}
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        ⌄
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Allergies */}
              <div>
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Allergies (if any)
                </label>
                <textarea
                  placeholder="List any known allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className={`w-full h-[54px] min-h-[54px] p-2.5 px-3.5 border rounded-xl text-[12px] outline-none resize-y transition ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                      : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                  }`}
                />
                <p className={`mt-0.5 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  e.g., Penicillin, Peanuts, Latex
                </p>
              </div>

              {/* Current Medical Conditions */}
              <div className="col-span-1 sm:col-span-3">
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
                    <path d="M9 12h6" />
                  </svg>
                  Current Medical Conditions (if any)
                </label>
                <textarea
                  placeholder="List any medical conditions"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className={`w-full h-[54px] min-h-[54px] p-2.5 px-3.5 border rounded-xl text-[12px] outline-none resize-y transition ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                      : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                  }`}
                />
                <p className={`mt-0.5 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  e.g., Diabetes, Hypertension, Asthma
                </p>
              </div>

              {/* Current Medications */}
              <div className="col-span-1 sm:col-span-3">
                <label className={`flex items-center gap-1.5 mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  <svg className={`w-3.5 h-3.5 flex-none ${isLight ? "text-slate-400" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="m8 12 8-8a3 3 0 0 1 4 4l-8 8a3 3 0 0 1-4-4z" />
                    <path d="m6 14-2 2a3 3 0 0 0 4 4l2-2" />
                  </svg>
                  Current Medications (if any)
                </label>
                <textarea
                  placeholder="List any medications you are currently taking"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  className={`w-full h-[54px] min-h-[54px] p-2.5 px-3.5 border rounded-xl text-[12px] outline-none resize-y transition ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                      : "bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                  }`}
                />
                <p className={`mt-0.5 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  e.g., Metformin 500mg, Atorvastatin 10mg
                </p>
              </div>
            </div>
          </div>

          {/* Fixed Modal Footer Action Buttons */}
          <div
            className={`shrink-0 p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 z-10 transition-colors ${
              isLight ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <p className="text-[10px] text-center sm:text-left">
              Your information is secure &amp; used only for medical recommendations.
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 sm:flex-initial h-[40px] px-5 rounded-xl font-bold text-[11.5px] border transition cursor-pointer ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                }`}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial h-[40px] px-6 rounded-xl font-bold text-[11.5px] text-white border-0 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 shadow-md shadow-teal-600/20 hover:opacity-95 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};
