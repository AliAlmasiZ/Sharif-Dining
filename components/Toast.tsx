"use client";

import React, { useSyncExternalStore } from "react";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = () => void;

const EMPTY_TOASTS: ToastItem[] = [];
let activeToasts: ToastItem[] = EMPTY_TOASTS;
const listeners = new Set<ToastListener>();

function emitChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export const toast = {
  show(message: string, type: ToastType = "info", duration = 4000): string {
    if (!message) return "";

    // Deduplicate identical active message and type
    const existing = activeToasts.find(
      (t) => t.message === message && t.type === type
    );
    if (existing) {
      return existing.id;
    }

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const newItem: ToastItem = { id, type, message, duration };
    activeToasts = [...activeToasts, newItem];
    emitChange();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }

    return id;
  },

  error(message: string, duration = 5000): string {
    return toast.show(message, "error", duration);
  },

  success(message: string, duration = 3000): string {
    return toast.show(message, "success", duration);
  },

  warning(message: string, duration = 4000): string {
    return toast.show(message, "warning", duration);
  },

  info(message: string, duration = 3000): string {
    return toast.show(message, "info", duration);
  },

  dismiss(id: string): void {
    const prevLen = activeToasts.length;
    const remaining = activeToasts.filter((t) => t.id !== id);
    activeToasts = remaining.length === 0 ? EMPTY_TOASTS : remaining;
    if (activeToasts.length !== prevLen) {
      emitChange();
    }
  },

  clear(): void {
    activeToasts = EMPTY_TOASTS;
    emitChange();
  },
};

function subscribe(callback: ToastListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): ToastItem[] {
  return activeToasts;
}

function getServerSnapshot(): ToastItem[] {
  return EMPTY_TOASTS;
}

export const ToastContainer: React.FC = () => {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!toasts.length) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((item) => {
        const isError = item.type === "error";
        const isSuccess = item.type === "success";
        const isWarning = item.type === "warning";

        return (
          <div
            key={item.id}
            role={isError ? "alert" : "status"}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              isError
                ? "bg-red-950/95 text-red-100 border-red-700/80 shadow-red-950/40"
                : isSuccess
                ? "bg-emerald-950/95 text-emerald-100 border-emerald-700/80 shadow-emerald-950/40"
                : isWarning
                ? "bg-amber-950/95 text-amber-100 border-amber-700/80 shadow-amber-950/40"
                : "bg-zinc-900/95 text-zinc-100 border-zinc-700/80 shadow-zinc-950/40"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isError && (
                <svg
                  className="w-5 h-5 text-red-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
              )}
              {isSuccess && (
                <svg
                  className="w-5 h-5 text-emerald-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" d="m9 12 2 2 4-4" />
                </svg>
              )}
              {isWarning && (
                <svg
                  className="w-5 h-5 text-amber-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="m10.29 3.86-8.6 14.9A2 2 0 0 0 3.42 22h17.16a2 2 0 0 0 1.73-3.24l-8.6-14.9a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"
                  />
                </svg>
              )}
              {!isError && !isSuccess && !isWarning && (
                <svg
                  className="w-5 h-5 text-zinc-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4m0-4h.01" />
                </svg>
              )}
              <span className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                {item.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="بستن پیام"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

