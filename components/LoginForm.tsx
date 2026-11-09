"use client";

import React, { useState, useEffect, useCallback } from "react";
import { loginUser, fetchCaptcha } from "@/api/auth";
import type { AuthState, CaptchaData } from "@/types";
import { UtensilsIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from "./Icons";

interface LoginFormProps {
  initialUsername?: string;
  onLoginSuccess: (auth: AuthState) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  initialUsername = "",
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaText, setCaptchaText] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await fetchCaptcha();
      setCaptcha(data);
      setCaptchaText("");
    } catch (err: unknown) {
      console.error("Failed to load captcha:", err);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchCaptcha()
      .then((data) => {
        if (!ignore) {
          setCaptcha(data);
          setCaptchaText("");
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to load captcha:", err);
      })
      .finally(() => {
        if (!ignore) {
          setCaptchaLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("نام کاربری و رمز عبور را وارد کنید.");
      return;
    }

    if (!captchaText.trim()) {
      setErrorMessage("کد امنیتی را وارد کنید.");
      return;
    }

    if (!captcha) {
      setErrorMessage("کد امنیتی دریافت نشده است. لطفاً آن را بازنشانی کنید.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const auth = await loginUser(username, password, {
        captchaText: captchaText.trim(),
        validation: captcha.validation,
        nonce: captcha.nonce,
      });
      setPassword("");
      setCaptchaText("");
      onLoginSuccess(auth);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "ورود ناموفق بود. لطفاً دوباره تلاش کنید.";
      setErrorMessage(message);
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-[var(--panel)]">
      <div className="w-full max-w-sm bg-[var(--panel)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-sm transition-all">
        {/* Logo and header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center mb-3 shadow-md">
            <UtensilsIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--ink)] tracking-tight">
            سامانه رزرو غذای شریف
          </h1>
          <p className="text-xs text-[var(--mute)] mt-1.5 leading-relaxed">
            ورود با اطلاعات کاربری سامانه سماد (تغذیه) دانشگاه
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold text-[var(--ink)] mb-1.5"
            >
              شماره دانشجویی / نام کاربری
            </label>
            <input
              id="username"
              type="text"
              dir="ltr"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Student ID"
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all placeholder:text-zinc-400 font-mono"
            />
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-[var(--ink)] mb-1.5"
            >
              رمز عبور سامانه تغذیه
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all placeholder:text-zinc-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mute)] hover:text-[var(--ink)] transition-colors cursor-pointer p-1"
                aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Captcha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="captcha"
                className="block text-xs font-bold text-[var(--ink)]"
              >
                کد امنیتی
              </label>
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={loading || captchaLoading}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCwIcon className={`w-3.5 h-3.5 ${captchaLoading ? "animate-spin" : ""}`} />
                <span>کد جدید</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="captcha"
                type="text"
                dir="ltr"
                autoComplete="off"
                value={captchaText}
                onChange={(e) => setCaptchaText(e.target.value)}
                placeholder="کد تصویر"
                disabled={loading}
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all placeholder:text-zinc-400 font-mono text-center tracking-widest"
              />
              <div
                onClick={() => {
                  if (!loading && !captchaLoading) {
                    loadCaptcha();
                  }
                }}
                title="برای دریافت کد جدید کلیک کنید"
                className="flex items-center justify-center bg-white border border-[var(--line)] rounded-xl px-2 py-1 shrink-0 h-[42px] cursor-pointer hover:border-[var(--accent)] transition-colors select-none"
              >
                {captchaLoading ? (
                  <div className="w-[110px] h-full flex items-center justify-center text-zinc-400">
                    <svg
                      className="animate-spin h-4 w-4"
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
                  </div>
                ) : captcha?.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`data:image/png;base64,${captcha.image}`}
                    alt="captcha"
                    className="w-[110px] h-auto object-contain"
                  />
                ) : (
                  <span className="w-[110px] text-center text-xs text-[var(--warn)]">
                    تلاش مجدد
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 text-xs bg-[var(--warn-bg)] text-[var(--warn)] border border-[var(--warn)]/30 rounded-xl flex items-center gap-2 animate-in fade-in"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" d="M12 8v4m0 4h.01" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                <span>در حال ورود به سامانه...</span>
              </>
            ) : (
              <span>ورود به سامانه</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--line)]/50 text-center">
          <p className="text-[11px] text-[var(--mute)] leading-relaxed">
            ارتباط مستقیم و امن با سرور سامانه تغذیه دانشگاه صنعتی شریف
          </p>
        </div>
      </div>
    </div>
  );
};
