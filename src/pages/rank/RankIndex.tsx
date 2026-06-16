// RankIndex.tsx
import React, { useState } from "react";
import { Table, Button, Form, Space, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Rank } from "../../@types/Rank";
import { useQuery } from "@tanstack/react-query";
import rankService from "../../services/rankService";
import RankSaveModal from "./RankSaveModal";
import getOrdinalSuffix from "../../utils/getOrdinalSuffix";
import formattedPeso from "../../utils/formattedPeso";

const RankIndex: React.FC = () => {
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    data: ranks,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ranks"],
    queryFn: async () => await rankService.getAll(),
  });

  const [form] = Form.useForm<Rank>();

  const openModal = (rank?: Rank) => {
    if (rank) {
      form.setFieldsValue(rank);
      setSelectedRank(rank);
    } else {
      form.resetFields();
      setSelectedRank(null);
    }
    setIsModalVisible(true);
  };

  const handleDelete = async (rankId?: number) => {
    await rankService.delete(rankId);
    refetch();
  };

  const columns: ColumnsType<Rank> = [
    { title: "Code", dataIndex: "rankCode", key: "rankCode" },
    {
      title: "Name",
      dataIndex: "rankName",
      key: "rankName",
    },
    {
      title: "Category",
      dataIndex: "rankCategory",
      key: "rankCategory",
      render: (_, record: Rank) => record.rankCategory?.name,
    },
    {
      title: "Grade",
      dataIndex: "grade",
      key: "grade",
    },
    {
      title: "Base Pay",
      dataIndex: "basePay",
      key: "basePay",
      render: (value: number) => value && formattedPeso(value),
    },
    {
      title: "Order",
      dataIndex: "rankLevel",
      key: "rankLevel",
      render: (value: number) => getOrdinalSuffix(value),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure to delete?"
            onConfirm={() => handleDelete(record.rankId)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button type="primary" onClick={() => openModal()}>
        Add Rank
      </Button>
      <Table
        scroll={{ x: 1000 }}
        size="small"
        columns={columns}
        dataSource={ranks}
        rowKey="rankId"
        loading={isFetching}
      />
      <RankSaveModal
        form={form}
        setIsModalVisible={setIsModalVisible}
        selectedRank={selectedRank}
        isModalVisible={isModalVisible}
        onAfterSave={refetch}
      />
    </div>
  );
};

export default RankIndex;
