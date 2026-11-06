import type { Context } from "hono";

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  password_iters: number;
  accent: string;
  height_cm: number | null;
  goal_grams: number | null;
  weekly_goal: number;
  created_at: number;
  share_calendar: number;
  share_workouts: number;
  share_weight: number;
  routines_seeded: number;
}

export interface AppEnv {
  Bindings: {
    DB: D1Database;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
  };
  Variables: { user: UserRow; tokenHash: string };
}

export type AppContext = Context<AppEnv>;
