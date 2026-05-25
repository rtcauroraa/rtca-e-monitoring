import {  useRef, useMemo } from "react";
import { Table, Card, Button, Space, Tag, Alert } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/UserContext";

// Export Utilities
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dashboardService from "../../services/dashboardService";
import nameFormat from "../../utils/nameFormat";
import getRandomColor from "../../utils/getRandomColor";
import type { Personnel } from "../../@types/Personnel";
import type { DepartmentData } from "../../@types/dashboardGraphs/DepartmentData";

export default function MyDepartmentIndex() {
    const { user } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);

    // 1. Fetch backend metrics
    const { data: departmentData, isLoading, isError, error } = useQuery<DepartmentData[], Error>({
        queryKey: ["departmentData"],
        queryFn: async () => await dashboardService.getPersonnelByDepartment(),
        initialData: [],
    });

    // 2. Map all Department IDs belonging to the logged-in user
    const myDepartmentIds: number[] = useMemo(() => {
        if (!user?.personnel) return [];
        const ids = new Set<number>();

        if (user.personnel.departmentId) {
            ids.add(user.personnel.departmentId);
        }

        user.personnel.personnelDepartments?.forEach((dept) => {
            if (dept.departmentId) {
                ids.add(dept.departmentId);
            }
        });

        return Array.from(ids);
    }, [user]);

    // 3. Filter database records based on user's authorized departments
    const filteredDepartmentData = useMemo(() => {
        if (!departmentData || myDepartmentIds.length === 0) return [];

        return departmentData
            .map((dept) => {
                // Isolate personnel belonging to authorized departments inside this cluster
                const cleanNames = (dept.names || []).filter((person) => {
                    const primaryMatch = myDepartmentIds.includes(person.departmentId || 0);
                    const secondaryMatch = person.personnelDepartments?.some((d) =>
                        myDepartmentIds.includes(d?.departmentId ?? 0)
                    ) || false;

                    return primaryMatch || secondaryMatch;
                });

                return {
                    ...dept,
                    names: cleanNames,
                    personnel: cleanNames.length, // Re-index count matching visible array length
                };
            })
            .filter((dept) => dept.personnel > 0); // Strip entirely empty departments
    }, [departmentData, myDepartmentIds]);



    // ----------------- Excel Export -----------------
    const handleExportExcel = () => {
        const excelData: any[] = [];
        filteredDepartmentData.forEach((dept) => {
            dept.names.forEach((name) => {
                excelData.push({
                    Department: dept.department,
                    Personnel: nameFormat(name),
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Department Data");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, "FilteredDepartmentData.xlsx");
    };

    // ----------------- PDF Export -----------------
    const handleExportPDF = () => {
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        let y = 40;

        doc.setFontSize(18);
        doc.setTextColor("#36cfc9");
        doc.text("Personnel by Department Report", 40, y);
        y += 30;

        filteredDepartmentData.forEach((dept) => {
            doc.setFontSize(14);
            doc.setTextColor("#36cfc9");
            doc.text(`${dept.department} (${dept.personnel})`, 40, y);
            y += 10;

            const body = dept.names.map((name, i) => {
                if (!name.personnelActivities || name.personnelActivities.length === 0) {
                    return [i + 1, nameFormat(name), "On Duty"];
                }

                const activitiesText = name.personnelActivities
                    .map((act) => `${act.activityType?.activityTypeName ?? "No Type"} (${act.title ?? ""})`)
                    .join(", ");

                return [i + 1, nameFormat(name), activitiesText];
            });

            autoTable(doc, {
                startY: y,
                head: [["#", "Personnel", "Activity"]],
                body,
                theme: "grid",
                headStyles: { fillColor: [54, 207, 201] },
                styles: { fontSize: 10 },
                margin: { left: 40, right: 40 },
                tableWidth: "auto",
                didDrawPage: (data) => {
                    y = (data?.cursor?.y ?? 0) + 20;
                },
            });

            if (y > doc.internal.pageSize.height - 100) {
                doc.addPage();
                y = 40;
            }
        });

        doc.save("FilteredDepartmentData.pdf");
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
          <title>Personnel by Department</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #36cfc9; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            table, th, td { border: 1px solid #d9d9d9; }
            th, td { padding: 8px; text-align: left; }
            h2 { color: #36cfc9; }
            .dept-header-print { padding: 6px 10px; font-weight: 600; color: #fff; border-radius: 4px 4px 0 0; }
          </style>
        </head>
        <body>
          <h1>Personnel by Department Report</h1>
          ${printContents}
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.print();
    };

    if (isError) {
        return (
            <Card style={{ margin: "24px" }}>
                <Alert message="Error fetching department records" description={error.message} type="error" showIcon />
            </Card>
        );
    }

    return (
        <Space direction="vertical" size="large" style={{ display: "flex", width: "100%" }}>
            {/* Chart Block Container */}
            <Space wrap>
                <Button onClick={handlePrint}>Print</Button>
                <Button onClick={handleExportExcel}>Export to Excel</Button>
                <Button type="primary" onClick={handleExportPDF}>Export to PDF</Button>
            </Space>


            {/* Roster Structural Table Blocks rendered directly in-line */}
            {!isLoading && filteredDepartmentData.length > 0 && (
                <Card title="My Department Roster Breakdown">
                    <div ref={printRef} className="grid md:grid-cols-2 sm:grid-cols-1 gap-4">
                        {filteredDepartmentData.map((dept) => {
                            const headerColor = getRandomColor();

                            const columns = [
                                {
                                    title: "#",
                                    render: (_: any, __: any, index: number) => index + 1,
                                    width: 50,
                                    align: "center" as const,
                                },
                                {
                                    title: "Personnel",
                                    dataIndex: "names",
                                    key: "names",
                                    render: (_: any, record: Personnel) => (
                                        <span style={{ fontWeight: 500 }}>{nameFormat(record)}</span>
                                    ),
                                },
                                {
                                    title: "Status / Activity",
                                    key: "activity",
                                    render: (record: any) => {
                                        if (!record.personnelActivities?.length) {
                                            return <Tag color="success">On Duty</Tag>;
                                        }

                                        return record.personnelActivities.map((act: any, i: number) => (
                                            <div key={i} style={{ padding: "2px 0" }}>
                                                <strong>{act.title}</strong>
                                                <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                                    {act.activityType?.activityTypeName}
                                                </div>
                                            </div>
                                        ));
                                    },
                                },
                            ];

                            return (
                                <div key={dept?.department} style={{ marginBottom: 16 }}>
                                    <div
                                        className="dept-header-print"
                                        style={{
                                            backgroundColor: headerColor,
                                            color: "white",
                                            padding: "8px 12px",
                                            borderRadius: "6px 6px 0 0",
                                            fontWeight: 600,
                                            fontSize: 14,
                                        }}
                                    >
                                        {dept?.department} ({dept?.personnel})
                                    </div>

                                    <Table<any>
                                        columns={columns}
                                        dataSource={dept.names}
                                        pagination={false}
                                        size="small"
                                        bordered
                                        rowKey={(_, index) => index!.toString()}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </Space>
    );
}