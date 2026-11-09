import type {
  Self,
  Program,
  UserReserve,
  AutoReserveOptions,
  AutoReserveReport,
  ReservedMealResult,
} from "@/types";
import { API_BASE_URL, API_ORIGIN, BASIC_AUTH } from "@/api/constants";
import { startOfWeek, formatDateIso, formatPersian, getWeekDays } from "@/utils/date";

function isDormitory(selfName: string): boolean {
  return selfName.includes("خوابگاه");
}

function getAverageScore(p: Program): number {
  return p.programFoodTypes?.[0]?.foodList?.[0]?.averageScore ?? 0;
}

/**
 * Log in to Sharif Samad and return an OAuth Bearer token
 */
export async function loginSamad(username: string, pass: string): Promise<string> {
  const params = new URLSearchParams({
    username,
    password: pass,
    grant_type: "password",
  });

  const res = await fetch(`${API_ORIGIN}/oauth/token?_t=${Date.now()}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: BASIC_AUTH,
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.type === "ERROR") {
    throw new Error(
      json.messageFa || json.error_description || json.message || `ورود به سامانه ناموفق بود (کد: ${res.status})`
    );
  }

  const token = json.access_token;
  if (!token) {
    throw new Error("توکن در پاسخ سرور یافت نشد.");
  }

  return token;
}

/**
 * Fetch all available selfs
 */
async function fetchSelfs(token: string): Promise<Self[]> {
  const res = await fetch(`${API_BASE_URL}/reservations/selfs?_t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.type === "ERROR") {
    throw new Error(json.messageFa || json.message || "خطا در دریافت لیست سلف‌ها");
  }

  return json.payload || [];
}

/**
 * Fetch programs and current reserves for a self and week
 */
async function fetchSelfWeek(
  selfId: number,
  weekStartDateIso: string,
  token: string
): Promise<{ programs: Program[]; reserves: UserReserve[] }> {
  const url = `${API_BASE_URL}/reservations/programs/v2?selfId=${selfId}&weekStartDate=${weekStartDateIso}+00:00:00&_t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.type === "ERROR") {
    throw new Error(json.messageFa || json.message || `خطا در دریافت برنامه سلف ${selfId}`);
  }

  const payload = json.payload || {};
  const programs: Program[] = (payload.selfWeekPrograms || []).flat();
  const reserves: UserReserve[] = payload.userWeekReserves || [];

  return { programs, reserves };
}

/**
 * Submit a meal reservation
 */
async function reserveProgram(programId: number, program: Program, token: string): Promise<void> {
  const url = `${API_BASE_URL}/reservations/reserve-request?programId=${programId}&_t=${Date.now()}`;
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "cache-control": "no-cache, no-store, must-revalidate",
      pragma: "no-cache",
      expires: "0",
    },
    body: JSON.stringify({
      foodTypeId: program.foodTypeId,
      mealTypeId: program.mealTypeId,
      selectedCount: 1,
      freeFoodSelected: false,
      selected: true,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.type === "ERROR") {
    throw new Error(json.messageFa || json.message || `خطا در رزرو غذا (کد: ${res.status})`);
  }
}

/**
 * Execute server-side auto reservation according to user configuration
 */
export async function executeAutoReservation(
  options: AutoReserveOptions
): Promise<AutoReserveReport> {
  const {
    username = process.env.SAMAD_USERNAME || "",
    password = process.env.SAMAD_PASSWORD || "",
    targetWeekOffset = 1, // Default: next week
    preferredLunchSelfId = process.env.PREFERRED_LUNCH_SELF_ID
      ? Number(process.env.PREFERRED_LUNCH_SELF_ID)
      : null,
    preferredDinnerSelfId = process.env.PREFERRED_DINNER_SELF_ID
      ? Number(process.env.PREFERRED_DINNER_SELF_ID)
      : null,
    daysToReserve = [0, 1, 2, 3, 4, 5], // Saturday to Thursday
    strategy = (process.env.AUTO_RESERVE_STRATEGY as AutoReserveOptions["strategy"]) || "best_score",
    reserveLunch = true,
    reserveDinner = true,
  } = options;

  let token = options.token;
  if (!token) {
    if (!username || !password) {
      throw new Error(
        "برای اجرای رزرو خودکار، نام کاربری و رمز عبور (یا توکن معتبر) الزامی است."
      );
    }
    token = await loginSamad(username, password);
  }

  // Calculate target week start date (Saturday-based)
  const baseWeek = startOfWeek(new Date());
  baseWeek.setDate(baseWeek.getDate() + targetWeekOffset * 7);
  const targetWeekStartIso = formatDateIso(baseWeek);

  const targetWeekEnd = new Date(baseWeek);
  targetWeekEnd.setDate(targetWeekEnd.getDate() + 5); // Thursday
  const targetWeekEndIso = formatDateIso(targetWeekEnd);

  // Fetch all selfs
  const selfs = await fetchSelfs(token);
  if (!selfs.length) {
    throw new Error("هیچ سلفی در سامانه یافت نشد.");
  }

  // Fetch data for all relevant selfs
  const allPrograms: Record<number, Program[]> = {};
  const userReserves: UserReserve[] = [];
  const seenReserveKeys = new Set<string>();

  // Load programs concurrently
  await Promise.all(
    selfs.map(async (self) => {
      try {
        const { programs, reserves } = await fetchSelfWeek(
          self.id,
          targetWeekStartIso,
          token!
        );
        allPrograms[self.id] = programs;
        for (const r of reserves) {
          const itemWithSelf: UserReserve = {
            ...r,
            selfId: r.selfId ?? self.id,
          };

          const key = r.id !== undefined && r.id !== null
            ? `id_${r.id}`
            : `${itemWithSelf.selfId}_${itemWithSelf.programDate}_${itemWithSelf.foodTypeId}_${itemWithSelf.programId || ""}`;

          if (!seenReserveKeys.has(key)) {
            seenReserveKeys.add(key);
            userReserves.push(itemWithSelf);
          }
        }
      } catch (e) {
        // Log individual self fetch errors gracefully
        console.warn(`[AutoReserve] Failed to fetch programs for self ${self.id}:`, e);
      }
    })
  );

  // 6 days of the week: Saturday to Thursday
  const weekDays = getWeekDays(baseWeek, 6);
  const details: ReservedMealResult[] = [];
  let totalAttempted = 0;
  let totalReserved = 0;
  let totalAlreadyReserved = 0;
  let totalFailed = 0;

  // Helper to pick best food according to strategy
  const pickBestFood = (foods: Program[]): Program | null => {
    if (!foods.length) return null;

    const available = foods.filter((p) => !p.hideInPanel);
    const pool = available.length ? available : foods;

    const sorted = [...pool].sort((a, b) => {
      if (strategy === "best_score") {
        const diff = getAverageScore(b) - getAverageScore(a);
        if (diff !== 0) return diff;
        return a.price - b.price;
      }
      if (strategy === "cheapest") {
        const diff = a.price - b.price;
        if (diff !== 0) return diff;
        return getAverageScore(b) - getAverageScore(a);
      }
      return 0; // first_available
    });

    return sorted[0] || null;
  };

  // Iterate each day and attempt reservations
  for (let dayIndex = 0; dayIndex < weekDays.length; dayIndex++) {
    if (!daysToReserve.includes(dayIndex)) continue;

    const day = weekDays[dayIndex];
    const dateKey = formatDateIso(day);
    const dayName = formatPersian(day, { weekday: "long" });

    // 1. Process LUNCH (Campus selfs)
    if (reserveLunch) {
      totalAttempted++;
      // Check if user already reserved lunch for this date
      const alreadyHasLunch = userReserves.some(
        (r) =>
          r.selected &&
          r.programDate === dateKey &&
          !isDormitory(selfs.find((s) => s.id === r.selfId)?.name || "")
      );

      if (alreadyHasLunch) {
        totalAlreadyReserved++;
        details.push({
          date: dateKey,
          dayName,
          mealType: "lunch",
          selfId: 0,
          selfName: "—",
          programId: 0,
          foodName: "رزرو شده بود",
          price: 0,
          status: "already_reserved",
        });
      } else {
        // Collect candidate lunch programs
        const campusSelfs = selfs.filter((s) => !isDormitory(s.name));
        let candidateFoods: { self: Self; program: Program }[] = [];

        // Try preferred lunch self first if specified
        if (preferredLunchSelfId) {
          const prefSelf = selfs.find((s) => s.id === preferredLunchSelfId);
          const foods = (allPrograms[preferredLunchSelfId] || []).filter(
            (p) => p.date === dateKey
          );
          if (prefSelf && foods.length) {
            candidateFoods = foods.map((program) => ({ self: prefSelf, program }));
          }
        }

        // If no foods in preferred self, search all campus selfs
        if (!candidateFoods.length) {
          for (const s of campusSelfs) {
            const foods = (allPrograms[s.id] || []).filter(
              (p) => p.date === dateKey
            );
            candidateFoods.push(
              ...foods.map((program) => ({ self: s, program }))
            );
          }
        }

        const bestItem = pickBestFood(candidateFoods.map((c) => c.program));
        if (bestItem) {
          const matchedSelf =
            candidateFoods.find((c) => c.program.programId === bestItem.programId)
              ?.self || campusSelfs[0];

          try {
            await reserveProgram(bestItem.programId, bestItem, token);
            totalReserved++;
            details.push({
              date: dateKey,
              dayName,
              mealType: "lunch",
              selfId: matchedSelf.id,
              selfName: matchedSelf.name,
              programId: bestItem.programId,
              foodName: bestItem.foodName,
              price: bestItem.price,
              score: getAverageScore(bestItem),
              status: "reserved",
            });
          } catch (err: unknown) {
            totalFailed++;
            const errorMsg =
              err instanceof Error ? err.message : "خطا در برقراری ارتباط";
            details.push({
              date: dateKey,
              dayName,
              mealType: "lunch",
              selfId: matchedSelf.id,
              selfName: matchedSelf.name,
              programId: bestItem.programId,
              foodName: bestItem.foodName,
              price: bestItem.price,
              status: "failed",
              error: errorMsg,
            });
          }
        } else {
          details.push({
            date: dateKey,
            dayName,
            mealType: "lunch",
            selfId: 0,
            selfName: "—",
            programId: 0,
            foodName: "غذایی یافت نشد",
            price: 0,
            status: "no_food_found",
          });
        }
      }
    }

    // 2. Process DINNER (Dormitory selfs)
    if (reserveDinner) {
      totalAttempted++;
      // Check if user already reserved dinner for this date
      const alreadyHasDinner = userReserves.some(
        (r) =>
          r.selected &&
          r.programDate === dateKey &&
          isDormitory(selfs.find((s) => s.id === r.selfId)?.name || "")
      );

      if (alreadyHasDinner) {
        totalAlreadyReserved++;
        details.push({
          date: dateKey,
          dayName,
          mealType: "dinner",
          selfId: 0,
          selfName: "—",
          programId: 0,
          foodName: "رزرو شده بود",
          price: 0,
          status: "already_reserved",
        });
      } else {
        const dormSelfs = selfs.filter((s) => isDormitory(s.name));
        let candidateFoods: { self: Self; program: Program }[] = [];

        // Try preferred dinner self first if specified
        if (preferredDinnerSelfId) {
          const prefSelf = selfs.find((s) => s.id === preferredDinnerSelfId);
          const foods = (allPrograms[preferredDinnerSelfId] || []).filter(
            (p) => p.date === dateKey
          );
          if (prefSelf && foods.length) {
            candidateFoods = foods.map((program) => ({ self: prefSelf, program }));
          }
        }

        // If no foods in preferred self, search all dormitory selfs
        if (!candidateFoods.length) {
          for (const s of dormSelfs) {
            const foods = (allPrograms[s.id] || []).filter(
              (p) => p.date === dateKey
            );
            candidateFoods.push(
              ...foods.map((program) => ({ self: s, program }))
            );
          }
        }

        const bestItem = pickBestFood(candidateFoods.map((c) => c.program));
        if (bestItem) {
          const matchedSelf =
            candidateFoods.find((c) => c.program.programId === bestItem.programId)
              ?.self || dormSelfs[0];

          try {
            await reserveProgram(bestItem.programId, bestItem, token);
            totalReserved++;
            details.push({
              date: dateKey,
              dayName,
              mealType: "dinner",
              selfId: matchedSelf.id,
              selfName: matchedSelf.name,
              programId: bestItem.programId,
              foodName: bestItem.foodName,
              price: bestItem.price,
              score: getAverageScore(bestItem),
              status: "reserved",
            });
          } catch (err: unknown) {
            totalFailed++;
            const errorMsg =
              err instanceof Error ? err.message : "خطا در برقراری ارتباط";
            details.push({
              date: dateKey,
              dayName,
              mealType: "dinner",
              selfId: matchedSelf.id,
              selfName: matchedSelf.name,
              programId: bestItem.programId,
              foodName: bestItem.foodName,
              price: bestItem.price,
              status: "failed",
              error: errorMsg,
            });
          }
        } else {
          details.push({
            date: dateKey,
            dayName,
            mealType: "dinner",
            selfId: 0,
            selfName: "—",
            programId: 0,
            foodName: "غذایی یافت نشد",
            price: 0,
            status: "no_food_found",
          });
        }
      }
    }
  }

  const summaryFa = `عملیات رزرو خودکار با موفقیت پایان یافت: ${totalReserved} وعده با موفقیت رزرو شد، ${totalAlreadyReserved} وعده از قبل رزرو شده بود، ${totalFailed} خطا.`;

  return {
    timestamp: new Date().toISOString(),
    targetWeekStart: targetWeekStartIso,
    targetWeekEnd: targetWeekEndIso,
    username,
    strategy,
    totalAttempted,
    totalReserved,
    totalAlreadyReserved,
    totalFailed,
    details,
    summaryFa,
  };
}
