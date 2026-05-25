import React, { useMemo } from 'react';
import { Table, Tag, Space, Typography, Card, Button, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import dashboardService from '../../../services/dashboardService';
import nameFormat from '../../../utils/nameFormat';

// Third-Party Data Export Tools
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Text } = Typography;

// --- Strong Color Palette ---
const getRandomColor = (index?: number) => {
  const colors = [
     "#E11D48", "#008080","#6D28D9","#D97706", 
     "#4D7C0F","#1E6091", "#C2410C", "#0891B2", "#059669", "#B45309", "#BE185D",
     "#2563EB", "#4338CA", "#C026D3", "#15803D",
    "#0284C7", "#7C3AED", "#DB2777"
  ];
  if (index || index === 0) return colors[index % colors.length];
  return colors[Math.floor(Math.random() * colors.length)];
};

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to extract individual RGB components from HEX for jsPDF
const hexToRgbArray = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return [r, g, b];
};

interface FlattenedPersonnel {
  key?: number | null;
  serialNumber?: string | null;
  fullName?: string | null;
  email?: string | null;
  rankName?: string | null;
  rankCode?: string | null;
  rankLevel?: number | null;
  groupType?: 'Officer' | 'Non-Officer' | null;
  currentActivity?: string | null;
}

export const ByColorLegend: React.FC = () => {

  const { data: personnelActivityData = [], isLoading } = useQuery({
    queryKey: ["personnelActivityData"],
    queryFn: async () => await dashboardService.getPersonnelByActivityType(),
    initialData: [],
    refetchInterval: 30000,
  });

  // Computes color mapping AND aggregates real-time headcounts per activity
  const activityMetrics = useMemo(() => {
    const metrics: Record<string, { color: string; count: number }> = {};

    personnelActivityData?.forEach((group, index) => {
      if (group?.activity) {
        const normalizedKey = group.activity.toUpperCase();
        const personnelCount = group?.info?.length || 0;

        if (metrics[normalizedKey]) {
          metrics[normalizedKey].count += personnelCount;
        } else {
          let assignedColor = getRandomColor(index);
          if (normalizedKey === "RESTRICTED") {
            assignedColor = '#E11D48';
          }
          metrics[normalizedKey] = {
            color: assignedColor,
            count: personnelCount
          };
        }
      }
    });
    return metrics;
  }, [personnelActivityData]);

  const processedGroups = useMemo(() => {
    const officers: FlattenedPersonnel[] = [];
    const nonOfficers: FlattenedPersonnel[] = [];

    personnelActivityData?.forEach((group) => {
      group?.info?.forEach((item) => {
        const p = item?.name;
        if (!p) return;

        const fullName = nameFormat(p);

        let groupType: 'Officer' | 'Non-Officer' = p?.rank?.rankCategoryId === 1 ? 'Officer' : 'Non-Officer';
        const priorityActivity = p?.personnelActivities?.find(a => a.isFullyApproved && a?.personnel?.rank?.rankCategory?.name);

        if (priorityActivity?.personnel?.rank?.rankCategory?.name) {
          const typeCheck = priorityActivity.personnel.rank.rankCategory.name;
          if (typeCheck === 'Officer' || typeCheck === 'Non-Officer') {
            groupType = typeCheck;
          }
        }

        const data: FlattenedPersonnel = {
          key: p.personnelId,
          serialNumber: p.serialNumber,
          fullName: fullName,
          email: p.email,
          rankName: p?.rank?.rankName,
          rankCode: p?.rank?.rankCode,
          rankLevel: p?.rank?.rankLevel,
          groupType: groupType,
          currentActivity: group.activity,
        };

        if (groupType === 'Officer') {
          officers.push(data);
        } else {
          nonOfficers.push(data);
        }
      });
    });

    const sortByRankThenSerialNumber = (a: FlattenedPersonnel, b: FlattenedPersonnel) => {
      const levelA = a?.rankLevel ?? 0;
      const levelB = b?.rankLevel ?? 0;

      if (levelA !== levelB) {
        return levelA - levelB;
      }

      const cleanA = (a?.serialNumber ?? "").replace(/\D/g, '');
      const cleanB = (b?.serialNumber ?? "").replace(/\D/g, '');

      const numA = parseInt(cleanA, 10) || 0;
      const numB = parseInt(cleanB, 10) || 0;

      return numA - numB;
    };

    return {
      Officers: officers.sort(sortByRankThenSerialNumber),
      NonOfficers: nonOfficers.sort(sortByRankThenSerialNumber)
    };
  }, [personnelActivityData]);


  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const mapToExcelData = (list: FlattenedPersonnel[]) => list.map((p, index) => ({
      "Nr.": index + 1,
      "Full Name": p.fullName ?? "N/A",
      "Rank Level": p.rankLevel ?? 0,
      "Serial Number": p.serialNumber ?? "N/A",
      "Rank Designation": p.rankName ? `${p.rankName} (${p.rankCode})` : "N/A",
      "Email Address": p.email ?? "N/A",
      "Current Status Activity": p.currentActivity?.toUpperCase() ?? "N/A"
    }));

    if (processedGroups.Officers.length > 0) {
      const officerSheet = XLSX.utils.json_to_sheet(mapToExcelData(processedGroups.Officers));
      XLSX.utils.book_append_sheet(workbook, officerSheet, "Officers Division");
    }
    if (processedGroups.NonOfficers.length > 0) {
      const nonOfficerSheet = XLSX.utils.json_to_sheet(mapToExcelData(processedGroups.NonOfficers));
      XLSX.utils.book_append_sheet(workbook, nonOfficerSheet, "Non-Officers Division");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(fileBlob, `Personnel_Ledger_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF("p", "pt", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PERSONNEL ACTIVITY SUMMARY REPORT", 40, 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 65);

    const pdfColumns = ["Nr.", "Full Name", "Status Activity"];

    // We keep a secondary lookup array aligned with our map index structure to find activity configurations in autoTable hooks
    const mapToPdfRows = (list: FlattenedPersonnel[]) => list.map((p, index) => [
      index + 1,
      p.fullName ?? "N/A",
      (p.currentActivity ?? "N/A").toUpperCase()
    ]);

    let finalY = 80;

    if (processedGroups.Officers.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`1. Officers Table (${processedGroups.Officers.length} Records)`, 40, finalY);

      autoTable(doc, {
        startY: finalY + 10,
        head: [pdfColumns],
        body: mapToPdfRows(processedGroups.Officers),
        styles: { font: "helvetica", fontSize: 9 },
        headStyles: { fillColor: [30, 96, 145], textColor: [255, 255, 255] },
        theme: "grid",

        didParseCell: (data) => {
          if (data.section === 'body') {
           
            const rowIndex = data.row.index;
            const item = processedGroups.Officers[rowIndex];
            if (item?.currentActivity) {
              const actKey = item.currentActivity.toUpperCase();
              if (actKey !== 'ON DUTY' && activityMetrics[actKey]) {
                const hexColor = activityMetrics[actKey].color;
                // Parse hex to an array config for jsPDF internal mapping
                const rgb = hexToRgbArray(hexColor);

                // Set light background (simulating the 0.45 opacity filter used on web table layout)
                data.cell.styles.fillColor = [
                  Math.round(rgb[0] + (255 - rgb[0]) * 0.55),
                  Math.round( rgb[1] + (255 - rgb[1]) * 0.55),
                  Math.round( rgb[2] + (255 - rgb[2]) * 0.55)
                ];
                data.cell.styles.textColor = [0, 0, 0]; // Keep dark font readability sharp
              }
            }
          }
        }
      });

      finalY = (doc as any).lastAutoTable.finalY + 30;
    }

    if (processedGroups.NonOfficers.length > 0) {
      if (finalY > 750) { doc.addPage(); finalY = 50; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`2. Non-Officers Table (${processedGroups.NonOfficers.length} Records)`, 40, finalY);

      autoTable(doc, {
        startY: finalY + 10,
        head: [pdfColumns],
        body: mapToPdfRows(processedGroups.NonOfficers),
        styles: { font: "helvetica", fontSize: 9 },
        headStyles: { fillColor: [0, 128, 128], textColor: [255, 255, 255] },
        theme: "grid",
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const item = processedGroups.NonOfficers[rowIndex];
            if (item?.currentActivity) {
              const actKey = item.currentActivity.toUpperCase();
              if (actKey !== 'ON DUTY' && activityMetrics[actKey]) {
                const hexColor = activityMetrics[actKey].color;
                const rgb = hexToRgbArray(hexColor);

                // Mix background colors with white base for elegant report rendering
                data.cell.styles.fillColor = [
                  Math.round(rgb[0] + (255 - rgb[0]) * 0.55),
                  Math.round(rgb[1] + (255 - rgb[1]) * 0.55),
                  Math.round(rgb[2] + (255 - rgb[2]) * 0.55)
                ];
                data.cell.styles.textColor = [0, 0, 0];
              }
            }
          }
        }
      });
    }

    doc.save(`Personnel_Ledger_Matrix_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const columns: ColumnsType<FlattenedPersonnel> = [
    {
      title: '#',
      key: 'NR',
      width: 60,
      render: (_, __, index) => <span style={{ color: '#000000', fontWeight: 600 }}>{index + 1}</span>,
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <span style={{ color: '#000000', fontWeight: 600 }}>
          {text}
          {/* Append status text brackets directly on paper prints */}
          <span className="print-only-activity-text" style={{ display: 'none', marginLeft: '8px', fontWeight: 'normal', color: '#000000' }}>
            {` [${(record.currentActivity ?? '').toUpperCase()}]`}
          </span>
        </span>
      ),
    },
    {
      title: 'Status Activity',
      dataIndex: 'currentActivity',
      key: 'currentActivity',
      className: 'hide-column-on-print',
      render: (activity: string) => {
        if (!activity) return null;
        const baseColor = activityMetrics[activity.toUpperCase()]?.color || '#cbd5e1';
        return (
          <Tag color={baseColor} style={{ fontWeight: '900', color: '#000000', border: '1px solid rgba(0,0,0,0.35)' }}>
            {activity.toUpperCase()}
          </Tag>
        );
      },
    },
  ];

  const getRowClassName = (record: FlattenedPersonnel) => {
    if (!record?.currentActivity) return '';
    const sanitizedActivityName = record.currentActivity.replace(/\s+/g, '-').toLowerCase();
    return `row-activity-${sanitizedActivityName}`;
  };

  const dynamicStyles = useMemo(() => {
    let stylesString = '';
    Object.entries(activityMetrics).forEach(([activity, data]) => {
      const className = activity.replace(/\s+/g, '-').toLowerCase();
      if (className === 'on-duty') return;

      const bgNormal = hexToRgba(data.color, 0.45);
      const bgHover = hexToRgba(data.color, 0.65);

      stylesString += `
        .row-activity-${className} td {
          background-color: ${bgNormal} !important;
        }
        .row-activity-${className}:hover td {
          background-color: ${bgHover} !important;
        }
      `;
    });

    // --- ONLY CAPTURE TABLES IN PRINT ---
    stylesString += `
      @media print {
        /* Hide everything else */
        .no-print-zone, 
        .hide-column-on-print {
          display: none !important;
        }

        /* Reset general document layout */
        body, html, #root {
          background: #ffffff !important;
          color: #000000 !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Make appended bracket text visible */
        .print-only-activity-text {
          display: inline !important;
        }

        /* Clean up Ant Design tables for print */
        .ant-table-wrapper {
          margin-bottom: 24px !important;
          page-break-inside: auto !important;
        }
        .ant-table {
          background: #ffffff !important;
        }
        .ant-table-title {
          background: #ffffff !important;
          padding: 8px 0 !important;
          font-size: 16pt !important;
          font-weight: bold !important;
          color: #000000 !important;
          border: none !important;
        }
        .ant-table-thead > tr > th {
          background: #f1f5f9 !important;
          color: #000000 !important;
          font-weight: bold !important;
          border-bottom: 2px solid #000000 !important;
        }
        .ant-table-tbody > tr > td {
          background: #ffffff !important;
          color: #000000 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 6px 4px !important;
        }
        .ant-table-thead {
          display: table-header-group !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
      }
    `;
    return <style>{stylesString}</style>;
  }, [activityMetrics]);

  return (
    <div style={{ padding: '24px', background: '#cbd5e1', minHeight: '100vh' }}>

      {dynamicStyles}

      {/* --- HIDDEN IN PRINT: Activity Color Matrix Guide --- */}
      <Card className="no-print-zone" size="small" style={{ marginBottom: '24px' }}>
        <div className='flex justify-between'>
          <Space wrap size={[16, 16]}>
            {Object.entries(activityMetrics).map(([activity, data]) => (
              <div key={activity} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: data.color, borderRadius: '4px', border: '1px solid rgba(0,0,0,0.2)' }} />
                <Text strong style={{ fontSize: '13px', color: '#000000' }}>
                  {activity}
                </Text>
                <Badge
                  count={data.count}
                  style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700, border: '1px solid #cbd5e1' }}
                />
              </div>
            ))}
          </Space>
          <Space size="middle">
            <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ backgroundColor: '#15803D', borderColor: '#15803D', fontWeight: 600 }}>
              Export Excel
            </Button>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={handleExportPdf} style={{ backgroundColor: '#B91C1C', borderColor: '#B91C1C', fontWeight: 600 }}>
              Export PDF
            </Button>
          </Space>
        </div>

      </Card>

      {/* --- ONLY CAPTURED ZONE --- */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* --- Officers Dynamic Data Table --- */}
        <Table
          title={() => <span style={{ fontWeight: 800, fontSize: '16px', color: '#000000' }}>Officers ({processedGroups.Officers.length})</span>}
          columns={columns}
          dataSource={processedGroups.Officers}
          pagination={false}
          rowClassName={getRowClassName}
          loading={isLoading}
          bordered
        />

        {/* --- Non-Officers Dynamic Data Table --- */}
        <Table
          title={() => <span style={{ fontWeight: 800, fontSize: '16px', color: '#000000' }}>Non-Officers ({processedGroups.NonOfficers.length})</span>}
          columns={columns}
          dataSource={processedGroups.NonOfficers}
          pagination={false}
          rowClassName={getRowClassName}
          loading={isLoading}
          bordered
        />

      </Space>
    </div>
  );
};

export default ByColorLegend;