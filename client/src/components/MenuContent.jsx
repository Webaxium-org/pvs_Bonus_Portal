import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Tooltip from "@mui/material/Tooltip";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import { selectUser } from "../store/slices/userSlice";
import api from "../utils/api";

const menuItems = [
  {
    text: "Home",
    icon: <HomeRoundedIcon />,
    path: "/",
    roles: ["admin", "hr"],
  },
  {
    text: "Employees",
    icon: <PeopleRoundedIcon />,
    path: "/employees",
    roles: ["admin", "hr"],
  },
  {
    text: "Approvals",
    icon: <CheckCircleOutlineIcon />,
    path: "/approvals",
    roles: ["admin", "manager", "approver"],
  },
  {
    text: "Assign Bonuses",
    icon: <AttachMoneyIcon />,
    path: "/bonuses",
    roles: ["admin", "manager", "approver"],
    showBadge: true,
  },
];

const secondaryListItems = [];

export default function MenuContent({ collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const [pendingBonusCount, setPendingBonusCount] = useState(0);

  const handleNavigation = (path) => {
    if (path) navigate(path);
  };

  useEffect(() => {
    const fetchPendingBonusCount = async () => {
      try {
        const userId = user?.id || user?._id;
        if (!userId) return;
        if (!["admin", "manager", "approver"].includes(user.role)) return;

        const response = await api.get(
          `/v2/employees/supervisor/my-team?supervisorId=${userId}`
        );
        const employees = response.data.data;
        const count = employees.filter(
          (emp) =>
            !emp.approvalStatus?.enteredBy &&
            !emp.approvalStatus?.submittedForApproval
        ).length;
        setPendingBonusCount(count);
      } catch (err) {
        console.error("Failed to fetch pending bonus count:", err);
      }
    };

    fetchPendingBonusCount();
    const interval = setInterval(fetchPendingBonusCount, 30000);
    const handleRefresh = () => fetchPendingBonusCount();
    window.addEventListener("refreshBonusBadge", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refreshBonusBadge", handleRefresh);
    };
  }, [user]);

  const visibleMenuItems = menuItems?.filter((item) =>
    item.roles ? item.roles.includes(user.role) : true
  );

  const visibleSecondaryItems = secondaryListItems?.filter((item) =>
    item.roles ? item.roles.includes(user.role) : true
  );

  const renderItem = (item, index) => (
    <ListItem key={index} disablePadding sx={{ display: "block" }}>
      <Tooltip title={collapsed ? item.text : ""} placement="right" arrow>
        <ListItemButton
          selected={location.pathname === item.path}
          onClick={() => handleNavigation(item.path)}
          sx={{
            minHeight: 44,
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1.5 : 2,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 0 : 36,
              justifyContent: "center",
            }}
          >
            {item.showBadge ? (
              <Badge badgeContent={pendingBonusCount} color="error" max={99}>
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          {!collapsed && <ListItemText primary={item.text} />}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>{visibleMenuItems.map(renderItem)}</List>
      <List dense>{visibleSecondaryItems.map(renderItem)}</List>
    </Stack>
  );
}
