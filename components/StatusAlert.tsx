"use client";

import React from "react";

interface StatusAlertProps {
  message?: string;
  isError?: boolean;
  isLoading?: boolean;
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  message,
  isError,
  isLoading,
}) => {
  if (!message && !isLoading) return null;

  return (
    <div className="w-full px-4 sm:px-6 py-2">
      <div
        className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 border transition-all ${
          isError
            ? "bg-[var(--warn-bg)] text-[var(--warn)] border-[var(--warn)]/30"
            : "bg-[var(--panel)] text-[var(--mute)] border-[var(--line)]"
        }`}
      >
        {isLoading && (
          <svg
            className="animate-spin h-3.5 w-3.5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};
