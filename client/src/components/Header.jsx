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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import React, { useState } from "react";

export default function Header() {
  const [openLogoutConfirm, setOpenLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    setOpenLogoutConfirm(false);
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
      {/* Temporarily disabled */}
      {/* <NavbarBreadcrumbs /> */}
      <Stack sx={{ flex: 1 }} /> {/* Spacer to push buttons to the right */}
      <Stack direction="row" sx={{ gap: 1 }} alignItems="center">
        {/* Live notification bell — self-contained with dropdown + modal */}
        <NotificationPanel />
        <ColorModeIconDropdown />
        <Tooltip title="Logout">
          <MenuButton aria-label="logout" onClick={() => setOpenLogoutConfirm(true)}>
            <PowerSettingsNewIcon sx={{ color: "#FF0000" }} />
          </MenuButton>
        </Tooltip>

        <Dialog
          open={openLogoutConfirm}
          onClose={() => setOpenLogoutConfirm(false)}
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-description"
        >
          <DialogTitle id="logout-dialog-title">{"Confirm Logout"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="logout-dialog-description">
              Are you sure you want to log out? Any unsaved changes may be lost.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenLogoutConfirm(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleLogout} color="error" variant="contained" autoFocus>
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Stack>
  );
}
