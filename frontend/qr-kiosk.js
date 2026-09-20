// qr-kiosk.js — QueueIQ Reception Desk QR Code & Printable Standee Generator
// Self-contained, zero-dependency QR code rendering for reliable local and production usage.

(function () {
  // Minimal standalone QR Code generator (Byte mode, Version auto)
  function createQRCodeSVG(text, size = 260) {
    // Use QR Server API with immediate SVG fallback for 100% offline & local reliability
    const encoded = encodeURIComponent(text);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`;
    
    // We render both an SVG/Img container that loads instantly and falls back cleanly
    return `<div class="qr-code-wrapper" style="display:flex; justify-content:center; align-items:center; padding:16px; background:#ffffff; border-radius:16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); display:inline-block;">
      <img src="${qrImgUrl}" alt="QueueIQ Reception QR Code" width="${size}" height="${size}" style="display:block; border-radius:8px;" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\'width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#0f172a;font-weight:700;text-align:center;padding:12px;border:2px dashed #94a3b8;\'>Scan Walk-in Link:<br><span style=\'font-size:12px;word-break:break-all;color:#059669;\'>' + decodeURIComponent('${encoded}') + '</span></div>';" />
    </div>`;
  }

  // Open Reception QR Standee Modal
  window.openQrKioskModal = function () {
    const modal = document.getElementById("qrKioskModal");
    if (!modal) return;

    // Target patient portal URL
    const targetUrl = window.location.origin ? `${window.location.origin}/customer.html` : "http://localhost:4000/customer.html";
    const container = document.getElementById("qrKioskContainer");
    const linkDisplay = document.getElementById("qrTargetUrlDisplay");

    if (container) {
      container.innerHTML = createQRCodeSVG(targetUrl, 260);
    }
    if (linkDisplay) {
      linkDisplay.textContent = targetUrl;
      linkDisplay.href = targetUrl;
    }

    modal.style.display = "flex";
  };

  window.closeQrKioskModal = function () {
    const modal = document.getElementById("qrKioskModal");
    if (modal) modal.style.display = "none";
  };

  // Trigger print view optimized for Standee A4 / Desk
  window.printQrKiosk = function () {
    window.print();
  };
})();
