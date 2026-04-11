import { LayoutDashboard, FolderGit2, Activity, AlertTriangle, Users, Settings, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { GitMerge } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Repositories", url: "/dashboard/repositories", icon: FolderGit2 },
  { title: "Activity", url: "/dashboard/activity", icon: Activity },
  { title: "Conflicts", url: "/dashboard/conflicts", icon: AlertTriangle },
  { title: "Collaborators", url: "/dashboard/collaborators", icon: Users },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shrink-0">
          <GitMerge className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="text-base font-bold text-sidebar-foreground">GitSync</span>}
      </div>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
