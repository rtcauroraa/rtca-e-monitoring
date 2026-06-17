import { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Form,
  Tag,
  message,
  Input,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import { useQuery } from "@tanstack/react-query";
import personnelActivityService from "../../services/personnelActivityService";

import type { Personnel } from "../../@types/Personnel";
import type { ActivityType } from "../../@types/ActivityType";
import nameFormat from "../../utils/nameFormat";
import DebounceInput from "../../componets/DebounceInput";
import { SearchOutlined } from "@ant-design/icons";
import activityTypeService from "../../services/activityTypeService";
import ManualActivitySaveModal from "./ManualActivitySaveModal";
import { formatDateRange } from "../../utils/formatDateRange";
import ActivityHistoryPage from "../leave-history/ActivityHistoryPage";

dayjs.extend(isBetween);

export const emptyValues: PersonnelActivity = {
  personnelActivityId: null,
  personnelId: null,
  personnel: null,
  activityTypeId: null,
  activityType: null,
  title: null,
  startDate: null,
  endDate: null,
  status: "Pending Approval",
  result: null,
  remarks: null,
};

export default function ManualActivityIndex() {
  const [selectedActivity, setSelectedActivity] =
    useState<PersonnelActivity | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filteredData, setFilteredData] = useState<PersonnelActivity[]>([]);
  const [selectedStatus, _] = useState<string>("");
  const {
    data: activities,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["activities", selectedStatus],
    queryFn: async () => await personnelActivityService.getAll(),
    initialData: [],
  });

  const { data: activityTypes } = useQuery({
    queryKey: ["activityTypes"],
    queryFn: async () => await activityTypeService.getAll(),
    initialData: [],
  });

  const [form] = Form.useForm();

  const openModal = (activity?: PersonnelActivity) => {
    if (activity) {
      form.setFieldsValue({
        ...activity,
        startDate: activity.startDate ? dayjs(activity.startDate) : undefined,
        endDate: activity.endDate ? dayjs(activity.endDate) : undefined,
      });
      setSelectedActivity(activity);
    } else {
      form.setFieldsValue(emptyValues);
      setSelectedActivity(null);
    }
    setIsModalVisible(true);
  };

  //   const handleDelete = async (id?: number | null) => {
  //     await personnelActivityService.delete(id);
  //     refetch();
  //   };

  // ------------------- Suspend Action -------------------
  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      await personnelActivityService.delete(id);
      message.success("Activity deleted successfully");
      refetch();
    } catch (error) {
      message.error("Failed to delete activity");
    }
  };

  const columns: ColumnsType<PersonnelActivity> = [
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
      render: (value: ActivityType) => value.activityTypeName,
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
      title: "Date",
      dataIndex: "startDate",
      key: "startDate",
      align: "center",
      width: 130,
      sorter: (a, b) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix(),
      render: (_, record: PersonnelActivity) =>
        formatDateRange(record.startDate, record.endDate),
    },

    {
      title: "Duration",
      dataIndex: "days",
      key: "days",
      align: "center",
      width: 130,
      render: (days: number) => days,
    },
    {
      title: "Status",
      key: "status",
      width: 140,
      align: "center",
      sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
      render: (_, record) => {
        const today = dayjs().startOf("day");
        const start = record.startDate
          ? dayjs(record.startDate).startOf("day")
          : null;
        const end = record.endDate
          ? dayjs(record.endDate).startOf("day")
          : null;

        let statusText = "Scheduled";
        let color = "gold";

        // Logic priority: Forced statuses first, then time-based logic
        if (record.status === "Pending Approval") {
          statusText = "Pending Approval";
          color = "gold";
        } else if (
          record.status === "Declined" ||
          record.status === "Suspended"
        ) {
          statusText = record.status;
          color = "red";
        } else if (
          start &&
          end &&
          (today.isSame(start) ||
            today.isSame(end) ||
            (today.isAfter(start) && today.isBefore(end)))
        ) {
          statusText = "Ongoing";
          color = "blue";
        } else if (end && today.isAfter(end)) {
          statusText = "Inactive";
          color = "default";
        }

        return (
          <Tag color={color} style={{ fontWeight: 500 }}>
            {statusText.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, record) => (
        <Space>
          <>
            <Button
              type="link"
              size="small"
              onClick={() => openModal(record)}
              style={{ padding: 0 }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this activity?"
              onConfirm={() => handleDelete(record.personnelActivityId ?? 0)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                size="small"
                style={{ color: "#ff4d4f", padding: 0 }}
              >
                Delete
              </Button>
            </Popconfirm>
          </>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={() => openModal()}>
        Add Activity
      </Button>

      <div className="flex justify-end">
        <DebounceInput
          placeholder="Search Name..."
          style={{ width: 250 }}
          onChange={(value) => {
            const keyword = value.toLowerCase().trim();

            if (!keyword) {
              setFilteredData(activities);
              return;
            }

            const result = activities.filter((item) => {
              const name = nameFormat(item.personnel || {}).toLowerCase();
              return name.includes(keyword);
            });

            setFilteredData(result);
          }}
        />
      </div>

      <Table
        size="small"
        columns={columns}
        dataSource={
          filteredData.length
            ? filteredData.filter((c) => c.status != "Pending Approval")
            : activities.filter((c) => c.status != "Pending Approval")
        }
        rowKey="personnelActivityId"
        loading={isFetching}
        style={{ marginTop: 16 }}
        title={() => "History"}
      />
      <ActivityHistoryPage />

      <ManualActivitySaveModal
        form={form}
        setIsModalVisible={setIsModalVisible}
        selectedActivity={selectedActivity}
        isModalVisible={isModalVisible}
        onAfterSave={() => {
          refetch();
        }}
      />
    </div>
  );
}
