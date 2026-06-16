import type { Personnel } from "../Personnel";
import type { PersonnelLeaveCredits } from "./PersonnelLeaveCredits";

export type AllPersonnelLeaveDto = {
  leaveCredits: PersonnelLeaveCredits[];
} & Personnel;
