import { Layout, Menu } from "antd";
import {
  HomeOutlined,
  BarChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/UserContext";
import logo from "../../../public/main-logo.png";
import { useQuery } from "@tanstack/react-query";
import sidebarService from "../../services/sidebarService";
import type { Sidebar } from "../../@types/Sidebar";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import useSidebarContext from "../context/SidebarContext";

const { Sider } = Layout;

type SidebarLayoutProps = {
  collapsed: boolean;
};

const IconMapper: Record<string, React.ReactNode> = {
  HomeOutlined: <HomeOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  TeamOutlined: <TeamOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  UserOutlined: <UserOutlined />,
  SettingOutlined: <SettingOutlined />,
  FileTextOutlined: <FileTextOutlined />,
};

export default function SidebarLayout({ collapsed }: SidebarLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isMobile } = useResponsiveLayout();
  const { setCollapsed } = useSidebarContext();

  // Fetch all sidebars (the definitive master list source)
  const { data: allSidebars = [] } = useQuery({
    queryKey: ["sidebars"],
    queryFn: sidebarService.getAll,
  });

  // Helper to format a single Sidebar object into an AntD Menu item
  const formatMenuItem = (item?: Sidebar) => ({
    key: item?.path || item?.keyName || "",
    icon: item?.keyName ? IconMapper[item.keyName] : <FileTextOutlined />,
    label: item?.sidebarName,
    onClick: () => {
      item?.path && navigate(item.path);
      isMobile && setCollapsed(true);
    },
  });

  // 1. Determine if the user holds SuperAdmin status across ANY assigned role profile mapping
  const isSuperAdmin =
    user?.role?.isSuperAdmin ||
    user?.userRoles?.some((ur) => ur.role?.isSuperAdmin);

  // 2. Build a Set of all valid paths or IDs this user has permission to view
  const allowedPaths = new Set();

  // Extract from Primary Role profile
  user?.role?.sidebarRoleMappings?.forEach((m) => {
    if (m?.sidebar?.path) allowedPaths.add(m.sidebar.path);
  });

  // Extract from all Secondary Roles profiles smoothly
  user?.userRoles?.forEach((ur) => {
    ur.role?.sidebarRoleMappings?.forEach((m) => {
      if (m?.sidebar?.path) allowedPaths.add(m.sidebar.path);
    });
  });

  // 3. Construct the final menu tree matching against the definitive allSidebars pool
  const finalMenuItems = isSuperAdmin
    ? allSidebars.map(formatMenuItem)
    : allSidebars
        .filter((sidebar) => sidebar && allowedPaths.has(sidebar.path))
        .map(formatMenuItem);

  return (
    <Sider
      trigger={null}
      breakpoint="lg"
      collapsedWidth={0}
      collapsible
      collapsed={collapsed}
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
        overflow: "auto",
      }}
    >
      <div className="flex justify-center p-4">
        <img
          src={logo}
          alt="logo"
          className="justify-self-center m-2"
          style={{
            width: collapsed ? "30px" : "120px",
            transition: "width 0.2s",
          }}
        />
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ background: "transparent", border: "none" }}
        items={finalMenuItems}
      />
    </Sider>
  );
}
