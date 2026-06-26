import React, { useMemo } from "react";
import { Steps, Typography, Tag, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import nameFormat from "../../utils/nameFormat";
import workflowStepsService from "../../services/workflowStepsService";
import roleService from "../../services/roleService";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import activityAppealService from "../../services/activityAppealService";

const { Text, Title } = Typography;
type ApprovalTrailProps = {
  currentStage: number;
  activity: PersonnelActivity | null | undefined;
  viewOnly?: boolean;
};

const ApprovalTrail: React.FC<ApprovalTrailProps> = ({
  currentStage,
  activity,
  viewOnly,
}) => {
  const personnelType = activity?.personnel?.rank?.rankCategory?.name;
  const approvalData = activity?.approvalProccess;

  const { data: workflowSteps = [], isLoading: loadingSteps } = useQuery({
    queryKey: ["workflowSteps"],
    queryFn: workflowStepsService.getAll,
  });

  const { data: activityAppeal } = useQuery({
    queryKey: ["activityAppeal", activity?.personnelActivityId],
    queryFn: async () =>
      await activityAppealService.getAll({
        personnelActivityId: activity?.personnelActivityId,
      }),
    initialData: [],
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: roleService.getAll,
  });

  const getStageData = (stepNumber: number, isOfficer: boolean) => {
    const dataIndex = isOfficer ? stepNumber + 2 : stepNumber;

    const mapping: Record<number, any> = {
      1: {
        isApprove: approvalData?.stageOneIsApprove,
        remarks: approvalData?.stageOneRemarks,
        approver: approvalData?.approverOne,
      },
      2: {
        isApprove: approvalData?.stageTwoIsApprove,
        remarks: approvalData?.stageTwoRemarks,
        approver: approvalData?.approverTwo,
      },
      3: {
        isApprove: approvalData?.stageThreeIsApprove,
        remarks: approvalData?.stageThreeRemarks,
        approver: approvalData?.approverThree,
      },
      4: {
        isApprove: approvalData?.stageFourIsApprove,
        remarks: approvalData?.stageFourRemarks,
        approver: approvalData?.approverFour,
      },
    };

    return mapping[dataIndex];
  };

  const renderStageDetail = (
    stageNumber: number,
    isApproved: boolean | null | undefined,
    remarks: string | null | undefined,
    personnel: any,
  ) => {
    if (currentStage <= stageNumber && !viewOnly) return null;
    if (isApproved === null || isApproved === undefined) return null;

    const statusConfig = isApproved
      ? {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          label: "Approved by:",
        }
      : {
          bg: "bg-rose-50",
          border: "border-rose-200",
          label: "Disapproved by:",
        };

    return (
      <div
        className={`${statusConfig.bg} ${statusConfig.border} p-3 rounded-lg border mt-2 text-[12px] shadow-sm`}
      >
        {/* Existing Header */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {statusConfig.label}{" "}
            <b className="text-[11px] text-gray-600">
              {nameFormat(personnel) || "System Administrator"}
            </b>
          </span>
          <Tag
            color={isApproved ? "success" : "error"}
            className="text-[10px] m-0 px-1 font-bold"
          >
            {isApproved ? "APPROVED" : "DISAPPROVED"}
          </Tag>
        </div>

        {/* Original Admin Remarks */}
        <div className="bg-white/50 p-2 rounded border-l-2 border-slate-300 italic text-slate-600 mb-3">
          "{remarks || "No remarks provided."}"
        </div>

        {activityAppeal[stageNumber - 1]?.remarks && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-1 rounded-full bg-indigo-400"></div>
              <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">
                Personnel Appeal
              </span>
            </div>
            <div className="bg-indigo-50/40 border border-indigo-100/50 p-2 rounded-lg text-slate-700 text-[11px] leading-relaxed">
              <span className="font-medium text-indigo-900/70">Reason: </span>
              {activityAppeal[stageNumber - 1]?.remarks}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStepStatus = (
    stageNumber: number,
    isApproved: boolean | null | undefined,
  ) => {
    if (currentStage === stageNumber && !viewOnly) return "process";
    if (currentStage < stageNumber && !viewOnly) return "wait";
    return isApproved === false ? "error" : "finish";
  };
  const isOfficer = personnelType === "Officer";

  const dynamicItems: any[] = useMemo(() => {
    return workflowSteps
      .filter((step) => step.rankCategory?.name === personnelType)
      .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))
      .map((step) => {
        const stepNumber = step.stepNumber ?? 0;

        // Get data from DTO based on the mapping logic
        const stageInfo = getStageData(stepNumber, isOfficer);
        const role = roles.find((r) => r.roleId === step.roleId);

        return {
          title: role?.roleName || "Reviewer",
          subTitle: `Step ${stepNumber}`,
          status: getStepStatus(stepNumber, stageInfo?.isApprove),
          description:
            currentStage === stepNumber && !viewOnly ? (
              <Text type="secondary" className="text-[11px] italic mt-2 block">
                Awaiting review...
              </Text>
            ) : (
              renderStageDetail(
                stepNumber,
                stageInfo?.isApprove,
                stageInfo?.remarks,
                stageInfo?.approver,
              )
            ),
        };
      });
  }, [
    workflowSteps,
    roles,
    personnelType,
    currentStage,
    approvalData,
    viewOnly,
  ]);

  if (loadingSteps || loadingRoles) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }
  return (
    <div className="pl-4 h-full">
      <Title level={5} className="mb-6 flex items-center gap-2">
        <span className="w-2 h-5 bg-blue-500 rounded-full inline-block"></span>
        Approval Trail
      </Title>
      {dynamicItems.length > 0 ? (
        <Steps
          direction="vertical"
          size="small"
          current={isOfficer ? currentStage - 4 : currentStage - 1}
          items={dynamicItems}
        />
      ) : (
        <Text type="secondary">
          No workflow steps configured for {personnelType}.
        </Text>
      )}
    </div>
  );
};

export default ApprovalTrail;
