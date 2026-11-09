"use client";

import React, { useState } from "react";
import type { Self } from "@/types";
import { EyeIcon, EyeOffIcon, SunIcon, MoonIcon } from "./Icons";

interface SelfManagerBarProps {
  selfs: Self[];
  hiddenSelfIds: Set<number>;
  onToggleHideSelf: (selfId: number) => void;
  onShowAllSelfs: () => void;
}

function isDormitorySelf(selfName: string): boolean {
  return selfName.includes("خوابگاه");
}

export const SelfManagerBar: React.FC<SelfManagerBarProps> = ({
  selfs,
  hiddenSelfIds,
  onToggleHideSelf,
  onShowAllSelfs,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const visibleCount = selfs.length - hiddenSelfIds.size;

  return (
    <div className="w-full px-4 sm:px-6 mb-4">
      <div className="p-3 rounded-2xl bg-[var(--panel)] border border-[var(--line)] shadow-2xs transition-all">
        {/* Bar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] cursor-pointer hover:text-[var(--accent)] transition-colors"
            >
              <span className="p-1 rounded-md bg-[var(--bg)] border border-[var(--line)]">
                {isExpanded ? (
                  <EyeIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <EyeOffIcon className="w-3.5 h-3.5 text-[var(--mute)]" />
                )}
              </span>
              <span>مدیریت و فیلتر سلف‌ها</span>
              <span className="text-[11px] font-normal text-[var(--mute)]">
                ({visibleCount} سلف فعال از {selfs.length})
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {hiddenSelfIds.size > 0 && (
              <button
                type="button"
                onClick={onShowAllSelfs}
                className="font-bold text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>نمایش همه ({selfs.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
            >
              {isExpanded ? "بستن پنل" : "تنظیم سلف‌ها"}
            </button>
          </div>
        </div>

        {/* Expanded Pills list */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[var(--line)]/60 flex flex-wrap items-center gap-1.5 animate-in fade-in">
            {selfs.map((self) => {
              const isHidden = hiddenSelfIds.has(self.id);
              const isDorm = isDormitorySelf(self.name);

              return (
                <button
                  key={self.id}
                  type="button"
                  onClick={() => onToggleHideSelf(self.id)}
                  title={isHidden ? `نمایش سلف ${self.name}` : `پنهان کردن سلف ${self.name}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    isHidden
                      ? "bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] opacity-55 hover:opacity-85 line-through decoration-zinc-400"
                      : isDorm
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-2xs hover:border-indigo-400"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800 shadow-2xs hover:border-amber-400"
                  }`}
                >
                  {isDorm ? (
                    <MoonIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                  ) : (
                    <SunIcon className="w-3 h-3 text-amber-500 shrink-0" />
                  )}

                  <span className="truncate max-w-[180px]">{self.name}</span>

                  <span className="text-[10px] opacity-75">
                    {isHidden ? (
                      <EyeOffIcon className="w-3 h-3 text-[var(--mute)]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
