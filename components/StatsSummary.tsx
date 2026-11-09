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

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Reserved count card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--mute)]">رزروهای این هفته</div>
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
    </div>
  );
};
