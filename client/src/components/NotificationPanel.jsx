import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Badge,
  IconButton,
  Typography,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Tooltip,
  Fade,
  ClickAwayListener,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { badgeClasses } from "@mui/material/Badge";
import { useSelector } from "react-redux";
import { selectUser } from "../store/slices/userSlice";
import api from "../utils/api";

// ─── Time formatter ──────────────────────────────────────────────────────────
const formatTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ─── Resubmit Bonus Modal ────────────────────────────────────────────────────
export const ResubmitBonusModal = ({ open, onClose, notification, onSuccess }) => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const [newBonus, setNewBonus] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (open && notification?.payload) {
      setNewBonus(notification.payload.currentBonus?.toString() || "");
      setComments("");
      setError("");
      setSuccessMsg("");
    }
  }, [open, notification]);

  const handleClose = () => {
    // If we just succeeded, trigger parent refresh before closing
    if (successMsg) onSuccess?.();
    onClose();
  };

  const handleSubmit = async () => {
    const amount = parseFloat(newBonus);
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid bonus amount (0 or greater).");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const userId = user?.id || user?._id;
      const employeeDbId = notification.payload.employeeDbId;

      // Single call: update bonus + auto-approve actor's level + mark notification read
      const res = await api.post(
        `/v2/employees/${employeeDbId}/resubmit-and-approve?actorId=${userId}`,
        {
          bonus2025: amount,
          comments: comments.trim() || undefined,
          notificationId: notification.id,
          actorId: userId,
        }
      );

      setSuccessMsg(res.data?.message || "Bonus updated and resubmitted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!notification) return null;
  const { payload } = notification;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: successMsg
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.error.main, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {successMsg ? (
              <CheckCircleOutlineRoundedIcon color="success" />
            ) : (
              <ErrorOutlineRoundedIcon color="error" />
            )}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {successMsg ? "Submitted Successfully" : "Review & Resubmit Bonus"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {payload?.employeeName} · {payload?.employeeId}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* ── Success state ── */}
        {successMsg ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 3,
              px: 1,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.success.main, 0.12),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircleOutlineRoundedIcon
                sx={{ fontSize: 36, color: "success.main" }}
              />
            </Box>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
              Done!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
              {successMsg}
            </Typography>
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.06),
                border: "1px solid",
                borderColor: alpha(theme.palette.success.main, 0.2),
                width: "100%",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Updated bonus: ${parseFloat(newBonus || 0).toLocaleString()}
              </Typography>
              {comments.trim() && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Remarks: "{comments.trim()}"
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <>
            {/* Rejection summary card */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.1 : 0.04),
                border: "1px solid",
                borderColor: alpha(theme.palette.error.main, 0.2),
              }}
            >
              <Typography
                variant="subtitle2"
                color="error.main"
                sx={{ mb: 1.5, fontWeight: 700 }}
              >
                Rejection Details
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, fontWeight: 500 }}>
                    Rejected by:
                  </Typography>
                  <Typography variant="body2">
                    {payload?.rejectedBy} (Level {payload?.rejectorLevel} Approver)
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, fontWeight: 500 }}>
                    Current amount:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ${(payload?.currentBonus || 0).toLocaleString()}
                  </Typography>
                </Box>
                {payload?.rejectionReason && (
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, fontWeight: 500 }}>
                      Reason:
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      "{payload.rejectionReason}"
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Revised bonus input */}
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Enter Revised Bonus Amount
            </Typography>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label="Revised 2025 Bonus ($)"
              value={newBonus}
              onChange={(e) => setNewBonus(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: (
                  <AttachMoneyRoundedIcon
                    sx={{ mr: 0.5, color: "text.secondary", fontSize: 20 }}
                  />
                ),
              }}
              helperText="Submitting will auto-approve your level and forward to the next approver."
              sx={{ mb: 2.5 }}
            />

            {/* Remarks / comments */}
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Remarks <Typography component="span" variant="caption" color="text.disabled">(optional)</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Add a remark or note"
              placeholder="e.g. Revised based on performance review..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${comments.length}/500`}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {successMsg ? (
          <Button
            onClick={handleClose}
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineRoundedIcon />}
            sx={{
              minWidth: 120,
              "&:hover": {
                bgcolor: "success.main",
                boxShadow: "none",
              },
            }}
          >
            Close
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={submitting} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              disabled={submitting || !newBonus}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CheckCircleOutlineRoundedIcon />
                )
              }
              sx={{ minWidth: 170 }}
            >
              {submitting ? "Submitting…" : "Approve & Resubmit"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ─── Notification Item ────────────────────────────────────────────────────────
const NotificationItem = ({ notification, onMarkRead, onOpenModal }) => {
  const theme = useTheme();
  const isUnread = !notification.isRead;

  return (
    <Box
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
      sx={{
        px: 2,
        py: 1.5,
        display: "flex",
        gap: 1.5,
        alignItems: "flex-start",
        cursor: "pointer",
        transition: "background 0.15s",
        bgcolor: isUnread
          ? alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.06)
          : "transparent",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.07),
        },
        borderLeft: isUnread
          ? `3px solid ${theme.palette.error.main}`
          : "3px solid transparent",
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          mt: 0.25,
          width: 34,
          height: 34,
          borderRadius: "50%",
          flexShrink: 0,
          bgcolor: isUnread
            ? alpha(theme.palette.error.main, 0.15)
            : alpha(theme.palette.action.selected, 0.5),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorOutlineRoundedIcon
          sx={{
            fontSize: 18,
            color: isUnread ? "error.main" : "text.secondary",
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isUnread ? 700 : 500,
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {notification.title}
          </Typography>
          {isUnread && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "error.main",
                flexShrink: 0,
              }}
            />
          )}
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.5, mb: 1 }}
        >
          {notification.message}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {/* Time */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <AccessTimeRoundedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled">
              {formatTimeAgo(notification.createdAt)}
            </Typography>
          </Box>

          {/* Bonus chip */}
          {notification.payload?.currentBonus != null && (
            <Chip
              size="small"
              label={`$${(notification.payload.currentBonus || 0).toLocaleString()}`}
              sx={{
                height: 18,
                fontSize: "0.68rem",
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                color: "warning.dark",
                fontWeight: 600,
              }}
            />
          )}

          {/* Action button */}
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(notification);
            }}
            sx={{
              ml: "auto",
              height: 22,
              fontSize: "0.68rem",
              px: 1.2,
              py: 0,
              minWidth: 0,
              borderRadius: 1,
              fontWeight: 600,
            }}
          >
            Review
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Main Notification Panel ──────────────────────────────────────────────────
export default function NotificationPanel({ iconSize = "small" }) {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState({ open: false, notification: null });
  const anchorRef = useRef(null);
  const pollingRef = useRef(null);

  const userId = user?.id || user?._id;

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/v2/notifications?recipientId=${userId}`);
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silently fail for background polls
    }
  }, [userId]);

  // ── Fetch count only (lightweight polling) ───────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/v2/notifications/count?recipientId=${userId}`);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silently fail
    }
  }, [userId]);

  // ── Initial load + polling ───────────────────────────────────────────────
  useEffect(() => {
    fetchCount();
    pollingRef.current = setInterval(fetchCount, 30000); // Poll every 30 s
    return () => clearInterval(pollingRef.current);
  }, [fetchCount]);

  // ── Open panel — load full list ──────────────────────────────────────────
  const handleOpen = async () => {
    setOpen((prev) => {
      if (!prev) {
        setLoading(true);
        fetchNotifications().finally(() => setLoading(false));
      }
      return !prev;
    });
  };

  const handleClose = () => setOpen(false);

  // ── Mark single as read ──────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/v2/notifications/${id}/read?recipientId=${userId}`, {
        recipientId: userId,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  // ── Mark all as read ─────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await api.patch(`/v2/notifications/mark-all-read?recipientId=${userId}`, {
        recipientId: userId,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  // ── Open review modal ────────────────────────────────────────────────────
  const handleOpenModal = (notification) => {
    setModalData({ open: true, notification });
    handleClose();
  };

  const handleCloseModal = () =>
    setModalData({ open: false, notification: null });

  // ── On resubmit success: re-fetch notifications + count ──────────────────
  const handleResubmitSuccess = () => {
    fetchNotifications();
    fetchCount();
  };

  // ─── Derived values ──────────────────────────────────────────────────────
  const hasUnread = unreadCount > 0;
  const isEmpty = notifications.length === 0;

  return (
    <>
      {/* Bell icon button with badge */}
      <ClickAwayListener onClickAway={handleClose}>
        <Box sx={{ position: "relative" }}>
          <Tooltip title="Notifications" arrow>
            <Badge
              badgeContent={unreadCount > 99 ? "99+" : unreadCount}
              color="error"
              invisible={!hasUnread}
              max={99}
              sx={{
                [`& .${badgeClasses.badge}`]: {
                  right: 2,
                  top: 2,
                  fontSize: "0.6rem",
                  minWidth: 16,
                  height: 16,
                  px: 0.4,
                },
              }}
            >
              <IconButton
                ref={anchorRef}
                size={iconSize}
                onClick={handleOpen}
                aria-label="Open notifications"
                sx={{
                  color: hasUnread ? "error.main" : "text.secondary",
                  transition: "color 0.2s",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {hasUnread ? (
                  <NotificationsRoundedIcon />
                ) : (
                  <NotificationsNoneRoundedIcon />
                )}
              </IconButton>
            </Badge>
          </Tooltip>

          {/* Dropdown panel */}
          <Fade in={open}>
            <Paper
              elevation={8}
              sx={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 400,
                maxWidth: "calc(100vw - 24px)",
                maxHeight: 520,
                display: open ? "flex" : "none",
                flexDirection: "column",
                borderRadius: 3,
                overflow: "hidden",
                zIndex: 1400,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: theme.palette.baseShadow ||
                  "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {/* ── Header ── */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: "background.paper",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <NotificationsRoundedIcon
                    sx={{ fontSize: 20, color: "primary.main" }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Notifications
                  </Typography>
                  {hasUnread && (
                    <Chip
                      label={unreadCount}
                      size="small"
                      color="error"
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        "& .MuiChip-label": { px: 0.8 },
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {hasUnread && (
                    <Tooltip title="Mark all as read" arrow>
                      <IconButton
                        size="small"
                        onClick={handleMarkAllRead}
                        sx={{ color: "text.secondary" }}
                      >
                        <DoneAllRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{ color: "text.secondary" }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* ── Body ── */}
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      py: 6,
                    }}
                  >
                    <CircularProgress size={32} />
                  </Box>
                ) : isEmpty ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 6,
                      px: 3,
                      gap: 1.5,
                      color: "text.secondary",
                    }}
                  >
                    <NotificationsNoneRoundedIcon
                      sx={{ fontSize: 48, opacity: 0.3 }}
                    />
                    <Typography variant="body2" align="center">
                      No notifications yet
                    </Typography>
                    <Typography
                      variant="caption"
                      align="center"
                      color="text.disabled"
                    >
                      You'll be notified here when a bonus you reviewed is
                      rejected by a higher-level approver.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {notifications.map((n, idx) => (
                      <React.Fragment key={n.id}>
                        <NotificationItem
                          notification={n}
                          onMarkRead={handleMarkRead}
                          onOpenModal={handleOpenModal}
                        />
                        {idx < notifications.length - 1 && (
                          <Divider sx={{ mx: 2, opacity: 0.5 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                )}
              </Box>

              {/* ── Footer ── */}
              {!isEmpty && (
                <>
                  <Divider />
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.25,
                      display: "flex",
                      justifyContent: "center",
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      Showing {notifications.length} notification
                      {notifications.length !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Fade>
        </Box>
      </ClickAwayListener>

      {/* Resubmit modal */}
      <ResubmitBonusModal
        open={modalData.open}
        onClose={handleCloseModal}
        notification={modalData.notification}
        onSuccess={handleResubmitSuccess}
      />
    </>
  );
}
