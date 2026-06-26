import React from "react";
import { Typography, Space } from "antd";
import type { ActivityStatus } from "../@types/PersonnelActivity";
import { useQuery } from "@tanstack/react-query";
import workflowStepsService from "../services/workflowStepsService";

const { Text } = Typography;

interface ApprovalStageDisplayProps {
  status?: ActivityStatus;
  currentStage?: number;
  isOfficer?: boolean;
}

export const ApprovalStageDisplay: React.FC<ApprovalStageDisplayProps> = ({
  status,
  currentStage = 1,
  isOfficer = false,
}) => {
  const { data: workflow } = useQuery({
    queryKey: ["workflow"],
    queryFn: async () => await workflowStepsService.getAll(),

    initialData: [],
  });

  const handleGetApprover = () => {
    const targetCategory = isOfficer ? 1 : 2;
    console.log(targetCategory, workflow);
    const filteredWorkflow = workflow.find(
      (w) => w.stepNumber == currentStage && w.rankCategoryId == targetCategory,
    )?.role?.roleName;

    return filteredWorkflow;
  };
  if (status !== "Pending Approval") {
    return;
  }

  return (
    <Space size={0}>
      <Text style={{ fontSize: "11px" }}>{handleGetApprover()}</Text>
    </Space>
  );
};
