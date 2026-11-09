"use client";

import React from "react";
import type { Self } from "@/types";
import { formatPersian } from "@/utils/date";
import {
  CalendarIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  UserIcon,
  LogOutIcon,
  RefreshCwIcon,
  SearchIcon,
  LayoutGridIcon,
  ListIcon,
  UtensilsIcon,
} from "./Icons";

interface HeaderProps {
  username: string;
  weekStart: Date;
  selfs: Self[];
  selectedSelfId: number | null;
  selectedMealFilter: string;
  searchQuery: string;
  showHidden: boolean;
  viewMode: "grid" | "daily";
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onTodayWeek: () => void;
  onSelectSelf: (selfId: number | null) => void;
  onSelectMealFilter: (meal: string) => void;
  onSearchChange: (q: string) => void;
  onToggleShowHidden: (val: boolean) => void;
  onToggleViewMode: (mode: "grid" | "daily") => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenAutoReserve?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  weekStart,
  selfs,
  selectedSelfId,
  selectedMealFilter,
  searchQuery,
  showHidden,
  viewMode,
  onPrevWeek,
  onNextWeek,
  onTodayWeek,
  onSelectSelf,
  onSelectMealFilter,
  onSearchChange,
  onToggleShowHidden,
  onToggleViewMode,
  onLogout,
  onRefresh,
  onOpenAutoReserve,
  isLoading,
}) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5);

  const startLabel = formatPersian(weekStart, { day: "numeric", month: "long" });
  const endLabel = formatPersian(weekEnd, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-[var(--panel)]/95 backdrop-blur-md border-b border-[var(--line)] shadow-xs transition-colors">
      <div className="w-full px-4 sm:px-6 py-2.5 flex flex-col gap-2.5">
        {/* Top row: Brand & User profile & Week navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-xs">
              <UtensilsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-[var(--ink)] tracking-tight">
                سامانه تغذیه شریف
              </h1>
              <p className="text-[10px] text-[var(--mute)]">
                رزرو آنلاین غذای دانشجویی
              </p>
            </div>
          </div>

          {/* Week navigation (Middle) */}
          <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)] shadow-2xs">
            <button
              type="button"
              onClick={onPrevWeek}
              disabled={isLoading}
              className="p-1.5 text-xs rounded-lg hover:bg-[var(--panel)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-40"
              title="هفته قبل"
              aria-label="هفته قبل"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[var(--ink)] min-w-[170px] justify-center">
              <CalendarIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>
                {startLabel} تا {endLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onNextWeek}
              disabled={isLoading}
              className="p-1.5 text-xs rounded-lg hover:bg-[var(--panel)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-40"
              title="هفته بعد"
              aria-label="هفته بعد"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTodayWeek}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--ink)] font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
            >
              این هفته
            </button>
          </div>

          {/* User & Refresh controls */}
          <div className="flex items-center gap-2">
            {onOpenAutoReserve && (
              <button
                type="button"
                onClick={onOpenAutoReserve}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="رزرو خودکار سرور (Cron)"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">رزرو خودکار</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="بروزرسانی داده‌ها"
                aria-label="بروزرسانی داده‌ها"
                className="p-2 rounded-xl bg-[var(--panel)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
              >
                <RefreshCwIcon
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}

            {username && (
              <div className="flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs text-[var(--ink)] font-medium">
                <UserIcon className="w-3.5 h-3.5 text-[var(--mute)]" />
                <span className="font-semibold">{username}</span>
                <span className="text-[var(--line)]">|</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-[var(--warn)] hover:opacity-80 transition-opacity cursor-pointer font-semibold"
                  title="خروج از حساب"
                >
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: Filters, search, and view switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--line)]/50 text-xs">
          {/* Left filters: Self, Meal, Search */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Self selector */}
            <select
              value={selectedSelfId ?? ""}
              onChange={(e) =>
                onSelectSelf(e.target.value ? Number(e.target.value) : null)
              }
              className="px-2.5 py-1.5 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer shadow-2xs font-medium"
              aria-label="انتخاب سلف"
            >
              <option value="">همه سلف‌ها ({selfs.length})</option>
              {selfs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Meal filter pills */}
            <div className="flex items-center gap-1 bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--line)]">
              {["all", "lunch", "dinner"].map((meal) => {
                const label =
                  meal === "all" ? "همه وعده‌ها" : meal === "lunch" ? "ناهار" : "شام";
                const isActive = selectedMealFilter === meal;
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => onSelectMealFilter(meal)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-2xs"
                        : "text-[var(--mute)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[130px] max-w-[220px]">
              <SearchIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mute)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="جستجوی غذا..."
                className="w-full pr-8 pl-2.5 py-1.5 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] placeholder:text-zinc-400 focus:outline-none focus:border-[var(--accent)] shadow-2xs text-xs"
              />
            </div>
          </div>

          {/* Right controls: View mode switcher & Show hidden toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[var(--mute)] select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => onToggleShowHidden(e.target.checked)}
                className="accent-[var(--accent)] cursor-pointer rounded"
              />
              <span>غذاهای مخفی</span>
            </label>

            {/* View Switcher: Weekly Grid vs Daily Card list */}
            <div className="flex items-center gap-0.5 bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--line)]">
              <button
                type="button"
                onClick={() => onToggleViewMode("grid")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[var(--panel)] text-[var(--accent)] shadow-2xs font-semibold"
                    : "text-[var(--mute)] hover:text-[var(--ink)]"
                }`}
                title="نمای تقویم هفتگی"
                aria-label="نمای تقویم هفتگی"
              >
                <LayoutGridIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode("daily")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "daily"
                    ? "bg-[var(--panel)] text-[var(--accent)] shadow-2xs font-semibold"
                    : "text-[var(--mute)] hover:text-[var(--ink)]"
                }`}
                title="نمای تفکیک روزانه (موبایل و تبلت)"
                aria-label="نمای تفکیک روزانه"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
