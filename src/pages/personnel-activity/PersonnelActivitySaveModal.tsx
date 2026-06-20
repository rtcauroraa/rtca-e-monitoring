import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Select,
  Typography,
  Alert,
  Spin,
  type FormInstance,
  type ModalProps,
} from "antd";
import dayService from "../../services/dayService";
import DateRangeComponent from "../../componets/DateRangeComponent";
import PersonnelSelectComponent from "../../componets/PersonnelSelectComponent";
import personnelActivityService from "../../services/personnelActivityService";
import dayjs from "dayjs";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import personelService from "../../services/personelService";
import { useQuery } from "@tanstack/react-query";
import activityTypeService from "../../services/activityTypeService";
import { emptyValues } from "./PersonnelActivityIndex";
import type { AxiosError } from "axios";
import { formatDateToMilitary } from "../../utils/formatDateToMilitary";
import type { ActivityType } from "../../@types/ActivityType";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type SaveModalProps = {
  form: FormInstance<PersonnelActivity>;
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedActivity: PersonnelActivity | null;
  isModalVisible: boolean;
  onAfterSave?: () => void;
  modalProps: ModalProps;
  activityTypes?: ActivityType[];
};
const STATUS_DESCRIPTIONS: Record<string, string> = {
  "Pending Approval": "is currently pending approval for another request",
  Scheduled: "is already scheduled for an assignment",
  Ongoing: "has an ongoing activity running",
  Suspended: "is under suspension status during this timeframe",
  Inactive: "is marked as inactive during these dates",
  Appeal: "has a pending schedule appeal",
  Declined: "had an assignment conflict (declined status)",
};

export default function PersonnelActivitySaveModal({
  form,
  selectedActivity,
  isModalVisible,
  setIsModalVisible,
  onAfterSave,
  modalProps,
  activityTypes,
}: SaveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [serverDays, setServerDays] = useState<number>(0);
  const [overlapError, setOverlapError] = useState<
    PersonnelActivity | null | undefined
  >(null);

  const startDate = Form.useWatch("startDate", form);
  const endDate = Form.useWatch("endDate", form);
  const activityTypeId = Form.useWatch("activityTypeId", form);
  const personnelId = Form.useWatch("personnelId", form);

  // 1. Fetch Activity Types
  const { data: fetchedActivities } = useQuery({
    queryKey: ["activityTypes", activityTypes],
    queryFn: async () => {
      if (activityTypes) return activityTypes;
      const types = await activityTypeService.getAll();
      return types?.filter(
        (t) =>
          t.activityTypeName != "SCHOOLING" &&
          t.activityTypeName != "RESTRICTED",
      );
    },
    initialData: [],
  });

  // 2. Identify if the selected type is Mandatory
  const selectedTypeObj = useMemo(
    () => fetchedActivities.find((t) => t.activityTypeId === activityTypeId),
    [fetchedActivities, activityTypeId],
  );

  // 3. EFFECT: Call the API to compute days exactly like the backend
  useEffect(() => {
    const fetchDays = async () => {
      if (startDate && endDate) {
        setIsCalculating(true);
        try {
          const formattedStart = dayjs(startDate)
            .startOf("day")
            .format("YYYY-MM-DD");
          const formattedEnd = dayjs(endDate)
            .startOf("day")
            .format("YYYY-MM-DD");

          const days = await dayService.computeDays(
            formattedStart,
            formattedEnd,
            selectedTypeObj?.isMandatoryLeave ?? false,
            selectedTypeObj?.activityTypeId == 6,
          );
          setServerDays(days);
        } catch (err) {
          console.error("Calculation error", err);
        } finally {
          setIsCalculating(false);
        }
      } else {
        setServerDays(0);
      }
    };

    fetchDays();
  }, [startDate, endDate, selectedTypeObj]);

  // 4. Fetch Credits
  const { data: creditsData } = useQuery({
    queryKey: ["personnelCredits", personnelId, activityTypeId, startDate],
    queryFn: () =>
      personelService.getPersonnelCredits(
        personnelId,
        dayjs().year(),
        activityTypeId,
        startDate,
      ),
    enabled: !!personnelId && !!activityTypeId,
  });

  // 5. Final Calculation for Display
  const calculation = useMemo(() => {
    const currentCredit = creditsData?.find(
      (c) => c.activityTypeId === activityTypeId,
    );
    let remaining = currentCredit?.remainingCredits ?? 0;

    // Refund logic for editing
    if (
      selectedActivity &&
      selectedActivity.personnelActivityId &&
      selectedActivity.activityTypeId === activityTypeId
    ) {
      remaining += selectedActivity.days ?? 0;
    }

    return {
      daysPicked: serverDays,
      balanceAfter: remaining - serverDays,
      totalAvailable: remaining,
    };
  }, [serverDays, creditsData, activityTypeId, selectedActivity]);

  const handleOverlap = async () => {
    // Grab the current input states silently (without showing red UI required errors)
    const values = form.getFieldsValue();

    if (values.personnelId && values.startDate && values.endDate) {
      try {
        const payload: PersonnelActivity = {
          ...values,
          endDate: dayjs(values.endDate)?.format("YYYY-MM-DD"),
          startDate: dayjs(values.startDate)?.format("YYYY-MM-DD"),
          personnelActivityId:
            selectedActivity?.personnelActivityId ?? undefined,
        };

        const res = await personnelActivityService.checkOverlap(payload);

        // If HTTP 200 OK falls through here
        if (res.data && !res.data.hasOverlap) {
          setOverlapError(null);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{
          hasOverlap?: boolean;
          message?: string;
          activity?: PersonnelActivity;
        }>;

        // Catch HTTP 400 BadRequest details sent from the controller
        if (axiosError.response?.data?.hasOverlap) {
          setOverlapError(axiosError.response.data.activity);
        } else {
          console.error("System pipeline execution error:", err);
        }
      }
    } else {
      setOverlapError(null);
    }
  };
  const handleOk = async () => {
    try {
      setIsSubmitting(true);
      setOverlapError(null);

      const values = await form.validateFields();

      const payload: PersonnelActivity = {
        ...values,
        status: "Pending Approval",
        endDate: dayjs(values.endDate)?.format("YYYY-MM-DD"),
        startDate: dayjs(values.startDate)?.format("YYYY-MM-DD"),
        days: serverDays,
        personnelActivityId: selectedActivity?.personnelActivityId ?? undefined,
      };

      if (selectedActivity?.personnelActivityId) {
        await personnelActivityService.update({
          ...payload,
          personnelActivityId: selectedActivity.personnelActivityId,
        });
      } else {
        await personnelActivityService.add(payload);
      }

      setIsModalVisible(false);
      onAfterSave && onAfterSave();
    } catch (err) {
      console.log("Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOverlapError(null);
    setIsModalVisible(false);
  };
  const computedAlertMessage = useMemo(() => {
    if (!overlapError) return "";

    const statusText = overlapError.status
      ? STATUS_DESCRIPTIONS[overlapError.status] ||
        `is marked as '${overlapError.status}'`
      : "has a conflict";
    const rawTypeName = overlapError.activityType?.activityTypeName;

    const titleLabel = overlapError.title ? ` for '${overlapError.title}'` : "";

    const start = overlapError.startDate
      ? formatDateToMilitary(overlapError.startDate)
      : "";
    const end = overlapError.endDate
      ? formatDateToMilitary(overlapError.endDate)
      : "";
    const rangeLabel =
      start && end ? ` from ${start} to ${end}` : " during this timeframe";

    return `${rawTypeName} Conflict: ${statusText}${titleLabel}${rangeLabel}.`;
  }, [overlapError]);

  return (
    <Modal
      title={selectedActivity ? "Edit Leave" : "Request Leave"}
      open={isModalVisible}
      onOk={handleOk}
      okText={selectedActivity ? "Update" : "Submit"}
      onCancel={handleClose}
      okButtonProps={{
        loading: isSubmitting,
        disabled:
          isCalculating || calculation.balanceAfter! < 0 || !!overlapError,
      }}
      destroyOnClose
      width={600}
      {...modalProps}
    >
      <Form
        form={form}
        initialValues={selectedActivity || emptyValues}
        layout="vertical"
        // Intercept inline value changes instantly to clear conflicts when inputs switch
        onValuesChange={(changedValues) => {
          if (
            "startDate" in changedValues ||
            "endDate" in changedValues ||
            "personnelId" in changedValues
          ) {
            setOverlapError(null);
          }
        }}
      >
        <PersonnelSelectComponent
          name="personnelId"
          label="Personnel"
          onChange={() => handleOverlap()}
        />

        <Form.Item
          name="activityTypeId"
          label="Type"
          rules={[{ required: true, message: "Please select activity type" }]}
        >
          <Select placeholder="Select Activity Type" allowClear>
            {fetchedActivities.map((a) => (
              <Option key={a.activityTypeId} value={a.activityTypeId}>
                {a.activityTypeName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <DateRangeComponent
          form={form}
          onChangeEnd={() => handleOverlap()}
          onChangeStart={() => handleOverlap()}
        />

        {/* Display Server-Calculated Credits & Active Warnings */}
        {((startDate && endDate) || overlapError) && (
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            {overlapError && (
              <Alert
                message="Schedule Conflict Detected"
                description={computedAlertMessage}
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}

            {!overlapError && startDate && endDate && (
              <Spin spinning={isCalculating}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text>Days Requested:</Text>
                  <Text strong>{serverDays} Day(s)</Text>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text>Available Credits:</Text>
                  <Text strong style={{ color: "#1677ff" }}>
                    {calculation.totalAvailable} Day(s)
                  </Text>
                </div>
                <hr
                  style={{ border: "0.5px solid #e2e8f0", margin: "8px 0" }}
                />
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text>
                    <b>Remaining After:</b>
                  </Text>
                  <Text
                    strong
                    type={calculation.balanceAfter! < 0 ? "danger" : "success"}
                  >
                    {calculation.balanceAfter} Day(s)
                  </Text>
                </div>

                {calculation.balanceAfter! < 0 && (
                  <Alert
                    message="Insufficient Credits"
                    description="You do not have enough leave credits for this request."
                    type="error"
                    showIcon
                    style={{ marginTop: 12 }}
                  />
                )}
              </Spin>
            )}
          </div>
        )}

        <Form.Item name="title" label="Title">
          <Input placeholder="Enter title (e.g., Summer Vacation)" />
        </Form.Item>

        <Form.Item name="reason" label="Reason for Action">
          <TextArea rows={4} placeholder="State your reason here..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
