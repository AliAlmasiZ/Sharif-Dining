import { apiFetch } from "./client";
import type {
  Self,
  ProgramsPayload,
  Program,
  UserReserve,
  DiningData,
  ReserveRequestPayload,
  ApiResponse,
} from "@/types";

/**
 * Fetch the list of available dining locations (Selfs).
 * The selfs endpoint sometimes returns a non-zero code with a messageFa like
 * "سلف های مجاز" while still providing a valid payload — so we bypass the
 * normal error-throwing path by catching the ApiError and falling back to the
 * payload embedded in it, if available.
 */
export async function getSelfs(token: string): Promise<Self[]> {
  try {
    const res = await apiFetch<ApiResponse<Self[]>>("/reservations/selfs", { token });
    return res.payload || [];
  } catch (err: unknown) {
    // If the server responded with a payload despite the non-success code,
    // use it rather than propagating the error.
    if (
      err instanceof Error &&
      "payload" in err &&
      (err as { payload?: ApiResponse<Self[]> }).payload
    ) {
      const payload = (err as { payload?: ApiResponse<Self[]> }).payload;
      if (payload?.payload && Array.isArray(payload.payload) && payload.payload.length > 0) {
        return payload.payload;
      }
    }
    throw err;
  }
}

/**
 * Fetch weekly programs and user reservations for a specific self.
 * Like the selfs endpoint, this may return a non-success code while still
 * including a valid payload — fall back to the payload on ApiError.
 */
export async function getWeekPrograms(
  selfId: number,
  weekStartDateIso: string,
  token: string
): Promise<ProgramsPayload> {
  const query = `selfId=${selfId}&weekStartDate=${weekStartDateIso}+00:00:00`;
  try {
    const res = await apiFetch<ApiResponse<ProgramsPayload>>(
      `/reservations/programs/v2?${query}`,
      { token }
    );
    return res.payload || {};
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "payload" in err &&
      (err as { payload?: ApiResponse<ProgramsPayload> }).payload
    ) {
      const apiPayload = (err as { payload?: ApiResponse<ProgramsPayload> }).payload;
      if (apiPayload?.payload && typeof apiPayload.payload === "object") {
        return apiPayload.payload;
      }
    }
    throw err;
  }
}

/**
 * Concurrently load programs and user reservations for all selfs for the given week.
 */
export async function loadAllWeekData(
  selfs: Self[],
  weekStartDateIso: string,
  token: string
): Promise<{ data: DiningData; failedCount: number }> {
  const results = await Promise.allSettled(
    selfs.map((s) => getWeekPrograms(s.id, weekStartDateIso, token))
  );

  const programs: Record<number, Program[]> = {};
  const reserves: UserReserve[] = [];
  const seenReserveKeys = new Set<string>();
  let failedCount = 0;

  results.forEach((res, index) => {
    const self = selfs[index];
    if (res.status !== "fulfilled") {
      failedCount++;
      return;
    }

    const payload = (res.value || {}) as ProgramsPayload;
    const rawPayload = payload as Record<string, unknown>;
    const rawPrograms =
      payload.selfWeekPrograms ||
      (rawPayload.programs as Program[] | Program[][]) ||
      (rawPayload.selfPrograms as Program[] | Program[][]) ||
      [];

    // Flatten in case selfWeekPrograms is an array of arrays
    const flatPrograms: Program[] = Array.isArray(rawPrograms)
      ? (rawPrograms.flat() as Program[])
      : [];

    programs[self.id] = flatPrograms;

    const userReserves =
      (payload.userWeekReserves as UserReserve[]) ||
      (rawPayload.userReserves as UserReserve[]) ||
      (rawPayload.reserves as UserReserve[]) ||
      [];

    for (const r of userReserves) {
      const itemWithSelf: UserReserve = {
        ...r,
        selfId: r.selfId ?? self.id,
      };

      const key =
        r.id !== undefined && r.id !== null
          ? `id_${r.id}`
          : `${itemWithSelf.selfId}_${itemWithSelf.programDate}_${itemWithSelf.foodTypeId}_${itemWithSelf.programId || ""}`;

      if (!seenReserveKeys.has(key)) {
        seenReserveKeys.add(key);
        reserves.push(itemWithSelf);
      }
    }
  });

  if (typeof window !== "undefined") {
    console.log(`[SAMAD API] Week ${weekStartDateIso} Loaded:`, {
      totalReserves: reserves.length,
      reservesList: reserves,
    });
  }

  return {
    data: { programs, reserves },
    failedCount,
  };
}

/**
 * Submit or cancel a food reservation.
 */
export async function submitReservation(
  programId: number,
  payload: ReserveRequestPayload,
  token: string
): Promise<ApiResponse<unknown>> {
  return await apiFetch<ApiResponse<unknown>>(`/reserves/${programId}/reserve`, {
    method: "PUT",
    token,
    showToast: true,
    body: JSON.stringify(payload),
  });
}
