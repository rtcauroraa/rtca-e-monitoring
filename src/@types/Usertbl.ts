import type { Personnel } from "./Personnel";
import type { Role } from "./Role";
import type { UserRole } from "./UserRole";


export type Usertbl = {
  userId?: number;
  userName?: string;
  salt?: string;
  hashedPassword?: string;
  password?:string;
  email?: string | null;
  fullName?:string|null,
  personnelId?:number | null;
  personnel?: Personnel | null;

  isActive?:boolean | null
  roleId?:number|null;
  role?:Role
  secondaryRoleIds?: number[]; 
  userRoles?: UserRole[];
};
