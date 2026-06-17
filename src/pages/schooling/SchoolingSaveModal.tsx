import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Modal,
  Select,
  Typography,
  Spin,
  type FormInstance,
} from "antd";
// ... (other imports)
import dayService from "../../services/dayService"; // Import the new service
import DateRangeComponent from "../../componets/DateRangeComponent";
import PersonnelSelectComponent from "../../componets/PersonnelSelectComponent";
import personnelActivityService from "../../services/personnelActivityService";
import dayjs from "dayjs";
import type { PersonnelActivity } from "../../@types/PersonnelActivity";
import personelService from "../../services/personelService";
import { useQuery } from "@tanstack/react-query";
import activityTypeService from "../../services/activityTypeService";
import { emptyValues } from "./SchoolingIndex";
import { formatDaysToYMD } from "../../utils/formatDaysToYMD";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type SaveModalProps = {
  form: FormInstance<PersonnelActivity>;
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedActivity: PersonnelActivity | null;
  isModalVisible: boolean;
  onAfterSave: () => void;
};
export default function SchoolingSaveModal({
  form,
  selectedActivity,
  isModalVisible,
  setIsModalVisible,
  onAfterSave,
}: SaveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [serverDays, setServerDays] = useState<number>(0);

  const startDate = Form.useWatch("startDate", form);
  const endDate = Form.useWatch("endDate", form);
  const activityTypeId = Form.useWatch("activityTypeId", form);
  const personnelId = Form.useWatch("personnelId", form);

  // 1. Fetch Activity Types
  const { data: activityTypes } = useQuery({
    queryKey: ["schoolingType", isModalVisible],
    queryFn: async () => {
      const types = await activityTypeService.getAll();
      const type = types.find((t) => t.activityTypeName == "SCHOOLING");
      form.setFieldValue("activityTypeId", type?.activityTypeId);
      return types?.filter((t) => t.activityTypeName == "SCHOOLING");
    },
    initialData: [],
  });

  // 2. Identify if the selected type is Mandatory
  const selectedTypeObj = useMemo(
    () => activityTypes.find((t) => t.activityTypeId === activityTypeId),
    [activityTypes, activityTypeId],
  );

  // 3. EFFECT: Call the API to compute days exactly like the backend
  useEffect(() => {
    const fetchDays = async () => {
      if (startDate && endDate) {
        setIsCalculating(true);
        try {
          // Use .startOf('day') to avoid hours/minutes causing logic errors
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

  const handleOk = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      const payload: PersonnelActivity = {
        ...selectedActivity,
        ...values,
        endDate: dayjs(values.endDate)?.format("YYYY-MM-DD"),
        startDate: dayjs(values.startDate)?.format("YYYY-MM-DD"),
        days: serverDays, // Send the server-calculated value
      };

      if (selectedActivity?.personnelActivityId) {
        await personnelActivityService.update({
          ...payload,
          personnelActivityId: selectedActivity.personnelActivityId,
        });
      } else {
        await personnelActivityService.insertSchooling(payload);
      }

      setIsModalVisible(false);
      onAfterSave();
    } catch (err) {
      console.log("Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => setIsModalVisible(false);

  return (
    <Modal
      title={selectedActivity ? "Edit Leave" : "Schooling"}
      open={isModalVisible}
      onOk={handleOk}
      okText={selectedActivity ? "Update" : "Submit"}
      onCancel={handleClose}
      okButtonProps={{
        loading: isSubmitting,
        disabled: isCalculating || calculation.balanceAfter! < 0,
      }}
      destroyOnClose
      width={600}
    >
      <Form
        form={form}
        initialValues={selectedActivity || emptyValues}
        layout="vertical"
      >
        <PersonnelSelectComponent name="personnelId" label="Personnel" />

        <Form.Item
          hidden
          name="activityTypeId"
          label="Type"
          rules={[{ required: true, message: "Please select activity type" }]}
        >
          <Select
            placeholder="Select Activity Type"
            disabled
            allowClear
            value={activityTypes?.[0]?.activityTypeId}
          >
            {activityTypes.map((a) => (
              <Option key={a.activityTypeId} value={a.activityTypeId}>
                {a.activityTypeName}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="title" label="Course Title">
          <Input />
        </Form.Item>
        <DateRangeComponent form={form} />

        {/* 6. Display Server-Calculated Credits */}
        {startDate && endDate && (
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <Spin spinning={isCalculating}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>Days Requested:</Text>
                <Text strong>{formatDaysToYMD(serverDays)} </Text>
              </div>
            </Spin>
          </div>
        )}
        <Form.Item name="remarks" label="Remarks">
          <TextArea />
        </Form.Item>
      </Form>
    </Modal>
  );
}
