import type { ActivityType } from "./ActivityType";
import type { ApprovalProccess } from "./ApprovalProccess";
import type { Personnel } from "./Personnel";

export type ActivityStatus = "Suspended" | "Inactive" | "Declined" | "Pending Approval" | "Appeal" | "Ongoing" | "Scheduled" | null;

export type PersonnelActivity = {
  personnelActivityId?: number | null;
  personnelId?: number | null;
  personnel?: Personnel | null;
  activityTypeId?: number | null;
  activityType?: ActivityType | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: ActivityStatus;
  result?: string | null;
  remarks?: string | null;
  days?: number | null;
  reason?: string | null;
  isWarningSent?: boolean | null;
  isFullyApproved?: boolean | null;
  approvalProccessId?: number | null;
  approvalProccess?: ApprovalProccess
};
