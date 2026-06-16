import type { AllPersonnelLeaveDto } from "../@types/nonTable/AllPersonnelLeaveDto";
import type { EnlistedPersonnelETE } from "../@types/nonTable/EnlistedPersonnelETE";
import type { PersonnelLeaveCredits } from "../@types/nonTable/PersonnelLeaveCredits";
import type { PersonnelLongevityPay } from "../@types/nonTable/PersonnelLongevityPay";
import type { Personnel } from "../@types/Personnel";
import axiosInstance from "./_axiosInstance";

const subdirectory: string = "/personnel";

export const personelService = {
  getPersonnelCredits: async (
    personnelId?: number | null,
    year?: number | null,
    activityTypeId?: number | null,
    date?: string | null,
  ) => {
    const response = await axiosInstance.get<PersonnelLeaveCredits[]>(
      `${subdirectory}/${personnelId}/credits`,
      {
        params: {
          activityTypeId: activityTypeId || undefined,
          year: year || undefined,
          date: date || undefined,
        },
      },
    );
    return response.data;
  },

  getAllPersonnelCredits: async (year?: number | null) => {
    const response = await axiosInstance.get<AllPersonnelLeaveDto[]>(
      `${subdirectory}/credits`,
      {
        params: {
          year: year || undefined,
        },
      },
    );
    return response.data;
  },
  getLongevityPay: async (): Promise<PersonnelLongevityPay[]> => {
    const response = await axiosInstance.get<PersonnelLongevityPay[]>(
      subdirectory + "/longevity-pay",
    );
    return response.data;
  },
  getEnlistmentETE: async (): Promise<EnlistedPersonnelETE[]> => {
    const response = await axiosInstance.get<EnlistedPersonnelETE[]>(
      subdirectory + "/list/enlistment/ete",
    );
    return response.data;
  },
  getAllOnly: async (): Promise<Personnel[]> => {
    const response = await axiosInstance.get<Personnel[]>(
      subdirectory + "/list/only",
    );
    return response.data;
  },
  getAll: async (): Promise<Personnel[]> => {
    const response = await axiosInstance.get<Personnel[]>(
      subdirectory + "/list",
    );
    return response.data;
  },

  getById: async (personnelId: number): Promise<Personnel> => {
    const response = await axiosInstance.get<Personnel>(
      `${subdirectory}/${personnelId}`,
    );
    return response.data;
  },

  add: async (formData?: FormData): Promise<Personnel> => {
    const response = await axiosInstance.post<Personnel>(
      subdirectory,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },
  update: async (
    formData?: FormData,
    id?: number | null,
  ): Promise<Personnel> => {
    const response = await axiosInstance.patch<Personnel>(
      `${subdirectory}/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  delete: async (personnelId?: number): Promise<void> => {
    if (!personnelId) throw new Error("Id in delete is null");
    await axiosInstance.delete(`${subdirectory}/${personnelId}`);
  },
};

export default personelService;
