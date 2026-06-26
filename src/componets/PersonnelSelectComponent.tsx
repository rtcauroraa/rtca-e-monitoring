import { Select, Form } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react"; // Added useEffect
import personelService from "../services/personelService";
import type { Personnel } from "../@types/Personnel";
import nameFormat from "../utils/nameFormat";

const { Option } = Select;

export type PersonnelSelectProps = {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: any;
  onChange?: (value: number | null, option: any) => void;
  className?: string;
};

export default function PersonnelSelectComponent({
  name,
  label,
  required = true,
  onChange,
  defaultValue,
  className,
}: PersonnelSelectProps) {
  // Get the form instance from the context so we can update it dynamically
  const form = Form.useFormInstance();

  const { data: personnelList = [], isFetching } = useQuery({
    queryKey: ["personnelList"],
    queryFn: async () => await personelService.getAllOnly(),
  });

  // Dynamically update the form field when defaultValue finishes loading asynchronously
  useEffect(() => {
    if (form && defaultValue !== undefined) {
      form.setFieldsValue({ [name]: defaultValue });
    }
  }, [defaultValue, name, form]);

  return (
    <Form.Item
      name={name}
      label={label}
      initialValue={defaultValue} // Still kept as a fallback
      rules={
        required ? [{ required: true, message: `Please select ${label}` }] : []
      }
      className={className}
    >
      <Select
        loading={isFetching}
        showSearch
        // REMOVED: defaultValue={1} is completely gone now!
        placeholder={`Select ${label}`}
        optionFilterProp="children"
        allowClear
        onChange={onChange}
        filterOption={(input, option) =>
          (option?.children?.toString() ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
      >
        {personnelList.map((p: Personnel) => (
          <Option key={p.personnelId} value={p.personnelId}>
            {nameFormat(p)}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );
}
