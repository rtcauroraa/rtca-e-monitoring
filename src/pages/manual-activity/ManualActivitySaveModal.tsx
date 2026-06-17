import { Button, Table, Select, Space, Input, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import personelService from "../../services/personelService";
import nameFormat from "../../utils/nameFormat";
import { useState, useMemo, useRef } from "react";
import activityTypeService from "../../services/activityTypeService";
import { formatDateRange } from "../../utils/formatDateRange";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { AllPersonnelLeaveDto } from "../../@types/nonTable/AllPersonnelLeaveDto";
import type { ActivityData } from "../../@types/dashboardGraphs/ActivityData";
import dashboardService from "../../services/dashboardService";
import dayjs from "dayjs";
import { usePrint } from "../../hooks/documents/usePrint";
import LeaveCreditModal from "../leave-history/CreditsModal";

export default function ActivityHistoryPage() {
  const [selectedPersonnel, setSelectedPersonnel] =
    useState<AllPersonnelLeaveDto | null>(null);
  const [openLeaveCreditModal, setOpenLeaveCreditModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | "All">(
    dayjs().year(),
  );
  const [searchText, setSearchText] = useState<string>("");
  const [isDocumenting, setIsDocumenting] = useState<boolean>(false);

  // --- API Queries ---
  const { data: personnelLeaveData, isLoading: loadingData } = useQuery<
    AllPersonnelLeaveDto[]
  >({
    queryKey: ["personnelLeaveData", selectedYear],
    queryFn: async () => {
      const yearParam = selectedYear === "All" ? undefined : selectedYear;
      return await personelService.getAllPersonnelCredits(yearParam);
    },
    initialData: [],
  });

  const { data: activityData } = useQuery({
    queryKey: ["activityData"],
    queryFn: async () => await dashboardService.getPersonnelByActivityType(),
    initialData: [],
  });

  const { data: activityTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: async () => await activityTypeService.getAll(),
    initialData: [],
  });

  const columns = [
    { title: "Activity", dataIndex: "activity", key: "activity" },
    { title: "Personnel", dataIndex: "personnel", key: "personnel" },
  ];

  // --- Extract Unique Years ---
  const yearOptions = useMemo(() => {
    const yearsSet = new Set<number>();
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

  const renderDutyStatusBadge = (dutyStatus?: string | null) => {
    const normalizedStatus = dutyStatus?.trim();

    if (normalizedStatus === "Active") {
      return (
        <Tag
          color="success"
          icon={<CheckCircleOutlined />}
          className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
        >
          On Duty
        </Tag>
      );
    }

    return (
      <Tag
        color="error"
        icon={<ClockCircleOutlined />}
        className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase max-w-[180px] truncate"
        title={normalizedStatus}
      >
        {normalizedStatus}
      </Tag>
    );
  };

  // --- Filtered Personnel Data ---
  const filteredPersonnels = useMemo(() => {
    if (!searchText.trim()) return personnelLeaveData;
    const lowerSearch = searchText.toLowerCase();
    return personnelLeaveData.filter((p) =>
      nameFormat(p).toLowerCase().includes(lowerSearch),
    );
  }, [personnelLeaveData, searchText]);

  // --- Dynamic Columns Construction ---
  const dynamicColumns = useMemo(() => {
    const baseColumns: ColumnsType<AllPersonnelLeaveDto> = [
      {
        title: "Personnel",
        key: "personnel",
        fixed: "left",
        width: 240,
        render: (_, record) => (
          <div className="flex flex-col gap-1.5 py-1">
            <span className="text-xs font-semibold text-gray-900 break-words">
              {nameFormat(record)}
            </span>
            <div>{renderDutyStatusBadge(record.dutyStatus)}</div>
          </div>
        ),
      },
    ];

    // 1. Filter out activity types that have no logs/credits for ANY of the current filtered personnel rows
    const activeActivityTypes = activityTypes.filter((type) => {
      return filteredPersonnels.some((record) => {
        // Check if there's any activity log for this type matching the selected year
        const hasMatchingActivities = (record.personnelActivities || []).some(
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

        // Optional: Check if a custom credit record exists (meaning it's actively tracked)
        const hasCustomCredits = (record.leaveCredits || []).some(
          (lc) => lc.activityTypeId === type.activityTypeId,
        );

        return hasMatchingActivities || hasCustomCredits;
      });
    });

    // 2. Build grouped sub-columns using only the active, populated categories
    const activityColumns: ColumnsType<AllPersonnelLeaveDto> =
      activeActivityTypes.map((type) => ({
        title: `${type.activityTypeName} (${type.maxCredits || 0})`,
        key: `group-${type.activityTypeId}`,
        align: "center",
        children: [
          {
            title: "Logs",
            key: `logs-${type.activityTypeId}`,
            width: 180,
            render: (_, record) => {
              const filteredActivities = (
                record.personnelActivities || []
              ).filter((pa) => {
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
              });

              if (filteredActivities.length === 0) {
                return (
                  <span className="text-gray-400 text-xs block text-center">
                    -
                  </span>
                );
              }

              return (
                <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {filteredActivities.map((pa, idx) => (
                    <div
                      key={pa.personnelActivityId || idx}
                      className="flex flex-col border-b border-gray-100 last:border-0 pb-1 last:pb-0"
                    >
                      {pa.title && (
                        <span className="font-semibold text-gray-800 text-[11px] truncate">
                          {pa.title}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 font-medium">
                        {formatDateRange(pa.startDate, pa.endDate)}
                        {pa.days && (
                          <span className="text-gray-400 font-normal ml-1">
                            ({pa.days}d)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            },
          },
          {
            title: "Credits Left",
            key: `credits-${type.activityTypeId}`,
            width: 100,
            align: "center",
            render: (_, record) => {
              const creditInfo = record.leaveCredits?.find(
                (lc) => lc.activityTypeId === type.activityTypeId,
              );
              const remainingCredits = creditInfo
                ? creditInfo.remainingCredits
                : (type.maxCredits ?? 0);

              return (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    remainingCredits <= 0
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-green-50 text-green-600 border-green-200"
                  }`}
                >
                  {remainingCredits}
                </span>
              );
            },
          },
        ],
      }));

    const actionColumn: ColumnsType<AllPersonnelLeaveDto> = [
      {
        title: "Action",
        key: "action",
        fixed: "right",
        width: 100,
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
  }, [activityTypes, filteredPersonnels, selectedYear]);

  const ref = useRef<HTMLDivElement | null>(null);

  const { handlePrint } = usePrint({
    ref,
    orientation: "landscape",
    onBeforePrint: async () => await setIsDocumenting(true),
    onAfterPrint: async () => await setIsDocumenting(false),
  });

  const isLoading = loadingData || loadingTypes;

  return (
    <>
      <LeaveCreditModal
        open={openLeaveCreditModal}
        onClose={() => setOpenLeaveCreditModal(false)}
        selectedPersonnel={selectedPersonnel}
      />

      <div className="flex flex-col gap-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <span className="font-semibold text-gray-700 text-sm">
            Activity & Credit Logs
          </span>
          <Space wrap size="middle">
            <Button onClick={() => handlePrint()} loading={isDocumenting}>
              Print
            </Button>

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

        <div ref={ref}>
          <Table<ActivityData>
            size="small"
            columns={columns}
            dataSource={activityData}
            pagination={false}
            style={{ width: 300 }}
            rowKey={(record) => record.activity}
          />

          {/* Dynamic Personnel Data Table Grid */}
          <Table
            size="small"
            bordered
            sticky
            dataSource={filteredPersonnels}
            columns={dynamicColumns.filter(
              (x) => x.title != "Action" || !isDocumenting,
            )}
            rowKey="personnelId"
            loading={isLoading}
            scroll={{
              x: !isDocumenting ? "max-content" : undefined,
              y: !isDocumenting ? 600 : undefined,
            }}
            pagination={false}
          />
        </div>
      </div>
    </>
  );
}
