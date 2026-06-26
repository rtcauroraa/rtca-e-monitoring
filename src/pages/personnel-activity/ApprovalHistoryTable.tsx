import { Button, Input, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { ApprovalStageDisplay } from "../../componets/ApprovalStageDisplay";
import { convertUtcToPhDateShort } from "../../utils/convertUtcToPhDateShort";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import type { ColumnsType } from "antd/es/table";
import type { Personnel } from "../../@types/Personnel";
import nameFormat from "../../utils/nameFormat";
import type { ActivityType } from "../../@types/ActivityType";
import { useQuery } from "@tanstack/react-query";
import activityTypeService from "../../services/activityTypeService";
import { SearchOutlined, HistoryOutlined } from "@ant-design/icons";
import ApprovalModal from "../approvalProcess/ApprovalModal";

type ApprovalHistoryTableProps = {
  viewOnly: boolean;
  isModalVisible: boolean;
  selectedActivity: PersonnelActivity | null;
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  openModal: (activity: PersonnelActivity, isViewMode: boolean) => void;
  onAfterAction: () => void;
  personnelActivities: PersonnelActivity[];
};

export default function ApprovalHistoryTable({
  viewOnly,
  selectedActivity,
  setIsModalVisible,
  onAfterAction,
  isModalVisible,
  openModal,
  personnelActivities,
}: ApprovalHistoryTableProps) {
  const { data: activityTypes } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: async () => await activityTypeService.getAll(),
    initialData: [],
  });

  //   const openModal = (activity: PersonnelActivity, isViewMode: boolean) => {
  //     setSelectedActivity(activity);
  //     setViewOnly(isViewMode);
  //     setIsModalVisible(true);
  //   };

  console.log(personnelActivities.find((c) => c.personnel?.lastName == "HITA"));

  const columns = (isView: boolean): ColumnsType<PersonnelActivity> => [
    {
      title: "Personnel",
      dataIndex: "personnel",
      key: "personnel",

      render: (value: Personnel) => nameFormat(value),
      // --- SEARCH LOGIC FOR NAME ---
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Personnel"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      onFilter: (value, record) =>
        nameFormat(record.personnel)
          .toLowerCase()
          .includes((value as string).toLowerCase()),
    },
    {
      title: "Activity Type",
      dataIndex: "activityType",
      key: "activityType",
      width: 150,
      render: (value: ActivityType) => value?.activityTypeName,
      filters:
        activityTypes?.map((c) => ({
          text: c.activityTypeName || "Unknown",
          value: c.activityTypeName ?? "",
        })) ?? [],
      onFilter: (value, record) =>
        record?.activityType?.activityTypeName?.includes(value as string) ??
        true,
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
      dataIndex: "days",
    },
    {
      title: "Approval Stage",
      key: "stage",
      align: "center",
      width: 140, // Increased slightly to comfortably hold text descriptions
      render: (_, record) => (
        <ApprovalStageDisplay
          status={record.status}
          currentStage={record.approvalProccess?.currentStage ?? 1}
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
        const start = record.startDate
          ? dayjs(record.startDate).startOf("day")
          : null;
        const end = record.endDate
          ? dayjs(record.endDate).startOf("day")
          : null;

        let statusText = record.status || "Scheduled";
        let color = "gold";

        if (record.status === "Declined" || record.status === "Suspended") {
          color = "red";
        } else if (record.status === "Pending Approval") {
          color = "gold";
        } else if (record.status === "Appeal") {
          color = "cyan";
        } else if (start && end && today.isBetween(start, end, "day", "[]")) {
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
          {(record.status === "Pending Approval" ||
            record.status === "Appeal") &&
          !isView ? (
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

  return (
    <>
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
        dataSource={personnelActivities}
        rowKey="personnelActivityId"
        style={{ marginTop: 24 }}
        pagination={{ pageSize: 10 }}
      />

      <ApprovalModal
        setIsModalVisible={setIsModalVisible}
        selectedActivity={selectedActivity}
        isModalVisible={isModalVisible}
        onAfterSave={() => {
          onAfterAction();
        }}
        viewOnly={viewOnly}
      />
    </>
  );
}
