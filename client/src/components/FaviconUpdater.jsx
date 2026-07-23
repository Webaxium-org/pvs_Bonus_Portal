import { useEffect } from "react";
import { useColorScheme } from "@mui/material/styles";
import logoLight from "../assets/logo.png";
import logoDark from "../assets/logo_black.png";

/**
 * Component that dynamically updates the favicon based on the current theme
 * Works with both manual theme selection and system preferences
 */
const FaviconUpdater = () => {
  const { mode, systemMode } = useColorScheme();

  useEffect(() => {
    // Determine the actual mode being used (system preference or user selection)
    const resolvedMode = (mode === 'system' ? systemMode : mode) || 'light';

    // Get the favicon link element
    const favicon = document.getElementById("favicon");

    if (favicon) {
      // Update favicon based on theme
      // Dark mode: use light logo (logo.png)
      // Light mode: use dark logo (logo_black.png)
      favicon.href = resolvedMode === 'dark' ? logoLight : logoDark;
    }
  }, [mode, systemMode]);

  // This component doesn't render anything
  return null;
};

export default FaviconUpdater;
