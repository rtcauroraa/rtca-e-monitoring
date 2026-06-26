import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

const { Content } = Layout;

export default function ContentLayout() {
  const { isMobile } = useResponsiveLayout();
  return (
    <Content style={{ padding: isMobile ? 2 : 24 }}>
      <Outlet />
    </Content>
  );
}
