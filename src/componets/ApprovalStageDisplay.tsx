import React from "react";
import { Typography, Space } from "antd";
import type { ActivityStatus } from "../@types/PersonnelActivity";

const { Text } = Typography;

interface ApprovalStageDisplayProps {
    status?: ActivityStatus;
    currentStage?: number;
    isOfficer?: boolean;
}

export const ApprovalStageDisplay: React.FC<ApprovalStageDisplayProps> = ({
    status,
    currentStage = 1,
    isOfficer = false,
}) => {
    // If it's not pending, don't show a stage tracking name
    if (status !== "Pending Approval") {
        return;
    }

    // Define the workflow configurations based on your business rules
    if (isOfficer) {
        switch (currentStage) {
            case 3:
                return (
                    <Space size={0}>
                        <Text  style={{ fontSize: "11px" }}>Assistant Director</Text>
                    </Space>
                );
            case 4:
                return (
                    <Space size={0}>
                        <Text  style={{ fontSize: "11px" }}>Director</Text>
                    </Space>
                );
            default:
                return <Text type="danger">Unknown Officer Step</Text>;
        }
    }

    // Non-Officer Track Rules Mapping
    switch (currentStage) {
        case 1:
            return (
                <Space size={0}>
                    <Text  style={{ fontSize: "11px" }}>CMAA</Text>
                </Space>
            );
        case 2:
            return (
                <Space size={0}>
                    <Text  style={{ fontSize: "11px" }}>OIC</Text>
                </Space>
            );
        case 3:
            return (
                <Space size={0}>
                   
                    <Text  style={{ fontSize: "11px" }}>CSG</Text>
                </Space>
            );
        case 4:
            return (
                <Space size={0}>
                    <Text  style={{ fontSize: "11px" }}>Director</Text>
                </Space>
            );
        default:
            return <Text type="danger">Unknown Step</Text>;
    }
};