import type { Role } from "./Role";

export type UserRole = {
  id: number;
  userId: number;
  roleId: number;
  role?: Role | null;
};