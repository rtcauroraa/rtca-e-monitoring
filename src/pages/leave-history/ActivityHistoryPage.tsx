import { Button, Table, Select, Space, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import personelService from "../../services/personelService"; // Assuming this now returns AllPersonnelLeaveDto[]
import nameFormat from "../../utils/nameFormat";
import { useState, useMemo } from "react";
import LeaveCreditModal from "./CreditsModal";
import activityTypeService from "../../services/activityTypeService";
import { formatDateRange } from "../../utils/formatDateRange";
import { SearchOutlined } from "@ant-design/icons";
import type { AllPersonnelLeaveDto } from "../../@types/nonTable/AllPersonnelLeaveDto";

export default function ActivityHistoryPage() {
  const [selectedPersonnel, setSelectedPersonnel] =
    useState<AllPersonnelLeaveDto | null>(null);
  const [openLeaveCreditModal, setOpenLeaveCreditModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | "All">("All");
  const [searchText, setSearchText] = useState<string>("");

  // --- API Queries ---
  // Updated query to fetch the combined dataset using your new backend DTO structure
  const { data: personnelLeaveData, isLoading: loadingData } = useQuery<
    AllPersonnelLeaveDto[]
  >({
    queryKey: ["personnelLeaveData", selectedYear],
    queryFn: async () => {
      // Pass your selectedYear filter to your backend service endpoint if applicable
      const yearParam = selectedYear === "All" ? undefined : selectedYear;
      return await personelService.getAllPersonnelCredits(yearParam);
    },
    initialData: [],
  });

  const { data: activityTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: async () => await activityTypeService.getAll(),
    initialData: [],
  });

  // --- Extract Unique Years from Data for Dropdown Options ---
  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();

    // Fallback collection to build active filter parameters from the composite payload history
    personnelLeaveData.forEach((p) => {
      p.personnelActivities?.forEach((pa) => {
        if (pa.startDate) {
          const year = new Date(pa.startDate).getFullYear();
          if (!isNaN(year)) yearsSet.add(year);
        }
        if (pa.endDate) {
          const year = new Date(pa.endDate).getFullYear();
          if (!isNaN(year)) yearsSet.add(year);
        }
      });
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    return [
      { value: "All", label: "All Years" },
      ...sortedYears.map((year) => ({ value: year, label: `${year}` })),
    ];
  }, [personnelLeaveData]);

  // --- Filtered Personnel Data ---
  const filteredPersonnels = useMemo(() => {
    if (!searchText.trim()) return personnelLeaveData;

    const lowerSearch = searchText.toLowerCase();
    return personnelLeaveData.filter((p) => {
      const fullName = nameFormat(p).toLowerCase();
      return fullName.includes(lowerSearch);
    });
  }, [personnelLeaveData, searchText]);

  const dynamicColumns = useMemo(() => {
    const baseColumns: ColumnsType<AllPersonnelLeaveDto> = [
      {
        title: "Personnel",
        key: "personnel",
        fixed: "left",
        width: 290,
        render: (_, record) => (
          <span className="text-xs break-words">{nameFormat(record)}</span>
        ),
      },
    ];

    const activityColumns: ColumnsType<AllPersonnelLeaveDto> =
      activityTypes.map((type) => ({
        title: `${type.activityTypeName} (${type.maxCredits || 0})`,
        key: `activity-${type.activityTypeId}`,
        render: (_, record: AllPersonnelLeaveDto) => {
          const creditInfo = record.leaveCredits?.find(
            (lc) => lc.activityTypeId === type.activityTypeId,
          );

          const filteredActivities = (record.personnelActivities || []).filter(
            (pa) => {
              const matchesType = pa.activityTypeId === type.activityTypeId;
              if (!matchesType) return false;
              if (selectedYear === "All") return true;

              const startYear = pa.startDate
                ? new Date(pa.startDate).getFullYear()
                : null;
              const endYear = pa.endDate
                ? new Date(pa.endDate).getFullYear()
                : null;
              return startYear === selectedYear || endYear === selectedYear;
            },
          );

          const remainingCredits = creditInfo
            ? creditInfo.remainingCredits
            : (type.maxCredits ?? 0);

          if (filteredActivities.length === 0) {
            return;
          }

          return (
            <div className="flex flex-col gap-2 min-w-[150px]">
              <div className="flex flex-col">
                {filteredActivities.map((pa, idx) => (
                  <div
                    key={pa.personnelActivityId || idx}
                    className="flex flex-col gap-0.5 border-b border-gray-100 last:border-0 pb-1.5 last:pb-0"
                  >
                    {pa.title && (
                      <span className="font-semibold text-gray-900 text-xs">
                        {pa.title}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{formatDateRange(pa.startDate, pa.endDate)}</span>
                      {pa.days && (
                        <span className="text-gray-400 font-normal">
                          ({pa.days}d)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1.5 border-t border-dashed border-gray-200 mt-1">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    remainingCredits <= 0
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  Remaining Credits: {remainingCredits}
                </span>
              </div>
            </div>
          );
        },
      }));

    const actionColumn: ColumnsType<AllPersonnelLeaveDto> = [
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: 130,
        align: "center",
        render: (_, record) => (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setSelectedPersonnel(record);
              setOpenLeaveCreditModal(true);
            }}
          >
            Credits
          </Button>
        ),
      },
    ];

    return [...baseColumns, ...activityColumns, ...actionColumn];
  }, [activityTypes, selectedYear]);

  const isLoading = loadingData || loadingTypes;

  return (
    <>
      <LeaveCreditModal
        open={openLeaveCreditModal}
        onClose={() => setOpenLeaveCreditModal(false)}
        selectedPersonnel={selectedPersonnel}
      />

      <div className="flex flex-col gap-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        {/* Filter Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <span className="font-semibold text-gray-700 text-sm">
            Activity Logs
          </span>
          <Space wrap size="middle">
            <Input
              placeholder="Search by name..."
              size="small"
              className="w-48"
              allowClear
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Space size="small">
              <span className="text-xs text-gray-500 font-medium">
                Filter Year:
              </span>
              <Select
                className="w-32"
                size="small"
                value={selectedYear}
                options={yearOptions}
                onChange={(value) => setSelectedYear(value)}
                loading={loadingData}
              />
            </Space>
          </Space>
        </div>

        <Table
          size="small"
          sticky
          dataSource={filteredPersonnels}
          columns={dynamicColumns}
          rowKey="personnelId"
          loading={isLoading}
          scroll={{ x: "max-content" }}
          pagination={false}
        />
      </div>
    </>
  );
}
