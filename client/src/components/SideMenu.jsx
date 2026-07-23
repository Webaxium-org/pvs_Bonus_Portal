import { useColorScheme } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useSelector } from "react-redux";
import MenuContent from "./MenuContent";
import OptionsMenu from "./OptionsMenu";
import { selectUser } from "../store/slices/userSlice";
import logo from "../assets/logo.png";
import logoBlack from "../assets/logo_black.png";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

export default function SideMenu({ collapsed = false, onToggle }) {
  const { mode, systemMode } = useColorScheme();
  const user = useSelector(selectUser);

  const resolvedMode = (mode === "system" ? systemMode : mode) || "light";
  const currentLogo = resolvedMode === "dark" ? logo : logoBlack;

  const getInitials = (fullName) => {
    if (!fullName) return "U";
    const nameParts = fullName.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  };

  const displayName =
    user?.fullName ||
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : null) ||
    user?.firstName ||
    user?.name ||
    "User";
  const displayEmail = user?.email || "user@email.com";

  return (
    <MuiDrawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        transition: "width 0.2s ease",
        [`& .${drawerClasses.paper}`]: {
          width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          overflowX: "hidden",
          transition: "width 0.2s ease",
        },
      }}
    >
      {/* Logo + Toggle button */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: "calc(var(--template-frame-height, 0px) + 4px)",
          px: 1,
          py: 1,
          minHeight: 56,
        }}
      >
        {!collapsed && (
          <img
            src={currentLogo}
            alt="Logo"
            style={{
              maxWidth: "160px",
              height: "auto",
              maxHeight: "50px",
              objectFit: "contain",
            }}
          />
        )}
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
          <IconButton
            onClick={onToggle}
            size="small"
            sx={{ position: "absolute", right: 4 }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent collapsed={collapsed} />
      </Box>

      {/* User info footer */}
      <Stack
        direction="row"
        sx={{
          p: collapsed ? 1 : 2,
          gap: 1,
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tooltip title={collapsed ? displayName : ""} placement="right">
          <Avatar
            sizes="small"
            alt={displayName}
            sx={{ width: 36, height: 36, bgcolor: "primary.main", flexShrink: 0 }}
          >
            {getInitials(
              user?.fullName ||
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
            )}
          </Avatar>
        </Tooltip>
        {!collapsed && (
          <>
            <Box sx={{ mr: "auto", minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  lineHeight: "16px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {displayEmail}
              </Typography>
            </Box>
            <OptionsMenu />
          </>
        )}
      </Stack>
    </MuiDrawer>
  );
}
