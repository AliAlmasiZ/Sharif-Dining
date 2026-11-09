"use client";

import React, { useMemo } from "react";
import type { DiningData, Self } from "@/types";
import { formatPersianMoney, formatPersianNumber } from "@/utils/date";
import { CheckCircleIcon, WalletIcon, UtensilsIcon } from "./Icons";

interface StatsSummaryProps {
  data: DiningData;
  selfs: Self[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ data, selfs }) => {
  const stats = useMemo(() => {
    const selectedReserves = data.reserves.filter((r) => {
      return (
        r.selected === true ||
        (r as unknown as { selected?: number }).selected === 1 ||
        (typeof (r as unknown as { selectedCount?: number }).selectedCount === "number" &&
          ((r as unknown as { selectedCount: number }).selectedCount > 0)) ||
        (typeof (r as unknown as { count?: number }).count === "number" &&
          ((r as unknown as { count: number }).count > 0))
      );
    });
    const count = selectedReserves.length;

    // Calculate total price of reserved meals
    let totalPrice = 0;
    for (const r of selectedReserves) {
      const selfPrograms = data.programs[r.selfId] || [];
      const rDate = String(r.programDate || "").slice(0, 10);
      const prog = selfPrograms.find((p) => {
        if (r.programId && p.programId && String(r.programId) === String(p.programId)) {
          return true;
        }
        return p.date === rDate && String(p.foodTypeId) === String(r.foodTypeId);
      });
      if (prog && prog.price) {
        totalPrice += prog.price;
      }
    }

    const priceInToman = Math.round(totalPrice / 10);

    return {
      count,
      totalPrice,
      priceInToman,
      activeSelfsCount: selfs.length,
    };
  }, [data, selfs]);

  const [showDebug, setShowDebug] = React.useState(false);

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Reserved count card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--mute)]">رزروهای این هفته</span>
              <button
                type="button"
                onClick={() => setShowDebug(!showDebug)}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                title="مشاهده پاسخ خام API سماد"
              >
                {showDebug ? "بستن لاگ" : "دیباگ API"}
              </button>
            </div>
            <div className="text-sm sm:text-base font-bold text-[var(--ink)]">
              {formatPersianNumber(stats.count, 0)}{" "}
              <span className="text-xs font-normal text-[var(--mute)]">وعده</span>
            </div>
          </div>
        </div>

        {/* Total cost card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--mute)]">مجموع هزینه رزروها</div>
            <div className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
              {formatPersianMoney(stats.totalPrice)}{" "}
              <span className="text-xs font-normal text-[var(--mute)]">ریال</span>
              {stats.totalPrice > 0 && (
                <span className="text-[10px] text-[var(--mute)] mr-1 hidden md:inline">
                  ({formatPersianMoney(stats.priceInToman)} تومان)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Active Selfs card */}
        <div className="col-span-2 sm:col-span-1 flex items-center gap-3 p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
            <UtensilsIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--mute)]">سلف‌های در دسترس</div>
            <div className="text-sm sm:text-base font-bold text-[var(--ink)]">
              {formatPersianNumber(stats.activeSelfsCount, 0)}{" "}
              <span className="text-xs font-normal text-[var(--mute)]">مجموعه</span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Debug JSON Drawer */}
      {showDebug && (
        <div className="mt-3 p-3 rounded-xl bg-zinc-900 text-zinc-100 border border-zinc-700 text-xs font-mono" dir="ltr">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
            <span>[SAMAD API DEBUG] payload.userWeekReserves ({data.reserves.length} items)</span>
            <button
              onClick={() => setShowDebug(false)}
              className="text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800"
            >
              ✕ Close
            </button>
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto">
            {data.reserves.length === 0 ? (
              <p className="text-zinc-400 italic">
                هیچ رزروی برای این هفته در userWeekReserves یافت نشد (آرایه خالی است). اگر برای هفته بعد رزرو دارید، دکمه «هفته بعد» را بزنید.
              </p>
            ) : (
              <pre className="text-[11px] whitespace-pre-wrap">
                {JSON.stringify(data.reserves, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
