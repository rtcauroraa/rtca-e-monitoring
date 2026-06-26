import React, { useState } from "react";
import {
  Input,
  Modal,
  Button,
  Popconfirm,
  Image,
  Divider,
  Tag,
  Typography,
  Space,
  Flex,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import imageUtility from "../../utils/imageUtility";
import nameFormat from "../../utils/nameFormat";
import { formatDateToMilitary } from "../../utils/formatDateToMilitary";
import ApprovalTrail from "./ApprovalTrail";
import approvalProccessService from "../../services/approvalProccessService";
import workflowStepsService from "../../services/workflowStepsService";
import { useQuery } from "@tanstack/react-query";
import activityAppealService from "../../services/activityAppealService";

const { TextArea } = Input;
const { Text, Title } = Typography;

export type ApprovalStage = 1 | 2 | 3 | 4;

type SaveModalProps = {
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedActivity: PersonnelActivity | null;
  isModalVisible: boolean;
  onAfterSave: () => void;
  viewOnly?: boolean;
};

export default function ApprovalModal({
  selectedActivity,
  isModalVisible,
  setIsModalVisible,
  onAfterSave,
  viewOnly,
}: SaveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>("");

  const { data: steps = [] } = useQuery({
    queryKey: ["steps"],
    queryFn: workflowStepsService.getAll,
  });

  const { data: activityAppeal } = useQuery({
    queryKey: ["activityAppeal", selectedActivity?.personnelActivityId],
    queryFn: async () =>
      await activityAppealService.getAll({
        personnelActivityId: selectedActivity?.personnelActivityId,
      }),
    initialData: [],
  });

  const RANK_CATEGORY = {
    OFFICER: 1,
    NON_OFFICER: 2,
  };

  const getWorkStepName = (
    stepNumber: number,
    rankCategoryId: number,
  ): string => {
    if (!steps) return "Loading...";

    const step = steps.find(
      (w) => w.stepNumber === stepNumber && w.rankCategoryId === rankCategoryId,
    );

    return step?.role?.roleName ?? "Review";
  };

  const getStageUI = (stage: number, rankCategoryId: number) => {
    const label = getWorkStepName(stage, rankCategoryId);

    const configs: Record<number, any> = {
      1: {
        label,
        icon: <InfoCircleOutlined />,
        color: "#1890ff",
        secondary: "Recommendation",
      },
      2: {
        label,
        icon: <StarOutlined />,
        color: "#722ed1",
        secondary: "Approval",
      },
      3: {
        label,
        icon: <SafetyCertificateOutlined />,
        color: "#fa8c16",
        secondary: "Clearance",
      },
      4: {
        label,
        icon: <TrophyOutlined />,
        color: "#cf1322",
        secondary: "Final Approval",
      },
    };

    return (
      configs[stage] ?? {
        label: "Review",
        icon: <InfoCircleOutlined />,
        color: "#1890ff",
        secondary: "Action",
      }
    );
  };

  const currentStage: number =
    selectedActivity?.approvalProccess?.currentStage ?? 1;
  const personnelType = selectedActivity?.personnel?.rank?.rankCategory?.name;
  const stageUI =
    personnelType == "Officer"
      ? getStageUI(currentStage - 2, RANK_CATEGORY.OFFICER)
      : getStageUI(currentStage, RANK_CATEGORY.NON_OFFICER);

  const handleAction = async (isApprove: boolean) => {
    try {
      setIsSubmitting(true);
      const id = selectedActivity?.approvalProccess?.id;
      if (currentStage == 1) {
        await approvalProccessService.updateStageOne({
          id,
          stageOneIsApprove: isApprove,
          stageOneRemarks: remarks,
        });
      } else if (currentStage == 2) {
        await approvalProccessService.updateStageTwo({
          id,
          stageTwoIsApprove: isApprove,
          stageTwoRemarks: remarks,
        });
      } else if (currentStage == 3) {
        await approvalProccessService.updateStageThree({
          id,
          stageThreeIsApprove: isApprove,
          stageThreeRemarks: remarks,
        });
      } else {
        await approvalProccessService.updateFinalStage(
          {
            id,
            stageFourIsApprove: isApprove,
            stageFourRemarks: remarks,
          },
          selectedActivity?.personnelActivityId ?? 0,
        );
      }
      setIsModalVisible(false);
      onAfterSave();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stage = personnelType == "Officer" ? currentStage - 2 : currentStage;

  return (
    <Modal
      title={
        <Space className="max-w-full overflow-hidden">
          <span style={{ color: stageUI.color }}>{stageUI.icon}</span>
          <span className="font-bold text-[14px] sm:text-[16px] break-words">
            Stage {stage}: {stageUI.label} {stageUI.secondary}
          </span>
        </Space>
      }
      open={isModalVisible}
      onCancel={() => setIsModalVisible(false)}
      width="100%"
      style={{ maxWidth: "1200px", top: 20 }}
      centered
      destroyOnClose
      footer={null}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Flow Trail */}
        <div className="lg:border-r lg:border-slate-100 lg:pr-4">
          <ApprovalTrail
            currentStage={currentStage}
            activity={selectedActivity}
            viewOnly={viewOnly}
          />
        </div>

        {/* Right Column: Main Form Area */}
        <div className="flex flex-col gap-5 py-2 col-span-1 lg:col-span-2">
          {/* --- HEADER: PERSONNEL INFO --- */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
              <div className="flex-shrink-0">
                <Image
                  width={100}
                  height={100}
                  className="rounded-lg border-2 border-white shadow-md object-cover"
                  src={imageUtility.getProfile(
                    selectedActivity?.personnel?.profile,
                  )}
                  fallback="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                />
              </div>

              <div className="flex-1 w-full">
                <div className="mb-3">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Applicant Details
                  </Text>
                  <Title
                    level={4}
                    style={{ margin: 0 }}
                    className="text-[18px] sm:text-[20px] break-words"
                  >
                    {nameFormat(selectedActivity?.personnel)}
                  </Title>
                  <Tag color="blue" className="mt-1 font-semibold uppercase">
                    {selectedActivity?.personnel?.employmentStatus || "Active"}
                  </Tag>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <Text
                      type="secondary"
                      className="text-[10px] uppercase font-bold block"
                    >
                      Activity Type
                    </Text>
                    <Text strong className="text-slate-700">
                      {selectedActivity?.activityType?.activityTypeName ||
                        "N/A"}
                    </Text>
                  </div>
                  <div>
                    <Text
                      type="secondary"
                      className="text-[10px] uppercase font-bold block"
                    >
                      Duration
                    </Text>
                    <Text strong className="text-blue-600 block text-[13px]">
                      {formatDateToMilitary(selectedActivity?.startDate)} —{" "}
                      {formatDateToMilitary(selectedActivity?.endDate)}
                    </Text>
                  </div>
                  <div>
                    <Text
                      type="secondary"
                      className="text-[10px] uppercase font-bold block"
                    >
                      Total Days
                    </Text>
                    <Text strong className="text-slate-700">
                      {selectedActivity?.days || 0} Days
                    </Text>
                  </div>
                  <div>
                    <Text
                      type="secondary"
                      className="text-[10px] uppercase font-bold block"
                    >
                      Status
                    </Text>
                    <Tag
                      color="blue"
                      className="mt-0.5 font-semibold uppercase"
                    >
                      {selectedActivity?.status}
                    </Tag>
                  </div>
                  <div className="md:col-span-2">
                    <Text
                      type="secondary"
                      className="text-[10px] uppercase font-bold block"
                    >
                      Primary Department
                    </Text>
                    <Tag
                      color="green"
                      className="mt-0.5 font-semibold uppercase max-w-full truncate"
                    >
                      {selectedActivity?.personnel?.department?.departmentName}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- TITLE & REASON --- */}
          <div className="flex flex-col gap-4">
            <div>
              <Text
                type="secondary"
                className="text-[10px] uppercase font-bold block mb-1"
              >
                Activity Title
              </Text>
              <div className="text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-3 break-words">
                {selectedActivity?.title || "No Title Provided"}
              </div>
            </div>

            <div>
              <Text
                type="secondary"
                className="text-[10px] uppercase font-bold block mb-1"
              >
                Personnel Reason
              </Text>
              <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-4 text-slate-700 text-[13px] whitespace-pre-line italic break-words">
                {selectedActivity?.reason || "N/A"}
              </div>
            </div>

            {selectedActivity?.status === "Appeal" &&
              activityAppeal[stage - 2]?.remarks && (
                <div>
                  <Text
                    type="warning"
                    className="text-[10px] uppercase font-bold block mb-1"
                  >
                    Appeal Remarks
                  </Text>
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 text-slate-700 text-[13px] whitespace-pre-line italic shadow-sm break-words">
                    {activityAppeal[stage - 2]?.remarks || "N/A"}
                  </div>
                </div>
              )}
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* --- DYNAMIC REMARKS --- */}
          {!viewOnly && (
            <div className="w-full">
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-2">
                {stageUI.label} Remarks / Basis for Action{" "}
                <Text type="danger">*</Text>
              </label>
              <TextArea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder={`Enter your ${stageUI.label} review notes here...`}
                showCount
                maxLength={2000}
                className="rounded-lg border-slate-300 w-full"
              />
            </div>
          )}

          {/* --- ACTION BUTTONS --- */}
          {!viewOnly && (
            <div className="mt-4 pt-2 border-t border-slate-100">
              <Flex gap="small" justify="end" wrap="wrap" className="w-full">
                <Button
                  key="cancel"
                  onClick={() => setIsModalVisible(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-3 sm:order-1"
                >
                  Cancel
                </Button>

                <Popconfirm
                  key="decline"
                  title={`Disapprove as ${stageUI.label}?`}
                  description="This will notify the personnel via email."
                  onConfirm={() => handleAction(false)}
                  okText="Yes, Decline"
                  okButtonProps={{ danger: true, loading: isSubmitting }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={isSubmitting}
                    className="w-full sm:w-auto order-2"
                  >
                    Disapprove
                  </Button>
                </Popconfirm>

                <Popconfirm
                  key="approve"
                  title={
                    currentStage === 4
                      ? "Submit Final Approval?"
                      : "Approve and forward to next stage?"
                  }
                  onConfirm={() => handleAction(true)}
                  okText={
                    currentStage === 4 ? "Yes, Final Approval" : "Yes, Approve"
                  }
                  okButtonProps={{ loading: isSubmitting }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={isSubmitting}
                    style={{
                      backgroundColor: stageUI.color,
                      borderColor: stageUI.color,
                    }}
                    className="w-full sm:w-auto order-1 sm:order-3"
                  >
                    {currentStage === 4
                      ? "Final Approval"
                      : "Approve & Forward"}
                  </Button>
                </Popconfirm>
              </Flex>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
