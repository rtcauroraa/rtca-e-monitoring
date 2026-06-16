import type { Department } from "./Department";
import type { EnlistmentRecord } from "./EnlistmentRecord";
import type { PersonnelActivity } from "./PersonnelActivity";
import type { Rank } from "./Rank";

export type Personnel = {
  personnelId?: number | null;
  profile?: string | null;
  serialNumber?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  rankId?: number | null;
  rank?: Rank | null;
  employmentStatus?: string | null;
  dateEnlisted?: string | null;
  dateEnteredService?: string | null;
  email?: string | null;
  hasAccount?: boolean | null;
  dateOfLastPromotion?: string | null;
  personnelActivities?: PersonnelActivity[];
  enlistmentRecords?: EnlistmentRecord[];
  dutyStatus?: string | null;
  departmentId?: number | null;
  department?: Department | null;
  otherDepartmentIds?: number[];
  personnelDepartments?: Department[];
};
