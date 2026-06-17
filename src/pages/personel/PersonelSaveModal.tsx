import {
  Form,
  Input,
  Modal,
  Select,
  DatePicker,
  Upload,
  message,
  Avatar,
} from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { Personnel } from "../../@types/Personnel";
import rankService from "../../services/rankService";
import departmentService from "../../services/departmentService";
import { useQuery } from "@tanstack/react-query";
import personnelService from "../../services/personelService";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { type PersonnelForm } from "./PersonelIndex";
import imageUtility from "../../utils/imageUtility";

type SaveModalProps = {
  form: FormInstance<PersonnelForm>;
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPersonnel: Personnel | null;
  isModalVisible: boolean;
  onAfterSave: () => void;
};

export default function PersonnelSaveModal({
  form,
  selectedPersonnel,
  isModalVisible,
  setIsModalVisible,
  onAfterSave,
}: SaveModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: ranks } = useQuery({
    queryKey: ["ranks"],
    queryFn: async () => await rankService.getAll(),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => await departmentService.getAll(),
  });

  const [casing, setCasing] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (selectedPersonnel) {
      setPreview(imageUtility.getProfile(selectedPersonnel.profile) ?? "");
      form.setFieldsValue({
        ...selectedPersonnel,
        dateEnlisted: selectedPersonnel.dateEnlisted
          ? dayjs(selectedPersonnel.dateEnlisted)
          : null,
        dateEnteredService: selectedPersonnel.dateEnteredService
          ? dayjs(selectedPersonnel.dateEnteredService)
          : null,
        dateOfLastPromotion: selectedPersonnel.dateOfLastPromotion
          ? dayjs(selectedPersonnel.dateOfLastPromotion)
          : null,
      });
    } else {
      form.resetFields();
    }
  }, [selectedPersonnel]);

  const handleOk = async () => {
    setIsSubmitting(true);
    try {
      const val = await form.validateFields();
      const values: PersonnelForm = {
        ...val,
        hasAccount: selectedPersonnel?.hasAccount,
      };

      const formData = new FormData();

      (Object.keys(values) as (keyof typeof values)[]).forEach((key) => {
        const value = values[key];

        if (value === null || value === undefined) return;

        if (dayjs.isDayjs(value)) {
          formData.append(key as string, value.format("YYYY-MM-DD"));
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            formData.append(key as string, String(item));
          });
        } else {
          formData.append(key as string, String(value));
        }
      });

      // ✅ append file
      if (file) {
        formData.append("profileImage", file);
      }

      if (selectedPersonnel?.personnelId) {
        formData.append(
          "personnelId",
          selectedPersonnel.personnelId.toString(),
        );
        await personnelService.update(formData, selectedPersonnel?.personnelId);
      } else {
        await personnelService.add(formData);
      }

      setIsModalVisible(false);
      setFile(null);
      onAfterSave();
    } catch (err) {
      console.log("Validation failed:", err);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setFile(null);
  };

  return (
    <Modal
      title={selectedPersonnel ? "Edit Personnel" : "Add Personnel"}
      open={isModalVisible}
      onOk={handleOk}
      okButtonProps={{
        loading: isSubmitting,
      }}
      onCancel={handleClose}
      width={1000}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Profile">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Avatar
              shape="square"
              size={220}
              src={
                preview
                  ? preview
                  : imageUtility.getProfile(selectedPersonnel?.profile)
              }
              icon={!preview && <UserOutlined />}
            />

            {/* ✅ Upload Button */}
            <Upload
              accept="image/png, image/jpeg"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                const isImage =
                  file.type === "image/png" || file.type === "image/jpeg";

                if (!isImage) {
                  message.error("Only PNG/JPG files are allowed!");
                  return Upload.LIST_IGNORE;
                }

                setFile(file);

                // ✅ Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                  setPreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);

                return false; // prevent auto upload
              }}
            >
              <button type="button">
                <UploadOutlined /> Change
              </button>
            </Upload>
          </div>
        </Form.Item>

        <div className="grid lg:grid-cols-3 gap-2">
          <Form.Item name="rankId" label="Rank" rules={[{ required: true }]}>
            <Select
              onChange={(value) => {
                setCasing(
                  ranks?.find((r) => r.rankId == value)?.rankCategory?.casing ??
                    "",
                );
              }}
              options={ranks?.map((r) => ({
                label: r.rankCode,
                value: r.rankId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true }]}
          >
            <Input style={{ textTransform: casing }} />
          </Form.Item>

          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true }]}
          >
            <Input style={{ textTransform: casing }} />
          </Form.Item>

          <Form.Item name="middleName" label="Middle Name">
            <Input style={{ textTransform: casing }} />
          </Form.Item>

          <Form.Item name="serialNumber" label="Serial Number">
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            // rules={[
            //   { required: true },
            //   { type: "email", message: "Invalid email" },
            // ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="departmentId" label="Primary Designation">
            <Select
              placeholder="Select primary department"
              allowClear
              options={departments?.map((d) => ({
                label: d.departmentName,
                value: d.departmentId,
              }))}
            />
          </Form.Item>

          <Form.Item name="otherDepartmentIds" label="Other Designations">
            <Select
              mode="multiple"
              allowClear
              placeholder="Select all applicable departments"
              style={{ width: "100%" }}
              options={departments?.map((d) => ({
                label: d.departmentName,
                value: d.departmentId,
              }))}
            />
          </Form.Item>

          <Form.Item name="dateOfLastPromotion" label="Date Of Last Promotion">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="employmentStatus"
            label="Duty Status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
                { label: "Suspended", value: "Suspended" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="dateEnteredService"
            label="Date Entered Service"
            // required
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="dateEnlisted"
            label="Date Enlisted/Commissioned"
            required
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
