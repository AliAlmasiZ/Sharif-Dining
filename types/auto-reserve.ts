export type FoodSelectionStrategy = "best_score" | "cheapest" | "first_available";

export interface AutoReserveOptions {
  username?: string;
  password?: string;
  token?: string;
  // Which week to target: 0 = current week, 1 = next week (default for weekly dining reservation)
  targetWeekOffset?: number;
  // Specific self IDs to target
  preferredLunchSelfId?: number | null;
  preferredDinnerSelfId?: number | null;
  // Day indices to reserve: 0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday
  daysToReserve?: number[];
  // Strategy to pick food
  strategy?: FoodSelectionStrategy;
  // Reserve lunch, dinner, or both
  reserveLunch?: boolean;
  reserveDinner?: boolean;
}

export interface ReservedMealResult {
  date: string;
  dayName: string;
  mealType: "lunch" | "dinner";
  selfId: number;
  selfName: string;
  programId: number;
  foodName: string;
  price: number;
  score?: number;
  status: "reserved" | "already_reserved" | "no_food_found" | "failed";
  error?: string;
}

export interface AutoReserveReport {
  timestamp: string;
  targetWeekStart: string;
  targetWeekEnd: string;
  username: string;
  strategy: FoodSelectionStrategy;
  totalAttempted: number;
  totalReserved: number;
  totalAlreadyReserved: number;
  totalFailed: number;
  details: ReservedMealResult[];
  summaryFa: string;
}
