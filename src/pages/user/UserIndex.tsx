import React, { useState } from "react";
import { Table, Button, Form, Space, Popconfirm, Image, Tooltip } from "antd"; // Added Tooltip
import type { ColumnsType } from "antd/es/table";
import { UserOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons"; // Added Edit and Delete Icons
import type { Usertbl } from "../../@types/Usertbl";
import { useQuery } from "@tanstack/react-query";
import userService from "../../services/userService";
import UserSaveModal from "./UserSaveModal";
import imageUtility from "../../utils/imageUtility";
import nameFormat from "../../utils/nameFormat";

const UserIndex: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<Usertbl | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    data: users,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => await userService.getAll(),
  });

  const [form] = Form.useForm<Usertbl>();

  const openModal = (user?: Usertbl) => {
    if (user) {
      form.setFieldsValue(user);
      setSelectedUser(user);
    } else {
      form.resetFields();
      setSelectedUser(null);
    }
    setIsModalVisible(true);
  };

  const handleDelete = async (userId?: number) => {
    try {
      await userService.delete(userId);
      refetch();
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const columns: ColumnsType<Usertbl> = [
    {
      title: "Profile",
      key: "profile",
      width: 100,
      render: (_, record) => (
        <div style={{ cursor: "pointer" }}>
          <Image
            width={80}
            height={80}
            style={{ objectFit: "cover", borderRadius: "4px" }}
            src={imageUtility.getProfile(record?.personnel?.profile)}
            fallback="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
            placeholder={
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserOutlined style={{ fontSize: 24, color: "#bfbfbf" }} />
              </div>
            }
            preview={{
              mask: <div style={{ fontSize: 12 }}>View</div>,
            }}
          />
        </div>
      ),
    },
    {
      title: "Name",
      key: "name",
      render: (_, record) => nameFormat(record.personnel) ?? record.fullName,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Username",
      key: "userName",
      dataIndex: "userName",
    },
    {
      title: "Role/s",
      key: "roles",
      render: (_, record) => {
        const secondaryRolesList =
          record.userRoles?.map((ur) => ur.role?.roleName)?.filter(Boolean) ||
          [];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 600, color: "#1677ff" }}>
              {record.role?.roleName || "No Primary Role"}
            </span>
            {secondaryRolesList.length > 0 && (
              <span style={{ fontSize: "13px", color: "#555555" }}>
                Other: {secondaryRolesList.join(", ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 80, // Reduced from 150 to 100 since icon buttons take up much less space
      render: (_, record) => (
        <Space size="small">
          {/* Edit Icon Button */}
          <Tooltip title="Edit User">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined style={{ color: "#1677ff" }} />}
              onClick={() => openModal(record)}
            />
          </Tooltip>

          {/* Delete Icon Button inside Popconfirm */}
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record.userId)}
            okText="Yes"
            cancelText="No"
            placement="topRight"
          >
            <Tooltip title="Delete User">
              <Button
                type="text"
                shape="circle"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button type="primary" onClick={() => openModal()}>
          Add User
        </Button>
      </div>

      <Table
        scroll={{ x: 1000 }}
        size="small"
        columns={columns}
        dataSource={users}
        rowKey="userId"
        loading={isFetching}
      />

      <UserSaveModal
        form={form}
        setIsModalVisible={setIsModalVisible}
        selectedUser={selectedUser}
        isModalVisible={isModalVisible}
        onAfterSave={refetch}
      />
    </div>
  );
};

export default UserIndex;
