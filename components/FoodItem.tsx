"use client";

import React from "react";
import type { Program } from "@/types";
import { formatPersianMoney, formatPersianNumber } from "@/utils/date";
import { StarIcon, CheckCircleIcon } from "./Icons";

interface FoodItemProps {
  program: Program;
  selfId: number;
  isReserved: boolean;
  isActionLoading: boolean;
  mealCategory?: "lunch" | "dinner";
  onToggleReserve: (program: Program, selfId: number, isReserved: boolean) => void;
}

export const FoodItem: React.FC<FoodItemProps> = ({
  program,
  selfId,
  isReserved,
  isActionLoading,
  mealCategory,
  onToggleReserve,
}) => {
  const averageScore = program.programFoodTypes?.[0]?.foodList?.[0]?.averageScore;
  const priceInToman = Math.round(program.price / 10);

  // Meal type badge: "خوابگاه" or explicit "شام" is dinner, everything else is lunch
  const isDinner = mealCategory === "dinner" || program.foodTypeTitle?.includes("شام");

  const mealBadgeColor = isDinner
    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
    : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";

  const mealBadgeLabel = isDinner ? "شام" : "ناهار";

  return (
    <div
      className={`group relative flex flex-col justify-between gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
        isReserved
          ? "bg-[var(--reserved-bg)] border-[var(--reserved-border)] ring-1 ring-[var(--reserved-border)] shadow-xs"
          : "bg-[var(--panel)] border-[var(--line)] hover:border-emerald-600/50 dark:hover:border-emerald-500/50 hover:shadow-xs"
      } ${program.hideInPanel ? "opacity-65" : ""}`}
    >
      {/* Header: title and reservation status */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <strong className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2 break-words">
            {program.foodName}
          </strong>
          {isReserved && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950 px-2 py-0.5 rounded-full shadow-2xs">
              <CheckCircleIcon className="w-3 h-3" />
              <span>رزرو شده</span>
            </span>
          )}
        </div>

        {/* Metadata: Meal type & Star score */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${mealBadgeColor}`}
          >
            {mealBadgeLabel}
            {program.foodTypeTitle ? ` · ${program.foodTypeTitle}` : ""}
          </span>

          {averageScore !== undefined && averageScore !== null && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
              title={`امتیاز میانگین: ${averageScore}`}
            >
              <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{formatPersianNumber(averageScore, 1)}</span>
            </span>
          )}

          {program.hideInPanel && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
              مخفی در پنل
            </span>
          )}
        </div>
      </div>

      {/* Footer: Price and Reserve CTA */}
      <div className="pt-2 border-t border-[var(--line)]/60 flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-[11px] text-[var(--mute)]">قیمت:</span>
          <div className="text-left font-bold text-[var(--ink)]">
            <span>{formatPersianMoney(program.price)}</span>{" "}
            <span className="text-[10px] font-normal text-[var(--mute)]">ریال</span>
            {program.price > 0 && (
              <span className="text-[10px] text-[var(--mute)] mr-1">
                ({formatPersianMoney(priceInToman)} ت)
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={isActionLoading}
          onClick={() => onToggleReserve(program, selfId, isReserved)}
          className={`w-full min-h-[36px] py-1.5 px-3 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
            isReserved
              ? "bg-[var(--panel)] text-[var(--warn)] border border-[var(--warn)]/40 hover:bg-[var(--warn-bg)] focus-visible:ring-[var(--warn)]"
              : "bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-xs focus-visible:ring-[var(--accent)]"
          }`}
          aria-label={
            isReserved
              ? `لغو رزرو ${program.foodName}`
              : `رزرو غذای ${program.foodName}`
          }
        >
          {isActionLoading ? (
            <>
              <svg
                className="animate-spin h-3.5 w-3.5 text-current shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>در حال ارسال...</span>
            </>
          ) : isReserved ? (
            <span>لغو رزرو</span>
          ) : (
            <span>رزرو غذا</span>
          )}
        </button>
      </div>
    </div>
  );
};
