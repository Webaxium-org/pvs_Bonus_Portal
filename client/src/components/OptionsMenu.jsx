import * as React from "react";
import { styled } from "@mui/material/styles";
import Divider, { dividerClasses } from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import { paperClasses } from "@mui/material/Paper";
import { listClasses } from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon, { listItemIconClasses } from "@mui/material/ListItemIcon";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import MenuButton from "./MenuButton";
import { logout } from "../store/slices/userSlice";
import api from "../utils/api";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";

const MenuItem = styled(MuiMenuItem)({
  margin: "2px 0",
});

export default function OptionsMenu() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openLogoutConfirm, setOpenLogoutConfirm] = React.useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setOpenLogoutConfirm(false);
    try {
      await api.post("/v2/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear Redux state and localStorage
      dispatch(logout());
      // Redirect to login page
      navigate("/login");
    }
  };

  return (
    <React.Fragment>
      <MenuButton
        aria-label="Open menu"
        onClick={handleClick}
        sx={{ borderColor: "transparent" }}
      >
        <MoreVertRoundedIcon />
      </MenuButton>
      <Menu
        anchorEl={anchorEl}
        id="menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        sx={{
          [`& .${listClasses.root}`]: {
            padding: "4px",
          },
          [`& .${paperClasses.root}`]: {
            padding: 0,
          },
          [`& .${dividerClasses.root}`]: {
            margin: "4px -4px",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            setOpenLogoutConfirm(true);
          }}
          sx={{
            [`& .${listItemIconClasses.root}`]: {
              ml: "auto",
              minWidth: 0,
            },
          }}
        >
          <Stack direction="row" alignItems="center" gap={10}>
            <ListItemText>Logout</ListItemText>
            <ListItemIcon>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
          </Stack>
        </MenuItem>
      </Menu>

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
    </React.Fragment>
  );
}
