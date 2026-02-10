import Stack from "@mui/material/Stack";
import NavbarBreadcrumbs from "./NavbarBreadcrumbs";
import ColorModeIconDropdown from "../theme/shared/ColorModeIconDropdown";
import NotificationPanel from "./NotificationPanel";

import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import { logout } from "../store/slices/userSlice";
import api from "../utils/api";
import Tooltip from "@mui/material/Tooltip";
import MenuButton from "./MenuButton";

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await api.post("/v2/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: "none", md: "flex" },
        width: "100%",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between",
        maxWidth: { sm: "100%", md: "1700px" },
        pt: 1.5,
      }}
      spacing={2}
    >
      <NavbarBreadcrumbs />
      <Stack direction="row" sx={{ gap: 1 }} alignItems="center">
        {/* Live notification bell — self-contained with dropdown + modal */}
        <NotificationPanel />
        <ColorModeIconDropdown />
        <Tooltip title="Logout">
          <MenuButton aria-label="logout" onClick={handleLogout}>
            <PowerSettingsNewIcon sx={{ color: "#FF0000" }} />
          </MenuButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
