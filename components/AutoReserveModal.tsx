"use client";

import React, { useState } from "react";
import type { Self, FoodSelectionStrategy, AutoReserveReport } from "@/types";
import {
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "./Icons";
import { toast } from "./Toast";

interface AutoReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selfs: Self[];
  token: string;
  username: string;
  onRefreshData: () => void;
}

export const AutoReserveModal: React.FC<AutoReserveModalProps> = ({
  isOpen,
  onClose,
  selfs,
  token,
  username,
  onRefreshData,
}) => {
  const [strategy, setStrategy] = useState<FoodSelectionStrategy>("best_score");
  const [targetWeekOffset, setTargetWeekOffset] = useState<number>(1); // 1 = next week
  const [preferredLunchId, setPreferredLunchId] = useState<string>("");
  const [preferredDinnerId, setPreferredDinnerId] = useState<string>("");
  const [reserveLunch, setReserveLunch] = useState<boolean>(true);
  const [reserveDinner, setReserveDinner] = useState<boolean>(true);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<AutoReserveReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const campusSelfs = selfs.filter((s) => !s.name.includes("خوابگاه"));
  const dormSelfs = selfs.filter((s) => s.name.includes("خوابگاه"));

  const handleRunNow = async () => {
    setIsRunning(true);
    setErrorMsg("");
    setReport(null);

    try {
      const res = await fetch("/api/cron/auto-reserve", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token,
          username,
          targetWeekOffset,
          strategy,
          preferredLunchSelfId: preferredLunchId ? Number(preferredLunchId) : null,
          preferredDinnerSelfId: preferredDinnerId ? Number(preferredDinnerId) : null,
          reserveLunch,
          reserveDinner,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `خطا با کد وضعیت ${res.status}`);
      }

      setReport(json);
      toast.success("رزرو خودکار با موفقیت انجام شد.");
      onRefreshData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "خطا در برقراری ارتباط با سرور";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--panel)] border border-[var(--line)] shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RefreshCwIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                تنظیمات و اجرای رزرو خودکار سرور (Cron)
              </h2>
              <p className="text-xs text-[var(--mute)]">
                اندپوینت اختصاصی بک‌اند Next.js:{" "}
                <code className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  /api/cron/auto-reserve
                </code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-xs">
          {/* Section: Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Target Week */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--ink)]">هفته هدف برای رزرو:</label>
              <select
                value={targetWeekOffset}
                onChange={(e) => setTargetWeekOffset(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
              >
                <option value={1}>هفته آینده (پیش‌فرض رزرو هفتگی)</option>
                <option value={0}>همین هفته جاری</option>
              </select>
            </div>

            {/* Strategy */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--ink)]">معیار انتخاب غذا:</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as FoodSelectionStrategy)}
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
              >
                <option value="best_score">⭐ بالاترین امتیاز میانگین غذا</option>
                <option value="cheapest">💰 ارزان‌ترین غذای موجود</option>
                <option value="first_available">📋 اولین غذای در دسترس</option>
              </select>
            </div>

            {/* Preferred Lunch Self */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--ink)] flex items-center gap-1">
                <SunIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>سلف ترجیحی ناهار:</span>
              </label>
              <select
                value={preferredLunchId}
                onChange={(e) => setPreferredLunchId(e.target.value)}
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
              >
                <option value="">همه سلف‌های پردیس (بهترین غذا)</option>
                {campusSelfs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Dinner Self */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--ink)] flex items-center gap-1">
                <MoonIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>سلف ترجیحی شام:</span>
              </label>
              <select
                value={preferredDinnerId}
                onChange={(e) => setPreferredDinnerId(e.target.value)}
                className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
              >
                <option value="">همه خوابگاه‌ها (بهترین غذا)</option>
                {dormSelfs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meals Toggles */}
          <div className="flex items-center gap-4 pt-1 border-t border-[var(--line)]/60">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={reserveLunch}
                onChange={(e) => setReserveLunch(e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
              <span>رزرو وعده ناهار</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={reserveDinner}
                onChange={(e) => setReserveDinner(e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
              <span>رزرو وعده شام</span>
            </label>
          </div>

          {/* Linux Crontab Guide */}
          <div className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--line)] flex flex-col gap-1.5">
            <span className="font-bold text-[var(--ink)] text-[11px]">
              📌 نحوه زمان‌بندی در Linux Crontab برای اجرای خودکار سر ساعت:
            </span>
            <div className="bg-[var(--panel)] p-2 rounded-xl border border-[var(--line)] font-mono text-[11px] text-emerald-600 dark:text-emerald-400 select-all overflow-x-auto ltr text-left">
              # چهارشنبه‌ها ساعت ۱۶:۰۰ سر ساعت باز شدن سلف:
              <br />
              0 16 * * 3 /bin/bash /path/to/my-app/scripts/run-auto-reserve.sh
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Execution Report */}
          {report && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  <span>گزارش اجرای رزرو</span>
                </span>
                <span>
                  {report.totalReserved} غذا رزرو شد ({report.totalAlreadyReserved} از قبل رزرو بود)
                </span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar text-[11px]">
                {report.details.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-[var(--panel)] border border-[var(--line)]"
                  >
                    <span className="font-semibold">
                      {d.dayName} ({d.mealType === "lunch" ? "ناهار" : "شام"}):
                    </span>
                    <span className="text-[var(--ink)] truncate max-w-[200px]">
                      {d.foodName} {d.selfName !== "—" ? `· ${d.selfName}` : ""}
                    </span>
                    <span
                      className={`font-bold ${
                        d.status === "reserved"
                          ? "text-emerald-600"
                          : d.status === "already_reserved"
                          ? "text-[var(--mute)]"
                          : "text-red-500"
                      }`}
                    >
                      {d.status === "reserved"
                        ? "رزرو شد ✓"
                        : d.status === "already_reserved"
                        ? "از قبل رزرو بود"
                        : "ناموفق"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--bg)]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
          >
            بستن
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunNow}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
          >
            {isRunning ? (
              <>
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                <span>در حال رزرو هوشمند...</span>
              </>
            ) : (
              <>
                <RefreshCwIcon className="w-4 h-4" />
                <span>اجرای فوری و تست رزرو خودکار</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
