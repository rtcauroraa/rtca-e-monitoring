import { useState, useEffect } from "react";
import { Layout } from "antd";

import SidebarLayout from "./content/SidebarLayout";
import HeaderLayout from "./content/HeaderLayout";
import ContentLayout from "./content/ContentLayout";
import { SidebarContext } from "./context/SidebarContext";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const { isMobile } = useResponsiveLayout();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  return (
    <SidebarContext value={{ collapsed, setCollapsed }}>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Cleaned up prop since you have SidebarContext */}
        <SidebarLayout collapsed={collapsed} />

        <Layout className="site-layout">
          <HeaderLayout />
          <ContentLayout />
        </Layout>
      </Layout>
    </SidebarContext>
  );
}
