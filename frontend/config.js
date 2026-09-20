// config.js — Global API configuration
// Supports local development, LAN mobile access, tunnels, and cloud deployments
const API_BASE = (() => {
  if (typeof window !== "undefined") {
    if (window.__API_BASE__) return window.__API_BASE__;
    const stored = localStorage.getItem("SAQMS_BACKEND_URL");
    if (stored) return stored.replace(/\/$/, "");
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      // If port is 4000 OR running through a public tunnel (port 80/443)
      if (window.location.port === "4000" || (!["5500", "3000", "5173"].includes(window.location.port))) {
        return window.location.origin;
      }
    }
  }
  return "http://localhost:4000";
})();

