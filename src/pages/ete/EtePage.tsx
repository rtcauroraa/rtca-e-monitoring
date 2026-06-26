import { useQuery } from "@tanstack/react-query";
import { Table, Tag, Button, Modal, Space, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import personelService from "../../services/personelService";
import type { EnlistedPersonnelETE } from "../../@types/nonTable/EnlistedPersonnelETE";
import nameFormat from "../../utils/nameFormat";
import { formatDateToMilitary } from "../../utils/formatDateToMilitary";
import { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";

// Excel
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ReEnlistModal from "./ReEnlistModal";
import SubmitStatusModal from "./SubmitStatusModal";
import DebounceInput from "../../componets/DebounceInput";
import RequestExplanationModal from "./RequestExplanationModal";
import WarningModal from "./WarningModal";
import { formatDaysToYMD } from "../../utils/formatDaysToYMD";
import EteExplanationIndex from "../ete-email-layout/EteExplanationIndex";
import dayjs from "dayjs";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

// ---------------- STATUS TAG ----------------
export const getStatusTag = (status?: string, daysLeft: number = 0) => {
  const isWarningRange = daysLeft > 365 && daysLeft <= 395;

  const isExplanationRange = daysLeft <= 365;

  const daysInText = formatDaysToYMD(daysLeft);

  if (status === "ALREADY SUBMITTED") {
    return <Tag color="blue">ALREADY SUBMITTED</Tag>;
  } else if (isExplanationRange) {
    return (
      <Tag color="volcano">
        CRITICAL <br />({daysInText})
      </Tag>
    );
  } else if (isWarningRange) {
    return (
      <Tag color="gold">
        NEAR ETE <br />({daysInText})
      </Tag>
    );
  } else if (status === "ACTIVE") {
    return <Tag color="green">ACTIVE</Tag>;
  } else if (status === "EXPIRED") {
    return <Tag color="red">EXPIRED</Tag>;
  }

  return <Tag>UNKNOWN</Tag>;
};

const getStatus = (status?: string, daysLeft?: number) => {
  switch (status) {
    case "NEAR ETE":
      return `NEAR ETE (${daysLeft} day/s)`;
    case "CRITICAL":
      return `CRITICAL (${daysLeft} day/s)`;
    case "NO RECORD":
      return "-";
    default:
      return status;
  }
};

export default function EtePage() {
  const [enlistModal, setEnlistModal] = useState(false);
  const [submitStatusModal, setSubmitStatusModal] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<EnlistedPersonnelETE | null>(null);
  const [requestExplanationModal, setRequestExplationModal] =
    useState<boolean>(false);
  const [warningModal, setWarningModal] = useState<boolean>(false);
  const [filteredData, setFilteredData] = useState<EnlistedPersonnelETE[]>([]);
  const [explainModal, setExplainModal] = useState<boolean>(false);

  const { isMobile } = useResponsiveLayout();
  const {
    data = [],
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["enlistment-ete"],
    queryFn: async () => await personelService.getEnlistmentETE(),
  });

  const handleOpenExplanationModal = (record: EnlistedPersonnelETE) => {
    setSelectedRecord(record);
    setRequestExplationModal(true);
  };

  const handleOpenWarningModal = (record: EnlistedPersonnelETE) => {
    setSelectedRecord(record);
    setWarningModal(true);
  };

  const handleSubmitted = (record: EnlistedPersonnelETE) => {
    setSubmitStatusModal(true);
    setSelectedRecord(record);
  };

  const handleViewExplain = (record: EnlistedPersonnelETE) => {
    setExplainModal(true);
    setSelectedRecord(record);
  };

  // ---------------- TABLE COLUMNS ----------------
  const columns: ColumnsType<EnlistedPersonnelETE> = [
    {
      title: "#",
      align: "center",
      width: 60,
      render: (_, __, index) => index + 1,
      fixed: "left", // Good practice to keep index and name fixed
    },
    {
      title: "Name",
      width: isMobile ? 100 : 250,
      fixed: "left",
      render: (_, record) => nameFormat(record),
      // --- SEARCH LOGIC ---
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search Name"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      onFilter: (value, record) =>
        nameFormat(record)
          .toLowerCase()
          .includes((value as string).toLowerCase()),
    },
    {
      title: "DATE ENTERED SVC",
      align: "center",
      dataIndex: "dateEnteredService",
      sorter: (a, b) =>
        dayjs(a.dateEnteredService).unix() - dayjs(b.dateEnteredService).unix(),
      render: (value) => formatDateToMilitary(value),
    },
    {
      title: "YEAR/S IN SVC",
      align: "center",
      width: 120,
      dataIndex: "yearsInService",
      sorter: (a, b) => (a.yearsInService ?? 0) - (b.yearsInService ?? 0),
    },
    {
      title: "NEXT ETE",
      align: "center",
      dataIndex: "nextETE",
      sorter: (a, b) => dayjs(a.nextETE).unix() - dayjs(b.nextETE).unix(),
      render: (date) => (date ? formatDateToMilitary(date) : "-"),
    },
    {
      title: "REMARKS",
      dataIndex: "remarks",
      width: 150,
      // Sorting by text
      sorter: (a, b) => (a.remarks || "").localeCompare(b.remarks || ""),
      render: (value, record) => getStatusTag(value, record.eteDaysRemaining),
    },
    {
      title: "COMM. STATUS",
      width: 150,
      align: "center",
      render: (_, record) => {
        if (
          record?.emailCategory === "REQUEST EXPLANATION" &&
          record?.supportingDocument
        ) {
          return (
            <Button
              size="small"
              type="link"
              onClick={() => handleViewExplain(record)}
              style={{
                color: "#52c41a",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Review Letter
            </Button>
          );
        }

        if (record?.emailCategory === "REQUEST EXPLANATION") {
          return (
            <Tag color="processing" style={{ fontWeight: "500" }}>
              Requested
            </Tag>
          );
        }

        if (record.emailCategory === "NOTIFY") {
          return (
            <Tag color="orange" style={{ fontWeight: "500" }}>
              Notified
            </Tag>
          );
        }
      },
    },
    {
      title: "ACTION",
      render: (_, record) => {
        if (record.remarks === "NO RECORD") return null;

        const daysLeft = record.eteDaysRemaining ?? 0;

        const isWarningRange = daysLeft > 365 && daysLeft <= 395;

        const isExplanationRange = daysLeft <= 365;

        return (
          <>
            {record.remarks !== "ALREADY SUBMITTED" && (
              <Button
                size="small"
                type="link"
                onClick={() => handleSubmitted(record)}
              >
                Submit
              </Button>
            )}

            {isWarningRange && (
              <Button
                size="small"
                type="link"
                onClick={() => handleOpenWarningModal(record)}
                style={{
                  color:
                    record.emailCategory === "NOTIFY" ? "#52c41a" : "#fbbf24",

                  padding: 0,
                }}
              >
                {record.emailCategory === "NOTIFY" ? "Re-Notify" : "Notify"}
              </Button>
            )}

            {!record.supportingDocument && isExplanationRange && (
              <Button
                size="small"
                type="link"
                style={{ color: "#fa541c" }}
                onClick={() => handleOpenExplanationModal(record)}
              >
                {record.emailCategory ? "Resend" : "Request"} Explanation
              </Button>
            )}
          </>
        );
      },
    },
  ];

  // ---------------- PRINT ----------------
  const generatePrintHTML = () => {
    const rows = data.map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${nameFormat(item)}</td>
        <td>${formatDateToMilitary(item.dateEnteredService)}</td>
        <td>${item.yearsInService ?? "-"}</td>
        <td>${formatDateToMilitary(item.dateEnlisted)}</td>
        <td>${formatDateToMilitary(item.dateOfLatestReEnlistment)}</td>
        <td>${formatDateToMilitary(item.nextETE)}</td>
        <td>${getStatus(item.remarks, item.eteDaysRemaining)}</td>
      </tr>
    `,
    );

    return `
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Name</th>
            <th>Date Entered</th>
            <th>Years</th>
            <th>Enlistment</th>
            <th>Re-Enlistment</th>
            <th>Next ETE</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=900,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>ETE Report</title>
        <style>
         @page {
          size: landscape;
          margin: 8mm;
        }

          body { font-family: Arial; padding:20px }
          h1 { text-align:center; }
          table { border-collapse:collapse; width:100% }
          th,td { border:1px solid black; padding:6px; text-align:center }
        </style>
      </head>
      <body>
        <h1>ETE REPORT (${formatDateToMilitary(new Date())})</h1>
        ${generatePrintHTML()}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  // ---------------- EXCEL ----------------
  const handleExportExcel = () => {
    const excelData = data.map((item, index) => ({
      No: index + 1,
      Name: nameFormat(item),
      DateEntered: formatDateToMilitary(item.dateEnteredService),
      YearsService: item.yearsInService,
      Enlistment: formatDateToMilitary(item.dateEnlisted),
      ReEnlistment: formatDateToMilitary(item.dateOfLatestReEnlistment),
      NextETE: formatDateToMilitary(item.nextETE),
      Remarks: item.remarks,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "ETE");

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([buffer]),
      `ETE Report (${formatDateToMilitary(new Date())}).xlsx`,
    );
  };

  // ---------------- PDF ----------------
  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.text(`ETE REPORT (${formatDateToMilitary(new Date())})`, 14, 15);

    const body: any = data.map((item, index) => [
      index + 1,
      nameFormat(item),
      formatDateToMilitary(item.dateEnteredService),
      item.yearsInService ?? "-",
      formatDateToMilitary(item.dateOfLatestReEnlistment),
      formatDateToMilitary(item.nextETE),
      getStatus(item.remarks, item.eteDaysRemaining),
    ]);

    autoTable(doc, {
      head: [
        [
          "No.",
          "Name",
          "Date Entered",
          "Years",
          "Re-Enlistment",
          "Next ETE",
          "Remarks",
        ],
      ],
      body,
      startY: 20,
    });

    doc.save(`ETE Report (${formatDateToMilitary(new Date())}).pdf`);
  };

  if (isError) return <div>Error loading data</div>;

  return (
    <>
      <div className="flex gap-2 mb-4"></div>
      <Modal
        closable={{ "aria-label": "Custom Close Button" }}
        open={explainModal}
        onOk={() => {}}
        okText="Submit"
        onCancel={() => {
          setExplainModal(false);
        }}
        width={1500}
      >
        <EteExplanationIndex selectedEte={selectedRecord} />
      </Modal>
      <SubmitStatusModal
        setIsModalVisible={setSubmitStatusModal}
        selectedRecord={selectedRecord}
        isModalVisible={submitStatusModal}
        onAfterSave={() => {
          refetch();
          setSubmitStatusModal(false);
        }}
      />

      <ReEnlistModal
        setIsModalVisible={setEnlistModal}
        selectedRecord={selectedRecord}
        isModalVisible={enlistModal}
        onAfterSave={() => {}}
      />

      <RequestExplanationModal
        visible={requestExplanationModal}
        onCancel={() => setRequestExplationModal(false)}
        onAfterSend={() => {
          refetch();
          setRequestExplationModal(false);
        }}
        record={selectedRecord}
      />

      <WarningModal
        visible={warningModal}
        onCancel={() => setWarningModal(false)}
        record={selectedRecord}
        onAfterSend={() => {
          refetch();
          setWarningModal(false);
        }}
      />

      {/* ACTION BUTTONS */}
      <div className="flex justify-end mb-4 gap-1">
        <DebounceInput
          placeholder="Search Name..."
          style={{ width: 250 }}
          onChange={(value) => {
            const keyword = value.toLowerCase();

            if (!keyword) {
              setFilteredData(data);
              return;
            }

            const result = data.filter((item) =>
              nameFormat(item).toLowerCase().includes(keyword),
            );

            setFilteredData(result);
          }}
        />
        <Button onClick={handlePrint}>Print</Button>
        <Button onClick={handleExportExcel}>Excel</Button>
        <Button type="primary" onClick={handleExportPDF}>
          PDF
        </Button>
      </div>

      {/* TABLE */}
      <Table
        sticky
        scroll={{
          y: "calc(100vh - 280px)",
          // On mobile, use max-content to make it scroll smoothly like a native mobile app card layout
          x: isMobile ? "max-content" : 1100,
        }}
        loading={isFetching}
        rowKey={(record) => record.personnelId ?? 0}
        columns={columns}
        dataSource={filteredData.length > 0 ? filteredData : data}
        size="small"
        pagination={false}
        bordered
      />
    </>
  );
}
