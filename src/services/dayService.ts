import axiosInstance from "./_axiosInstance";

const subdirectory: string = "/day";

export const dayService = {
  computeDays: async (
    start: Date | string,
    end: Date | string,
    isMandatory: boolean = false,
    isRnr: boolean = false,
  ): Promise<number> => {
    const startDate = start instanceof Date ? start.toISOString() : start;
    const endDate = end instanceof Date ? end.toISOString() : end;

    const response = await axiosInstance.get<number>(`${subdirectory}/count`, {
      params: {
        start: startDate,
        end: endDate,
        isMandatory: isMandatory,
        isRnr: isRnr,
      },
    });

    return response.data;
  },
};

export default dayService;
