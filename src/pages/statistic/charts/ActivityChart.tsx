import { useState, useRef } from "react";
import { Bar } from "@ant-design/charts";
import { Table, Card, Button, Modal } from "antd";
import { useQuery } from "@tanstack/react-query";
import dashboardService from "../../../services/dashboardService";
import type { ActivityData } from "../../../@types/dashboardGraphs/ActivityData";
import { convertUtcToPhDateShort } from "../../../utils/convertUtcToPhDateShort";
import nameFormat from "../../../utils/nameFormat";

// Excel libraries
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// PDF libraries
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ActivityChartViewContent from "./ActivityChartViewContent";
import getRandomColor from "../../../utils/getRandomColor";

type ActivityChartProps = {
  showChart?: boolean;
};
export default function ActivityChart({
  showChart = true,
}: ActivityChartProps) {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  const { data: activityData } = useQuery({
    queryKey: ["activityData"],
    queryFn: async () => await dashboardService.getPersonnelByActivityType(),
    initialData: [],
  });

  const config = {
    data: activityData,
    xField: "activity",
    yField: "personnel",
    columnWidthRatio: 0.6,
    color: "#5B8FF9",
    height: 300,
  };

  const columns = [
    { title: "Activity", dataIndex: "activity", key: "activity" },
    { title: "Personnel", dataIndex: "personnel", key: "personnel" },
  ];

  // ----------------- Excel Export -----------------
  const handleExportExcel = () => {
    const excelData: any[] = [];
    activityData.forEach((activity) => {
      activity.info.forEach((info) => {
        excelData.push({
          Activity: activity.activity,
          Personnel: nameFormat(info.name),
          Title: info.title ?? "",
          StartDate: info.startDate
            ? convertUtcToPhDateShort(info.startDate)
            : "",
          EndDate: info.endDate ? convertUtcToPhDateShort(info.endDate) : "",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Data");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "ActivityData.xlsx");
  };

  // ----------------- PDF Export -----------------
  const handleExportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;

    doc.setFontSize(18);
    doc.setTextColor("#5B8FF9");
    doc.text("Personnel by Activity Report", 40, y);
    y += 30;

    activityData.forEach((activity) => {
      // Activity Header
      doc.setFontSize(14);
      doc.setTextColor("#5B8FF9");
      doc.text(`${activity.activity} (${activity.personnel})`, 40, y);
      y += 10;

      // Table body
      const body = activity.info.map((info, i) => [
        i + 1,
        nameFormat(info.name),
        info.title ?? "",
        info.startDate ? convertUtcToPhDateShort(info.startDate) : "",
        info.endDate ? convertUtcToPhDateShort(info.endDate) : "",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Personnel", "Title", "Start Date", "End Date"]],
        body,
        theme: "grid",
        headStyles: { fillColor: [91, 143, 249] },
        styles: { fontSize: 10 },
        margin: { left: 40, right: 40 },
        tableWidth: "auto",
        didDrawPage: (data) => {
          y = (data?.cursor?.y ?? 0) + 20;
        },
      });

      // Add page if needed
      if (y > doc.internal.pageSize.height - 100) {
        doc.addPage();
        y = 40;
      }
    });

    doc.save("ActivityData.pdf");
  };

  // ----------------- Print -----------------
  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=900,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Personnel by Activity Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #5B8FF9; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; }
            table, th, td { border: 1px solid black; }
            th, td { padding: 8px; text-align: left; }
            h2 { color: #5B8FF9; }
          </style>
        </head>
        <body>
          <h1>Personnel by Activity Report</h1>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const total = activityData.reduce((prev, curr) => prev + curr.personnel, 0);

  return (
    <Card
      title={
        <div className="py-3">
          <div className="flex justify-between">
            Personnel by Activity Type ({total})
            <Button type="primary" onClick={() => setModalVisible(true)}>
              View All
            </Button>
          </div>
          <Button style={{ marginRight: 8 }} onClick={handlePrint}>
            Print
          </Button>
          <Button style={{ marginRight: 8 }} onClick={handleExportExcel}>
            Export to Excel
          </Button>
          <Button
            type="primary"
            style={{ marginRight: 8 }}
            onClick={handleExportPDF}
          >
            Export to PDF
          </Button>
        </div>
      }
    >
      {showChart && <Bar {...config} />}

      <Table<ActivityData>
        size="small"
        columns={columns}
        dataSource={activityData}
        pagination={false}
        rowKey={(record) => record.activity}
        style={{ marginTop: 20 }}
        onRow={(record, index) => {
          const isOnDuty = record.activity?.trim().toLowerCase() === "on duty";

          return {
            className: "custom-row-colored",
            style: {
              backgroundColor: isOnDuty ? "#ffffff" : getRandomColor(index),
            },
          };
        }}
      />

      <Modal
        title={<div>Personnel by Activity ({total}) </div>}
        onCancel={() => setModalVisible(false)}
        open={modalVisible}
        footer={null}
        width={1500}
      >
        <ActivityChartViewContent />
      </Modal>
    </Card>
  );
}
