export interface Self {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
}

export interface FoodListItem {
  foodId?: number;
  foodName?: string;
  averageScore?: number;
  calorie?: number;
  description?: string;
}

export interface ProgramFoodType {
  foodTypeId?: number;
  foodTypeTitle?: string;
  foodList?: FoodListItem[];
}

export interface Program {
  programId: number;
  date: string; // Format: YYYY-MM-DD
  foodName: string;
  foodTypeId: number;
  mealTypeId: number;
  foodTypeTitle: string;
  price: number;
  hideInPanel: boolean;
  programFoodTypes?: ProgramFoodType[];
}

export interface UserReserve {
  id: number;
  selected: boolean;
  selfId: number;
  programDate: string; // Format: YYYY-MM-DD
  foodTypeId: number;
  mealTypeId?: number;
  programId?: number;
}

export interface ProgramsPayload {
  selfWeekPrograms?: Program[] | Program[][];
  userWeekReserves?: UserReserve[];
}

export interface ApiResponse<T> {
  type?: string;
  code?: number | string;
  payload?: T;
  message?: string;
  messageFa?: string;
  messageResource?: string;
  status?: number;
  error?: string;
}

export interface CaptchaData {
  image: string;
  validation: string;
  nonce: string;
}

export interface CaptchaParams {
  captchaText: string;
  validation: string;
  nonce: string;
}

export interface CaptchaApiResponse {
  type: string;
  code: number | string;
  message?: string;
  messageFa?: string;
  messageResource?: string;
  payload?: {
    image: string;
    validation: string;
  };
}

export interface LoginResponse {
  type?: string;
  code?: number | string;
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  message?: string;
  messageFa?: string;
  messageResource?: string;
}

export interface ReserveRequestPayload {
  foodTypeId: number;
  mealTypeId: number;
  selectedCount: number;
  freeFoodSelected: boolean;
  selected: boolean;
}

export interface DiningData {
  programs: Record<number, Program[]>; // Keyed by selfId
  reserves: UserReserve[];
}

export interface AuthState {
  token: string;
  username: string;
}

export interface WeekDayColumn {
  date: Date;
  dateKey: string;
  dayName: string;
  dayMonth: string;
}
