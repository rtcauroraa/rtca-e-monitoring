import React, { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import { SearchOutlined, InfoCircleOutlined, HistoryOutlined } from "@ant-design/icons";

// Types & Services
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import type { Personnel } from "../../@types/Personnel";
import type { ActivityType } from "../../@types/ActivityType";
import personnelActivityService from "../../services/personnelActivityService";
import activityTypeService from "../../services/activityTypeService";

// Utilities & Components
import nameFormat from "../../utils/nameFormat";
import { convertUtcToPhDateShort } from "../../utils/convertUtcToPhDateShort";
import DebounceInput from "../../componets/DebounceInput";
import ApprovalModal from "../approvalProcess/ApprovalModal";
import { useAuth } from "../../context/UserContext";
import workflowStepsService from "../../services/workflowStepsService";
import { ApprovalStageDisplay } from "../../componets/ApprovalStageDisplay";

dayjs.extend(isBetween);

const ApprovalLeave: React.FC = () => {

  const { user } = useAuth();



  // --- States ---
  const [selectedActivity, setSelectedActivity] = useState<PersonnelActivity | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [filteredData, setFilteredData] = useState<PersonnelActivity[]>([]);

  // --- Queries ---

  const { data: activityTypes } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: async () => await activityTypeService.getAll(),
    initialData: [],
  });


  const { data: workflowStep } = useQuery({
    queryKey: ["workflowSteps", user],
    queryFn: async () => await workflowStepsService.getByRoleId(user?.roleId ?? 0),

  });

  const {
    data: activities,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["personnelActivities", workflowStep],
    queryFn: async () => await personnelActivityService.getPendingActivities(user?.userId??0),
    initialData: [],
  });

  const {
    data: activitiesAll,
    refetch: referetchAll,
    isFetching: isFetchingAll,
  } = useQuery({
    queryKey: ["personnelActivitiesAll"],
    queryFn: async () => await personnelActivityService.getAll(),
    initialData: [],
  });


  // --- Handlers ---
  const openModal = (activity: PersonnelActivity, isViewMode: boolean) => {
    setSelectedActivity(activity);
    setViewOnly(isViewMode);
    setIsModalVisible(true);
  };

  // --- Table Columns ---
  const columns = (isView: boolean): ColumnsType<PersonnelActivity> => [
    {
      title: "Personnel",
      dataIndex: "personnel",
      key: "personnel",
      render: (value: Personnel) => nameFormat(value),
    },
    {
      title: "Activity Type",
      dataIndex: "activityType",
      key: "activityType",
      width: 150,
      render: (value: ActivityType) => value?.activityTypeName,
      filters: activityTypes?.map((c) => ({
        text: c.activityTypeName || "Unknown",
        value: c.activityTypeName ?? "",
      })) ?? [],
      onFilter: (value, record) =>
        record?.activityType?.activityTypeName?.includes(value as string) ?? true,
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      align: "center",
      width: 120,
      render: (date) => convertUtcToPhDateShort(date),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      align: "center",
      width: 120,
      render: (date) => convertUtcToPhDateShort(date),
    },
    {
      title: "Day/s",
      key: "days",
      dataIndex: "days"
    },
   {
  title: "Approval Stage",
  key: "stage",
  align: "center",
  width: 140, // Increased slightly to comfortably hold text descriptions 
  render: (_, record) => (
    <ApprovalStageDisplay
      status={record.status}
      currentStage={record.approvalProccess?.currentStage}
      isOfficer={record.personnel?.rank?.rankCategory?.name === "Officer"}
    />
  ),
},
    {
      title: "Status",
      key: "status",
      width: 140,
      render: (_, record) => {
        const today = dayjs().startOf("day");
        const start = record.startDate ? dayjs(record.startDate).startOf("day") : null;
        const end = record.endDate ? dayjs(record.endDate).startOf("day") : null;

        let statusText = record.status || "Scheduled";
        let color = "gold";

        if (record.status === "Declined" || record.status === "Suspended") {
          color = "red";
        } else if (record.status === "Pending Approval") {
          color = "gold";
        }
        else if (record.status === "Appeal") {
          color = "cyan";
        }
        else if (start && end && today.isBetween(start, end, "day", "[]")) {
          statusText = "Ongoing";
          color = "blue";
        } else if (end && today.isAfter(end, "day")) {
          statusText = "Inactive";
          color = "default";
        }

        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_, record) => (
        <Space>
          {(record.status === "Pending Approval" || record.status === "Appeal") && !isView ? (
            <Button
              type="primary"
              size="small"
              onClick={() => openModal(record, false)}
            >
              Process
            </Button>
          ) : (
            <Button
              size="small"
              icon={<SearchOutlined />}
              onClick={() => openModal(record, true)}
            >
              View
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // --- Filtering Logic ---
  const handleSearch = (value: string) => {
    const keyword = value.toLowerCase().trim();
    if (!keyword) {
      setFilteredData([]);
      return;
    }
    const result = activities.filter((item) =>
      nameFormat(item.personnel || {}).toLowerCase().includes(keyword)
    );
    setFilteredData(result);
  };

  const dataSource = filteredData.length > 0 ? filteredData : activities;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Personnel Activity Approvals
        </Typography.Title>
        <DebounceInput
          placeholder="Search by personnel name..."
          style={{ width: 300 }}
          onChange={handleSearch}
        />
      </div>

      <Table
        title={() => (
          <Space className="text-amber-600 font-bold">
            <InfoCircleOutlined />
            <span>PENDING FOR REVIEW</span>
          </Space>
        )}
        scroll={{ x: 1200 }}
        size="small"
        columns={columns(false)}
        dataSource={dataSource.filter((c) => c.status === "Pending Approval" || c.status === "Appeal")}
        rowKey="personnelActivityId"
        loading={isFetching}
        pagination={{ pageSize: 5 }}
      />

      <Table
        title={() => (
          <Space className="text-slate-500 font-bold">
            <HistoryOutlined />
            <span>APPROVAL HISTORY</span>
          </Space>
        )}
        scroll={{ x: 1200 }}
        size="small"
        columns={columns(true)}
        dataSource={activitiesAll}
        rowKey="personnelActivityId"
        loading={isFetchingAll}
        style={{ marginTop: 24 }}
        pagination={{ pageSize: 10 }}
      />

      <ApprovalModal
        setIsModalVisible={setIsModalVisible}
        selectedActivity={selectedActivity}
        isModalVisible={isModalVisible}
        onAfterSave={() => { refetch(); referetchAll() }}
        viewOnly={viewOnly}
      />
    </div>
  );
};

export default ApprovalLeave;