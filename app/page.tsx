"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import type { Self, DiningData, AuthState, Program } from "@/types";
import { STORAGE_KEYS } from "@/api/constants";
import {
  getStoredAuth,
  getServerAuthSnapshot,
  subscribeAuth,
  clearStoredAuth,
  logoutUser,
} from "@/api/auth";
import { setUnauthorizedHandler } from "@/api/client";
import {
  getSelfs,
  loadAllWeekData,
  submitReservation,
} from "@/api/reservations";
import { startOfWeek, formatDateIso } from "@/utils/date";
import {
  LoginForm,
  Header,
  WeekGrid,
  StatusAlert,
  StatsSummary,
  GridLayoutMode,
  AutoReserveModal,
  toast,
} from "@/components";

const emptySubscribe = () => () => {};

export default function HomePage() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const auth = useSyncExternalStore(
    subscribeAuth,
    getStoredAuth,
    getServerAuthSnapshot
  );

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selfs, setSelfs] = useState<Self[]>([]);
  const [data, setData] = useState<DiningData>({ programs: {}, reserves: [] });
  const [selectedSelfId, setSelectedSelfId] = useState<number | null>(null);
  const [selectedMealFilter, setSelectedMealFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [isAutoReserveOpen, setIsAutoReserveOpen] = useState<boolean>(false);

  // Hidden selfs state (persisted in localStorage)
  const [hiddenSelfIds, setHiddenSelfIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HIDDEN_SELFS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      // Ignore parse error
    }
    return new Set();
  });

  // Layout mode state ("days-col" default = columns are days, rows are selfs)
  const [layoutMode, setLayoutMode] = useState<GridLayoutMode>(() => {
    if (typeof window === "undefined") return "days-col";
    try {
      const saved = localStorage.getItem(
        STORAGE_KEYS.MATRIX_ORIENTATION
      ) as GridLayoutMode;
      if (
        saved &&
        ["days-col", "cards", "daily"].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // Ignore storage error
    }
    if (window.innerWidth < 768) {
      return "daily";
    }
    return "days-col";
  });

  const handleToggleHideSelf = useCallback((selfId: number) => {
    setHiddenSelfIds((prev) => {
      const next = new Set(prev);
      if (next.has(selfId)) {
        next.delete(selfId);
      } else {
        next.add(selfId);
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            STORAGE_KEYS.HIDDEN_SELFS,
            JSON.stringify(Array.from(next))
          );
        } catch {
          // Ignore storage error
        }
      }
      return next;
    });
  }, []);

  const handleShowAllSelfs = useCallback(() => {
    setHiddenSelfIds(new Set());
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.HIDDEN_SELFS);
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const handleLayoutModeChange = useCallback((mode: GridLayoutMode) => {
    setLayoutMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.MATRIX_ORIENTATION, mode);
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isStatusError, setIsStatusError] = useState<boolean>(false);
  const [reservingIds, setReservingIds] = useState<Set<number>>(new Set());

  const handleLogout = useCallback(async (msg?: string) => {
    try {
      if (auth.token && auth.username) {
        await logoutUser(auth.username, auth.token);
      }
    } finally {
      clearStoredAuth();
      setSelfs([]);
      setData({ programs: {}, reserves: [] });
      setStatusMessage(msg || "خارج شدید.");
      setIsStatusError(false);
    }
  }, [auth.token, auth.username]);

  // Load week programs and user reservations
  const loadWeek = useCallback(
    async (targetWeek: Date, authToken: string, knownSelfs?: Self[]) => {
      if (!authToken) {
        setStatusMessage("ابتدا وارد حساب کاربری خود شوید.");
        setIsStatusError(true);
        return;
      }

      setLoading(true);
      setStatusMessage("در حال دریافت برنامه غذایی و رزروها...");
      setIsStatusError(false);

      try {
        let currentSelfs = knownSelfs && knownSelfs.length ? knownSelfs : selfs;
        if (!currentSelfs.length) {
          currentSelfs = await getSelfs(authToken);
          setSelfs(currentSelfs);
        }

        const dateIso = formatDateIso(targetWeek);
        const { data: weekData, failedCount } = await loadAllWeekData(
          currentSelfs,
          dateIso,
          authToken
        );

        setData(weekData);

        if (failedCount > 0) {
          const msg = `${failedCount} سلف بارگذاری نشد.`;
          toast.warning(msg);
          setStatusMessage(msg);
          setIsStatusError(true);
        } else {
          setStatusMessage("");
          setIsStatusError(false);
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "خطا در دریافت اطلاعات.";
        toast.error(errorMsg);
        setStatusMessage("خطا: " + errorMsg);
        setIsStatusError(true);
      } finally {
        setLoading(false);
      }
    },
    [selfs]
  );

  // Setup unauthorized interceptor
  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout("نشست منقضی شده؛ دوباره وارد شوید.");
    });
  }, [handleLogout]);

  // Initial data load when token is available on mount
  useEffect(() => {
    if (!auth.token) return;

    let cancelled = false;
    const fetchInitialData = async () => {
      await Promise.resolve();
      if (!cancelled) {
        loadWeek(weekStart, auth.token);
      }
    };

    fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [auth.token, loadWeek, weekStart]);

  const handleLoginSuccess = (newAuth: AuthState) => {
    setStatusMessage("");
    loadWeek(weekStart, newAuth.token);
  };

  const handlePrevWeek = () => {
    const nextDate = new Date(weekStart);
    nextDate.setDate(nextDate.getDate() - 7);
    setWeekStart(nextDate);
    if (auth.token) loadWeek(nextDate, auth.token);
  };

  const handleNextWeek = () => {
    const nextDate = new Date(weekStart);
    nextDate.setDate(nextDate.getDate() + 7);
    setWeekStart(nextDate);
    if (auth.token) loadWeek(nextDate, auth.token);
  };

  const handleTodayWeek = () => {
    const todayStart = startOfWeek(new Date());
    setWeekStart(todayStart);
    if (auth.token) loadWeek(todayStart, auth.token);
  };

  const handleToggleReserve = async (
    program: Program,
    selfId: number,
    currentlyReserved: boolean
  ) => {
    if (!auth.token) return;

    setReservingIds((prev) => new Set(prev).add(program.programId));
    setIsStatusError(false);

    try {
      await submitReservation(
        program.programId,
        {
          foodTypeId: program.foodTypeId,
          mealTypeId: program.mealTypeId,
          selectedCount: currentlyReserved ? 0 : 1,
          freeFoodSelected: false,
          selected: !currentlyReserved,
        },
        auth.token
      );

      // Reload current week to update reservation counts and user reservation states
      await loadWeek(weekStart, auth.token);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "خطای ناشناخته رخ داد.";
      toast.error(errorMsg);
      setStatusMessage("رزرو انجام نشد: " + errorMsg);
      setIsStatusError(true);
    } finally {
      setReservingIds((prev) => {
        const next = new Set(prev);
        next.delete(program.programId);
        return next;
      });
    }
  };

  // Prevent SSR flash
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  // Unauthenticated view
  if (!auth.token) {
    return (
      <main>
        {statusMessage && (
          <div className="max-w-sm mx-auto pt-6 px-4">
            <StatusAlert
              message={statusMessage}
              isError={isStatusError}
              isLoading={false}
            />
          </div>
        )}
        <LoginForm
          initialUsername={auth.username}
          onLoginSuccess={handleLoginSuccess}
        />
      </main>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <Header
        username={auth.username}
        weekStart={weekStart}
        selfs={selfs}
        selectedSelfId={selectedSelfId}
        selectedMealFilter={selectedMealFilter}
        searchQuery={searchQuery}
        showHidden={showHidden}
        viewMode={layoutMode === "daily" ? "daily" : "grid"}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onTodayWeek={handleTodayWeek}
        onSelectSelf={setSelectedSelfId}
        onSelectMealFilter={setSelectedMealFilter}
        onSearchChange={setSearchQuery}
        onToggleShowHidden={setShowHidden}
        onToggleViewMode={(m) =>
          handleLayoutModeChange(m === "daily" ? "daily" : "days-col")
        }
        onLogout={() => handleLogout()}
        onRefresh={() => loadWeek(weekStart, auth.token)}
        onOpenAutoReserve={() => setIsAutoReserveOpen(true)}
        isLoading={loading}
      />

      <StatsSummary data={data} selfs={selfs} />

      <StatusAlert
        message={statusMessage}
        isError={isStatusError}
        isLoading={loading}
      />

      <main className="flex-1 mt-2">
        <WeekGrid
          weekStart={weekStart}
          selfs={selfs}
          data={data}
          selectedSelfId={selectedSelfId}
          selectedMealFilter={selectedMealFilter}
          searchQuery={searchQuery}
          showHidden={showHidden}
          hiddenSelfIds={hiddenSelfIds}
          layoutMode={layoutMode}
          reservingProgramIds={reservingIds}
          onToggleHideSelf={handleToggleHideSelf}
          onShowAllSelfs={handleShowAllSelfs}
          onLayoutModeChange={handleLayoutModeChange}
          onToggleReserve={handleToggleReserve}
        />
      </main>

      {/* Auto-Reserve Server Cron Modal */}
      <AutoReserveModal
        isOpen={isAutoReserveOpen}
        onClose={() => setIsAutoReserveOpen(false)}
        selfs={selfs}
        token={auth.token}
        username={auth.username}
        onRefreshData={() => loadWeek(weekStart, auth.token)}
      />
    </div>
  );
}
