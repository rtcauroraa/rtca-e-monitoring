import { Tag } from "antd";

// Using a mapping object is cleaner and easier to maintain than if/else
const STATUS_COLORS: Record<string, string> = {
  Ongoing: "processing", // Blue (indicates active work)
  Approved: "success", // Green (completed/positive)
  Upcoming: "cyan", // Cyan (fresh, scheduled for future)
  Scheduled: "gold", // Distinct blue-purple for planned events
  "Pending Approval": "warning", // Gold/Orange (needs attention)
  Suspended: "error", // Red (stopped)
  Declined: "error", // Red (rejected)
  Inactive: "default", // Grey (past/finished)
};

export default function StatusTag({ status }: { status: string }) {
  // Fallback to 'default' (grey) if status isn't found in our map
  const color = STATUS_COLORS[status] || "default";

  return (
    <Tag color={color} style={{ fontWeight: 500 }}>
      {status ? status.toUpperCase() : "N/A"}
    </Tag>
  );
}
