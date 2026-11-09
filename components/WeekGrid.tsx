"use client";

import React, { useMemo, useState } from "react";
import type { Self, Program, DiningData } from "@/types";
import { FoodItem } from "./FoodItem";
import { SelfManagerBar } from "./SelfManagerBar";
import { formatPersian, formatDateIso, getWeekDays } from "@/utils/date";
import {
  CalendarIcon,
  UtensilsIcon,
  SunIcon,
  MoonIcon,
  EyeOffIcon,
  TableIcon,
  LayoutGridIcon,
  ListIcon,
} from "./Icons";

export type GridLayoutMode = "days-col" | "cards" | "daily";

interface WeekGridProps {
  weekStart: Date;
  selfs: Self[];
  data: DiningData;
  selectedSelfId: number | null;
  selectedMealFilter: string;
  searchQuery: string;
  showHidden: boolean;
  hiddenSelfIds: Set<number>;
  layoutMode: GridLayoutMode;
  reservingProgramIds: Set<number>;
  onToggleHideSelf: (selfId: number) => void;
  onShowAllSelfs: () => void;
  onLayoutModeChange: (mode: GridLayoutMode) => void;
  onToggleReserve: (program: Program, selfId: number, isReserved: boolean) => void;
}

/**
 * Domain rule: Any self or food containing "خوابگاه" is Dinner (شام), everything else is Lunch (ناهار)
 */
function isDormitorySelf(selfName: string): boolean {
  return selfName.includes("خوابگاه");
}

function isDinnerItem(selfName: string, p: Program): boolean {
  const combined = `${selfName} ${p.foodTypeTitle || ""} ${p.foodName || ""}`;
  return combined.includes("خوابگاه") || combined.includes("شام");
}

export const WeekGrid: React.FC<WeekGridProps> = ({
  weekStart,
  selfs,
  data,
  selectedSelfId,
  selectedMealFilter,
  searchQuery,
  showHidden,
  hiddenSelfIds,
  layoutMode,
  reservingProgramIds,
  onToggleHideSelf,
  onShowAllSelfs,
  onLayoutModeChange,
  onToggleReserve,
}) => {
  // 6 days of the week: Saturday to Thursday (Friday omitted)
  const weekDays = useMemo(() => getWeekDays(weekStart, 6), [weekStart]);
  const todayIso = useMemo(() => formatDateIso(new Date()), []);

  // For daily mode: which day is currently active (defaults to today if in range, otherwise day 0 - Saturday)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(() => {
    const idx = weekDays.findIndex((d) => formatDateIso(d) === todayIso);
    return idx !== -1 ? idx : 0;
  });

  // Check if program is reserved
  const checkIsReserved = (selfId: number, program: Program): boolean => {
    return data.reserves.some((r) => {
      // 1. Check if selected / active
      const isSelected =
        r.selected === true ||
        (r as unknown as { selected?: number }).selected === 1 ||
        (typeof (r as unknown as { selectedCount?: number }).selectedCount === "number" &&
          ((r as unknown as { selectedCount: number }).selectedCount > 0)) ||
        (typeof (r as unknown as { count?: number }).count === "number" &&
          ((r as unknown as { count: number }).count > 0));

      if (!isSelected) return false;

      // 2. Direct programId match (if both available)
      if (
        r.programId &&
        program.programId &&
        String(r.programId) === String(program.programId)
      ) {
        return true;
      }

      // 3. Match by date (first 10 chars: YYYY-MM-DD to ignore timestamp)
      const rDate = String(r.programDate || "").slice(0, 10);
      const pDate = String(program.date || "").slice(0, 10);
      if (!rDate || !pDate || rDate !== pDate) return false;

      // 4. Match by foodTypeId
      if (String(r.foodTypeId) !== String(program.foodTypeId)) return false;

      // 5. Match by selfId (if r.selfId is available)
      if (r.selfId && selfId && String(r.selfId) !== String(selfId)) {
        return false;
      }

      return true;
    });
  };

  // Filter selfs: exclude hidden selfs and respect single selected self if active
  const visibleSelfs = useMemo(() => {
    return selfs.filter((s) => {
      if (hiddenSelfIds.has(s.id)) return false;
      if (selectedSelfId && s.id !== selectedSelfId) return false;
      return true;
    });
  }, [selfs, hiddenSelfIds, selectedSelfId]);

  // Split visible selfs into Campus (Lunch) and Dormitory (Dinner)
  const { lunchSelfs, dinnerSelfs } = useMemo(() => {
    const lunch: Self[] = [];
    const dinner: Self[] = [];

    for (const s of visibleSelfs) {
      if (isDormitorySelf(s.name)) {
        if (selectedMealFilter === "all" || selectedMealFilter === "dinner") {
          dinner.push(s);
        }
      } else {
        if (selectedMealFilter === "all" || selectedMealFilter === "lunch") {
          lunch.push(s);
        }
      }
    }

    return { lunchSelfs: lunch, dinnerSelfs: dinner };
  }, [visibleSelfs, selectedMealFilter]);

  // Filter program items based on hidden, meal, and search query
  const filterPrograms = React.useCallback(
    (programs: Program[], dateKey: string, selfName: string): Program[] => {
      const trimmedQuery = searchQuery.trim().toLowerCase();

      return programs.filter((p) => {
        // Must match day
        if (p.date !== dateKey) return false;

        // Hidden filter
        if (!showHidden && p.hideInPanel) return false;

        // Meal filter: "خوابگاه" is dinner, anything else is lunch
        const isDinner = isDinnerItem(selfName, p);
        if (selectedMealFilter === "lunch" && isDinner) {
          return false;
        }
        if (selectedMealFilter === "dinner" && !isDinner) {
          return false;
        }

        // Search query
        if (trimmedQuery && !p.foodName.toLowerCase().includes(trimmedQuery)) {
          return false;
        }

        return true;
      });
    },
    [searchQuery, showHidden, selectedMealFilter]
  );

  // Count reservations per day for indicators
  const getDayReserveCount = (day: Date): number => {
    const dateKey = formatDateIso(day);
    return data.reserves.filter((r) => {
      const isSelected =
        r.selected === true ||
        (r as unknown as { selected?: number }).selected === 1 ||
        (typeof (r as unknown as { selectedCount?: number }).selectedCount === "number" &&
          ((r as unknown as { selectedCount: number }).selectedCount > 0)) ||
        (typeof (r as unknown as { count?: number }).count === "number" &&
          ((r as unknown as { count: number }).count > 0));

      if (!isSelected) return false;
      const rDate = String(r.programDate || "").slice(0, 10);
      return rDate === dateKey;
    }).length;
  };

  // Foods for a specific cell (selfId x dateKey)
  const getCellFoods = React.useCallback(
    (selfId: number, dateKey: string, selfName: string): Program[] => {
      const selfPrograms = data.programs[selfId] || [];
      return filterPrograms(selfPrograms, dateKey, selfName);
    },
    [data.programs, filterPrograms]
  );

  // Group foods into Lunch and Dinner for a given day (for cards & daily view)
  const getDayMealGroups = React.useCallback(
    (dateKey: string) => {
      const lunchGroups: { self: Self; foods: Program[] }[] = [];
      const dinnerGroups: { self: Self; foods: Program[] }[] = [];

      for (const self of visibleSelfs) {
        const allFiltered = getCellFoods(self.id, dateKey, self.name);

        const lunchFoods: Program[] = [];
        const dinnerFoods: Program[] = [];

        for (const p of allFiltered) {
          if (isDinnerItem(self.name, p)) {
            dinnerFoods.push(p);
          } else {
            lunchFoods.push(p);
          }
        }

        if (lunchFoods.length > 0) {
          lunchGroups.push({ self, foods: lunchFoods });
        }
        if (dinnerFoods.length > 0) {
          dinnerGroups.push({ self, foods: dinnerFoods });
        }
      }

      const hasAnyFoods = lunchGroups.length > 0 || dinnerGroups.length > 0;

      return { lunchGroups, dinnerGroups, hasAnyFoods };
    },
    [visibleSelfs, getCellFoods]
  );

  // Current day data for daily view
  const currentDay = weekDays[activeDayIndex] || weekDays[0];
  const currentDateKey = formatDateIso(currentDay);
  const isCurrentToday = currentDateKey === todayIso;
  const currentDayMeals = useMemo(
    () => getDayMealGroups(currentDateKey),
    [getDayMealGroups, currentDateKey]
  );

  return (
    <div className="w-full pb-16">
      {/* 1. Self Manager Bar (Chips with hide/show toggles) */}
      <SelfManagerBar
        selfs={selfs}
        hiddenSelfIds={hiddenSelfIds}
        onToggleHideSelf={onToggleHideSelf}
        onShowAllSelfs={onShowAllSelfs}
      />

      {/* 2. View Mode Selector Toolbar */}
      <div className="w-full px-4 sm:px-6 mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[var(--mute)]">
          <span className="font-semibold text-[var(--ink)]">نوع نمایش:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1 bg-[var(--panel)] p-1 rounded-xl border border-[var(--line)] shadow-2xs">
          <button
            type="button"
            onClick={() => onLayoutModeChange("days-col")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === "days-col"
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-2xs"
                : "text-[var(--mute)] hover:text-[var(--ink)]"
            }`}
            title="روزها در ستون (سلف‌ها در سطر) - بدون اسکرول افقی"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>جدول ماتریسی (روزها در ستون | سلف‌ها در سطر)</span>
          </button>

          <button
            type="button"
            onClick={() => onLayoutModeChange("cards")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === "cards"
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-2xs"
                : "text-[var(--mute)] hover:text-[var(--ink)]"
            }`}
            title="نمای کارتی روزها"
          >
            <LayoutGridIcon className="w-3.5 h-3.5" />
            <span>نمای کارتی</span>
          </button>

          <button
            type="button"
            onClick={() => onLayoutModeChange("daily")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === "daily"
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-2xs"
                : "text-[var(--mute)] hover:text-[var(--ink)]"
            }`}
            title="نمای تفکیک روزانه (تب‌های موبایل)"
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>نمای روزانه (موبایل)</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MODE A (PRIMARY): MATRIX VIEW (COLUMNS = DAYS, ROWS = SELFS)
          FIT 100% WIDTH, NO HORIZONTAL SCROLL!
          ------------------------------------------------------------- */}
      {layoutMode === "days-col" && (
        <div className="w-full px-2 sm:px-4 lg:px-6">
          {visibleSelfs.length > 0 ? (
            <div className="w-full overflow-x-auto lg:overflow-x-visible custom-scrollbar">
              <table className="w-full border-separate border-spacing-1.5 text-right table-fixed min-w-[900px] lg:min-w-full">
                <thead>
                  <tr>
                    {/* Corner Header: Self Name Column */}
                    <th className="p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-center text-xs font-bold text-[var(--mute)] shadow-2xs w-[150px] xl:w-[170px]">
                      سلف \ روز
                    </th>

                    {/* 6 Day Columns (Saturday to Thursday) */}
                    {weekDays.map((day) => {
                      const dateKey = formatDateIso(day);
                      const isToday = dateKey === todayIso;
                      const reserveCount = getDayReserveCount(day);

                      return (
                        <th
                          key={dateKey}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isToday
                              ? "bg-emerald-700 text-white dark:bg-emerald-800 border-emerald-600 shadow-xs"
                              : "bg-[var(--panel)] text-[var(--ink)] border-[var(--line)] shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 font-bold text-xs sm:text-sm">
                            <span>{formatPersian(day, { weekday: "long" })}</span>
                            {isToday && (
                              <span className="text-[10px] bg-white text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 px-1.5 py-0.2 rounded-full font-bold shadow-2xs">
                                امروز
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              isToday ? "text-emerald-100" : "text-[var(--mute)]"
                            }`}
                          >
                            {formatPersian(day, { day: "numeric", month: "short" })}
                          </div>
                          {reserveCount > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold inline-block mt-1 ${
                                isToday
                                  ? "bg-white/25 text-white"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              }`}
                            >
                              {reserveCount} رزرو
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {/* --- Section 1: Campus / Lunch Selfs --- */}
                  {lunchSelfs.length > 0 && (
                    <>
                      <tr className="bg-amber-50/70 dark:bg-amber-950/30">
                        <td
                          colSpan={7}
                          className="py-1.5 px-3 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40"
                        >
                          <div className="flex items-center gap-1.5">
                            <SunIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>وعده ناهار (سلف‌های پردیس و رستوران‌ها)</span>
                            <span className="text-[10px] opacity-75 font-normal mr-auto">
                              ({lunchSelfs.length} سلف)
                            </span>
                          </div>
                        </td>
                      </tr>

                      {lunchSelfs.map((self) => (
                        <tr key={self.id}>
                          {/* Row Header: Self Name + Hide Button */}
                          <th
                            scope="row"
                            className="p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-2xs align-middle"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                                <span
                                  className="text-xs font-bold text-[var(--ink)] truncate"
                                  title={self.name}
                                >
                                  {self.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => onToggleHideSelf(self.id)}
                                title={`پنهان کردن ${self.name}`}
                                className="p-1 rounded-md text-[var(--mute)] hover:text-[var(--warn)] hover:bg-[var(--warn-bg)] transition-colors cursor-pointer shrink-0"
                                aria-label={`پنهان کردن ${self.name}`}
                              >
                                <EyeOffIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                              ناهار (پردیس)
                            </div>
                          </th>

                          {/* 6 Day cells */}
                          {weekDays.map((day) => {
                            const dateKey = formatDateIso(day);
                            const isToday = dateKey === todayIso;
                            const foods = getCellFoods(self.id, dateKey, self.name);

                            return (
                              <td
                                key={`${self.id}-${dateKey}`}
                                className={`p-2 rounded-xl border bg-[var(--panel)] border-[var(--line)] align-top shadow-2xs ${
                                  isToday
                                    ? "ring-1 ring-emerald-500/25 bg-emerald-50/10 dark:bg-emerald-950/10"
                                    : ""
                                }`}
                              >
                                {foods.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    {foods.map((p) => (
                                      <FoodItem
                                        key={`${p.programId}-${p.foodTypeId}`}
                                        program={p}
                                        selfId={self.id}
                                        isReserved={checkIsReserved(self.id, p)}
                                        isActionLoading={reservingProgramIds.has(
                                          p.programId
                                        )}
                                        mealCategory="lunch"
                                        onToggleReserve={onToggleReserve}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-6 text-center text-xs text-[var(--mute)] opacity-35">
                                    —
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}

                  {/* --- Section 2: Dormitory / Dinner Selfs --- */}
                  {dinnerSelfs.length > 0 && (
                    <>
                      <tr className="bg-indigo-50/70 dark:bg-indigo-950/30">
                        <td
                          colSpan={7}
                          className="py-1.5 px-3 rounded-lg text-xs font-bold text-indigo-900 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/40"
                        >
                          <div className="flex items-center gap-1.5">
                            <MoonIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>وعده شام (خوابگاه‌ها)</span>
                            <span className="text-[10px] opacity-75 font-normal mr-auto">
                              ({dinnerSelfs.length} سلف)
                            </span>
                          </div>
                        </td>
                      </tr>

                      {dinnerSelfs.map((self) => (
                        <tr key={self.id}>
                          {/* Row Header: Self Name + Hide Button */}
                          <th
                            scope="row"
                            className="p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] shadow-2xs align-middle"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-indigo-500" />
                                <span
                                  className="text-xs font-bold text-[var(--ink)] truncate"
                                  title={self.name}
                                >
                                  {self.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => onToggleHideSelf(self.id)}
                                title={`پنهان کردن ${self.name}`}
                                className="p-1 rounded-md text-[var(--mute)] hover:text-[var(--warn)] hover:bg-[var(--warn-bg)] transition-colors cursor-pointer shrink-0"
                                aria-label={`پنهان کردن ${self.name}`}
                              >
                                <EyeOffIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="mt-1 text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                              شام (خوابگاه)
                            </div>
                          </th>

                          {/* 6 Day cells */}
                          {weekDays.map((day) => {
                            const dateKey = formatDateIso(day);
                            const isToday = dateKey === todayIso;
                            const foods = getCellFoods(self.id, dateKey, self.name);

                            return (
                              <td
                                key={`${self.id}-${dateKey}`}
                                className={`p-2 rounded-xl border bg-[var(--panel)] border-[var(--line)] align-top shadow-2xs ${
                                  isToday
                                    ? "ring-1 ring-emerald-500/25 bg-emerald-50/10 dark:bg-emerald-950/10"
                                    : ""
                                }`}
                              >
                                {foods.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    {foods.map((p) => (
                                      <FoodItem
                                        key={`${p.programId}-${p.foodTypeId}`}
                                        program={p}
                                        selfId={self.id}
                                        isReserved={checkIsReserved(self.id, p)}
                                        isActionLoading={reservingProgramIds.has(
                                          p.programId
                                        )}
                                        mealCategory="dinner"
                                        onToggleReserve={onToggleReserve}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-6 text-center text-xs text-[var(--mute)] opacity-35">
                                    —
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center bg-[var(--panel)] border border-[var(--line)] rounded-2xl flex flex-col items-center justify-center gap-2">
              <EyeOffIcon className="w-8 h-8 text-[var(--mute)]" />
              <p className="text-sm font-bold text-[var(--ink)]">
                همه سلف‌ها پنهان شده‌اند
              </p>
              <button
                type="button"
                onClick={onShowAllSelfs}
                className="px-3 py-1.5 text-xs font-bold bg-[var(--accent)] text-[var(--accent-ink)] rounded-xl cursor-pointer"
              >
                نمایش مجدد همه سلف‌ها
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          MODE B: CARDS VIEW (COLUMNS = DAYS, WITH LUNCH/DINNER SECTIONS)
          ------------------------------------------------------------- */}
      {layoutMode === "cards" && (
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-stretch">
            {weekDays.map((day) => {
              const dateKey = formatDateIso(day);
              const isToday = dateKey === todayIso;
              const reserveCount = getDayReserveCount(day);
              const { lunchGroups, dinnerGroups, hasAnyFoods } =
                getDayMealGroups(dateKey);

              return (
                <div
                  key={dateKey}
                  className={`flex flex-col rounded-2xl border transition-all h-full ${
                    isToday
                      ? "bg-[var(--panel)] border-emerald-500 shadow-sm ring-1 ring-emerald-500/20"
                      : "bg-[var(--panel)] border-[var(--line)] shadow-2xs"
                  }`}
                >
                  {/* Column Day Header */}
                  <div
                    className={`p-3 text-center border-b rounded-t-2xl transition-colors ${
                      isToday
                        ? "bg-emerald-700 text-white dark:bg-emerald-800 border-emerald-600 shadow-xs"
                        : "bg-[var(--bg)]/90 text-[var(--ink)] border-[var(--line)]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold">
                        {formatPersian(day, { weekday: "long" })}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-white text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 px-1.5 py-0.2 rounded-full font-bold shadow-2xs">
                          امروز
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] mt-1">
                      <span
                        className={
                          isToday
                            ? "text-emerald-100 font-medium"
                            : "text-[var(--mute)]"
                        }
                      >
                        {formatPersian(day, { day: "numeric", month: "long" })}
                      </span>
                      {reserveCount > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                            isToday
                              ? "bg-white/25 text-white"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                          }`}
                        >
                          {reserveCount} رزرو
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column Body: Separated Lunch and Dinner */}
                  <div className="p-2.5 flex-1 flex flex-col gap-4 min-h-[300px]">
                    {hasAnyFoods ? (
                      <>
                        {/* Lunch Section */}
                        {lunchGroups.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 text-xs font-bold">
                              <SunIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>ناهار (پردیس)</span>
                              <span className="text-[10px] font-normal mr-auto opacity-75">
                                (
                                {lunchGroups.reduce(
                                  (acc, g) => acc + g.foods.length,
                                  0
                                )}
                                )
                              </span>
                            </div>

                            <div className="flex flex-col gap-2">
                              {lunchGroups.map(({ self, foods }) => (
                                <div
                                  key={self.id}
                                  className="p-2 rounded-xl bg-[var(--bg)]/70 border border-[var(--line)]/60"
                                >
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-[var(--line)]/50">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <h4
                                        className="text-[11px] font-bold text-[var(--ink)] truncate"
                                        title={self.name}
                                      >
                                        {self.name}
                                      </h4>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => onToggleHideSelf(self.id)}
                                      title={`پنهان کردن ${self.name}`}
                                      className="text-[var(--mute)] hover:text-[var(--warn)] p-0.5 cursor-pointer"
                                    >
                                      <EyeOffIcon className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    {foods.map((p) => (
                                      <FoodItem
                                        key={`${p.programId}-${p.foodTypeId}`}
                                        program={p}
                                        selfId={self.id}
                                        isReserved={checkIsReserved(self.id, p)}
                                        isActionLoading={reservingProgramIds.has(
                                          p.programId
                                        )}
                                        mealCategory="lunch"
                                        onToggleReserve={onToggleReserve}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dinner Section */}
                        {dinnerGroups.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold">
                              <MoonIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>شام (خوابگاه)</span>
                              <span className="text-[10px] font-normal mr-auto opacity-75">
                                (
                                {dinnerGroups.reduce(
                                  (acc, g) => acc + g.foods.length,
                                  0
                                )}
                                )
                              </span>
                            </div>

                            <div className="flex flex-col gap-2">
                              {dinnerGroups.map(({ self, foods }) => (
                                <div
                                  key={self.id}
                                  className="p-2 rounded-xl bg-[var(--bg)]/70 border border-[var(--line)]/60"
                                >
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-[var(--line)]/50">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                      <h4
                                        className="text-[11px] font-bold text-[var(--ink)] truncate"
                                        title={self.name}
                                      >
                                        {self.name}
                                      </h4>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => onToggleHideSelf(self.id)}
                                      title={`پنهان کردن ${self.name}`}
                                      className="text-[var(--mute)] hover:text-[var(--warn)] p-0.5 cursor-pointer"
                                    >
                                      <EyeOffIcon className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    {foods.map((p) => (
                                      <FoodItem
                                        key={`${p.programId}-${p.foodTypeId}`}
                                        program={p}
                                        selfId={self.id}
                                        isReserved={checkIsReserved(self.id, p)}
                                        isActionLoading={reservingProgramIds.has(
                                          p.programId
                                        )}
                                        mealCategory="dinner"
                                        onToggleReserve={onToggleReserve}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-16 text-center text-xs text-[var(--mute)] flex flex-col items-center justify-center gap-1.5 opacity-60">
                        <UtensilsIcon className="w-5 h-5" />
                        <span>برنامه‌ای نیست</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODE C: DAILY VIEW (MOBILE-FIRST FRIENDLY TABS)
          ------------------------------------------------------------- */}
      {layoutMode === "daily" && (
        <div className="max-w-4xl mx-auto px-4">
          {/* Day selector tabs (Saturday to Thursday = 6 tabs) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 custom-scrollbar">
            {weekDays.map((day, idx) => {
              const dateKey = formatDateIso(day);
              const isToday = dateKey === todayIso;
              const isSelected = idx === activeDayIndex;
              const reserveCount = getDayReserveCount(day);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-xs"
                      : isToday
                      ? "bg-[var(--panel)] border-emerald-500 text-[var(--ink)]"
                      : "bg-[var(--panel)] border-[var(--line)] text-[var(--ink)] hover:border-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">
                      {formatPersian(day, { weekday: "short" })}
                    </span>
                    {reserveCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-emerald-500"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 ${
                      isSelected ? "opacity-90" : "text-[var(--mute)]"
                    }`}
                  >
                    {formatPersian(day, { day: "numeric", month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Day Header */}
          <div className="mt-2 mb-4 p-3 rounded-xl bg-[var(--panel)] border border-[var(--line)] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--ink)]">
                {formatPersian(currentDay, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              {isCurrentToday && (
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">
                  امروز
                </span>
              )}
            </div>

            <div className="text-xs text-[var(--mute)]">
              {getDayReserveCount(currentDay) > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {getDayReserveCount(currentDay)} رزرو فعال
                </span>
              ) : (
                <span>بدون رزرو</span>
              )}
            </div>
          </div>

          {/* Separated Lunch & Dinner Sections */}
          {currentDayMeals.hasAnyFoods ? (
            <div className="flex flex-col gap-6">
              {/* Lunch Section */}
              {currentDayMeals.lunchGroups.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                    <SunIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-extrabold">وعده ناهار (پردیس و رستوران‌ها)</span>
                    <span className="text-xs text-amber-700 dark:text-amber-400 mr-auto font-medium">
                      {currentDayMeals.lunchGroups.reduce(
                        (acc, g) => acc + g.foods.length,
                        0
                      )}{" "}
                      غذا
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {currentDayMeals.lunchGroups.map(({ self, foods }) => (
                      <div
                        key={self.id}
                        className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl p-4 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[var(--line)]/60">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <h3 className="text-sm font-bold text-[var(--ink)]">
                              {self.name}
                            </h3>
                            <span className="text-xs text-[var(--mute)]">
                              ({foods.length} گزینه)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleHideSelf(self.id)}
                            title={`پنهان کردن ${self.name}`}
                            className="text-xs text-[var(--mute)] hover:text-[var(--warn)] p-1 cursor-pointer flex items-center gap-1"
                          >
                            <EyeOffIcon className="w-3.5 h-3.5" />
                            <span>پنهان</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {foods.map((p) => (
                            <FoodItem
                              key={`${p.programId}-${p.foodTypeId}`}
                              program={p}
                              selfId={self.id}
                              isReserved={checkIsReserved(self.id, p)}
                              isActionLoading={reservingProgramIds.has(p.programId)}
                              mealCategory="lunch"
                              onToggleReserve={onToggleReserve}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dinner Section */}
              {currentDayMeals.dinnerGroups.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                    <MoonIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-extrabold">وعده شام (خوابگاه‌ها)</span>
                    <span className="text-xs text-indigo-700 dark:text-indigo-400 mr-auto font-medium">
                      {currentDayMeals.dinnerGroups.reduce(
                        (acc, g) => acc + g.foods.length,
                        0
                      )}{" "}
                      غذا
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {currentDayMeals.dinnerGroups.map(({ self, foods }) => (
                      <div
                        key={self.id}
                        className="bg-[var(--panel)] border border-[var(--line)] rounded-2xl p-4 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[var(--line)]/60">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <h3 className="text-sm font-bold text-[var(--ink)]">
                              {self.name}
                            </h3>
                            <span className="text-xs text-[var(--mute)]">
                              ({foods.length} گزینه)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleHideSelf(self.id)}
                            title={`پنهان کردن ${self.name}`}
                            className="text-xs text-[var(--mute)] hover:text-[var(--warn)] p-1 cursor-pointer flex items-center gap-1"
                          >
                            <EyeOffIcon className="w-3.5 h-3.5" />
                            <span>پنهان</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {foods.map((p) => (
                            <FoodItem
                              key={`${p.programId}-${p.foodTypeId}`}
                              program={p}
                              selfId={self.id}
                              isReserved={checkIsReserved(self.id, p)}
                              isActionLoading={reservingProgramIds.has(p.programId)}
                              mealCategory="dinner"
                              onToggleReserve={onToggleReserve}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center bg-[var(--panel)] border border-[var(--line)] rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xs">
              <UtensilsIcon className="w-8 h-8 text-[var(--mute)] opacity-50" />
              <p className="text-sm font-semibold text-[var(--ink)]">
                برنامه‌ای برای این روز یافت نشد
              </p>
              <p className="text-xs text-[var(--mute)]">
                فیلترها یا جستجوی خود را بررسی کنید.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
