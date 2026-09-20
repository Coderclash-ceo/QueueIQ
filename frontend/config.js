// config.js — Global API configuration
// Supports local development and cloud deployments (Render/Vercel)
const API_BASE = (() => {
  if (typeof window !== "undefined") {
    if (window.__API_BASE__) return window.__API_BASE__;
    const stored = localStorage.getItem("SAQMS_BACKEND_URL");
    if (stored) return stored.replace(/\/$/, "");
    if ((window.location.protocol === "http:" || window.location.protocol === "https:") && window.location.port === "4000") {
      return window.location.origin;
    }
  }
  return "http://localhost:4000";
})();

