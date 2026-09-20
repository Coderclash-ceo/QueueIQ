// staff.js — TokenIQ Staff Command Dashboard
// Comprehensive clinic queue, counter, appointment & VIP management logic.

let allServices = [];
let allCounters = [];
let allTokens = [];
let allAppointments = [];
let currentView = "view-overview";
let autoRefreshTimer = null;

// View Navigation
function showStaffView(viewId) {
  currentView = viewId;
  document.querySelectorAll(".dashboard-view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });
}

// Toast Feedback Helper
function showStaffToast(message, type = "success") {
  const toast = document.getElementById("staffToast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast-notice ${type} show`;
  setTimeout(() => {
    toast.className = "toast-notice";
  }, 3200);
}

// Helper: Format duration (minutes/seconds) from epoch ms
function formatDuration(ms) {
  if (!ms || ms < 0) return "0m";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

// Helper: Tier badge HTML with Starvation indicators
function getTierBadgeHtml(token) {
  const baseTier = token.baseTier !== undefined ? token.baseTier : 0;
  const effectiveTier = token.effectiveTier !== undefined ? token.effectiveTier : baseTier;
  const bumps = Math.max(0, effectiveTier - baseTier);

  let label = "Tier 0 · Walk-in";
  if (baseTier === 3) label = "Tier 3 · VIP";
  else if (baseTier === 2) label = "Tier 2 · Senior";
  else if (baseTier === 1) label = "Tier 1 · Appt";

  let html = `<span class="tier-badge tier-${effectiveTier}">${label}`;
  if (bumps > 0) {
    html += ` <span style="background: rgba(0,0,0,0.15); padding: 1px 5px; border-radius: 4px; font-size: 10px; margin-left: 2px;">+${bumps} aging</span>`;
  }
  html += `</span>`;
  return html;
}

// -------------------------------------------------------------
// DATA FETCHING & SYNCHRONIZATION
// -------------------------------------------------------------
async function fetchStaffData() {
  try {
    const [servicesRes, countersRes, tokensRes, apptsRes] = await Promise.all([
      fetch(`${API_BASE}/services`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/counters`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/tokens`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/appointments`).then((r) => r.json()).catch(() => []),
    ]);

    allServices = Array.isArray(servicesRes) ? servicesRes : [];
    allCounters = Array.isArray(countersRes) ? countersRes : [];
    allTokens = Array.isArray(tokensRes) ? tokensRes : [];
    allAppointments = Array.isArray(apptsRes) ? apptsRes : [];

    updateBadgeCounts();
    populateServiceDropdowns();

    renderOverview();
    renderQueueTable();
    renderCountersGrid();
    renderAppointmentsTable();
    renderServicesList();
  } catch (err) {
    console.error("Error synchronizing staff dashboard", err);
  }
}

// Update sidebar badge counters
function updateBadgeCounts() {
  const waitingCount = allTokens.filter((t) => t.status === "waiting").length;
  const elWaiting = document.getElementById("sidebarQueueCount");
  if (elWaiting) elWaiting.textContent = waitingCount;

  const elCounters = document.getElementById("sidebarCounterCount");
  if (elCounters) elCounters.textContent = allCounters.length;
}

// Populate Service Dropdowns (Counters, VIP, Queue Filter)
function populateServiceDropdowns() {
  const selects = [
    document.getElementById("newCounterServiceSelect"),
    document.getElementById("vipServiceSelect"),
    document.getElementById("queueServiceFilter"),
  ];

  selects.forEach((sel) => {
    if (!sel) return;
    const currentVal = sel.value;
    const isFilter = sel.id === "queueServiceFilter";

    let opts = isFilter ? `<option value="">All Specialties</option>` : "";
    if (allServices.length === 0 && !isFilter) {
      opts = `<option value="">No services added yet</option>`;
    } else {
      opts += allServices
        .map((s) => `<option value="${s.id}">${s.name} (~${s.avgServiceTimeMins || 15}m)</option>`)
        .join("");
    }
    sel.innerHTML = opts;
    if (currentVal) sel.value = currentVal;
  });
}

// -------------------------------------------------------------
// VIEW 1: OVERVIEW DASHBOARD & KPIS
// -------------------------------------------------------------
function renderOverview() {
  const waitingTokens = allTokens.filter((t) => t.status === "waiting");
  const servingCounters = allCounters.filter((c) => c.currentTokenId);
  const scheduledAppts = allAppointments.filter((a) => a.status === "scheduled");

  // Calculate Avg Wait
  const totalWaitMins = waitingTokens.reduce((acc, t) => acc + (t.minutesWaited || 0), 0);
  const avgWait = waitingTokens.length > 0 ? Math.round(totalWaitMins / waitingTokens.length) : 0;

  const kpiWaiting = document.getElementById("kpiWaitingCount");
  if (kpiWaiting) kpiWaiting.textContent = waitingTokens.length;

  const kpiCounters = document.getElementById("kpiActiveCounters");
  if (kpiCounters) kpiCounters.textContent = `${servingCounters.length} / ${allCounters.length}`;

  const kpiAppts = document.getElementById("kpiAppointmentsCount");
  if (kpiAppts) kpiAppts.textContent = scheduledAppts.length;

  const kpiAvg = document.getElementById("kpiAvgWait");
  if (kpiAvg) kpiAvg.textContent = `${avgWait} min`;

  // Overview Quick Queue Preview (top 4 waiting tokens)
  const previewTbody = document.getElementById("overviewQueuePreview");
  if (previewTbody) {
    if (waitingTokens.length === 0) {
      previewTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-gray); padding: 24px;">No patients currently in queue.</td></tr>`;
    } else {
      previewTbody.innerHTML = waitingTokens.slice(0, 4).map((t, idx) => {
        const service = allServices.find((s) => s.id === t.serviceId) || { name: "Clinic Service" };
        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><code style="font-weight:700;">${t.id.slice(0, 8)}</code></td>
            <td><strong>${t.userId || "Patient"}</strong></td>
            <td>${service.name}</td>
            <td>${getTierBadgeHtml(t)}</td>
          </tr>
        `;
      }).join("");
    }
  }

  // Overview Quick Counters Preview
  const counterPreviewGrid = document.getElementById("overviewCountersPreview");
  if (counterPreviewGrid) {
    if (allCounters.length === 0) {
      counterPreviewGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--text-gray);">No counters configured. Add a counter to start calling patients.</div>`;
    } else {
      counterPreviewGrid.innerHTML = allCounters.slice(0, 3).map((c) => {
        const service = allServices.find((s) => s.id === c.serviceId) || { name: "General Service" };
        const currentToken = allTokens.find((t) => t.id === c.currentTokenId);
        const isServing = !!currentToken;

        return `
          <div class="counter-card ${isServing ? "" : "idle"}" style="padding: 16px;">
            <div class="counter-top">
              <strong style="font-size: 15px;">${c.name}</strong>
              <span class="counter-badge-status ${isServing ? "serving" : "idle"}">
                ${isServing ? "● Serving" : "○ Idle"}
              </span>
            </div>
            <div style="font-size: 12px; color: var(--text-gray); margin-bottom: 8px;">${service.name}</div>
            <div class="serving-patient-box" style="margin: 8px 0; padding: 10px;">
              <div style="font-size: 11px; color: var(--text-gray);">Current Patient</div>
              <strong style="font-size: 13px;">${currentToken ? currentToken.userId : "None (Waiting for call)"}</strong>
            </div>
            <div class="counter-btn-row">
              <button class="btn-action-sm call" style="flex:1;" onclick="callNextToken('${c.id}')">Call Next →</button>
              ${isServing ? `<button class="btn-action-sm done" onclick="completeToken('${currentToken.id}')">Done ✓</button>` : ""}
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

// -------------------------------------------------------------
// VIEW 2: LIVE PRIORITY QUEUE TABLE
// -------------------------------------------------------------
function renderQueueTable() {
  const tbody = document.getElementById("queueTableBody");
  if (!tbody) return;

  const serviceFilter = document.getElementById("queueServiceFilter")?.value || "";
  const statusFilter = document.getElementById("queueStatusFilter")?.value || "";

  let filtered = [...allTokens];
  if (serviceFilter) {
    filtered = filtered.filter((t) => t.serviceId === serviceFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter((t) => t.status === statusFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-gray);">No tokens found matching filter criteria.</td></tr>`;
    return;
  }

  const now = Date.now();

  tbody.innerHTML = filtered.map((t, idx) => {
    const service = allServices.find((s) => s.id === t.serviceId) || { name: "Clinic Service" };
    const waitDurationMs = now - (t.queueEnteredAt || now);
    const isWaiting = t.status === "waiting";
    const isCalled = t.status === "called";

    let statusBadge = "";
    if (isWaiting) statusBadge = `<span class="live-badge-status waiting" style="padding: 3px 8px; font-size: 11px;">waiting</span>`;
    else if (isCalled) statusBadge = `<span class="live-badge-status called" style="padding: 3px 8px; font-size: 11px;">called</span>`;
    else if (t.status === "completed") statusBadge = `<span class="live-badge-status completed" style="padding: 3px 8px; font-size: 11px;">completed</span>`;
    else if (t.status === "no-show") statusBadge = `<span class="live-badge-status no-show" style="padding: 3px 8px; font-size: 11px;">no-show</span>`;

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><code style="font-size: 12px; font-weight:700;">${t.id.slice(0, 8)}</code></td>
        <td>
          <div style="font-weight: 700; color: var(--text-dark);">${t.userId || "Anonymous"}</div>
          <div style="font-size: 11px; color: var(--text-gray); text-transform: capitalize;">${t.type} · ${t.category}</div>
        </td>
        <td>${service.name}</td>
        <td>${formatDuration(waitDurationMs)}</td>
        <td>${getTierBadgeHtml(t)}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${(isWaiting || isCalled) ? `
              <button class="btn-action-sm done" title="Mark Consultation Completed" onclick="completeToken('${t.id}')">✓ Complete</button>
              <button class="btn-action-sm danger" title="Mark No-Show" onclick="noShowToken('${t.id}')">✕ No-Show</button>
            ` : `<span style="font-size: 12px; color: var(--text-gray);">Finished</span>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// -------------------------------------------------------------
// VIEW 3: COUNTERS MANAGEMENT GRID
// -------------------------------------------------------------
function renderCountersGrid() {
  const container = document.getElementById("staffCountersGrid");
  if (!container) return;

  if (allCounters.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 48px; color: var(--text-gray);">No service counters active. Add a counter above to begin calling patients.</div>`;
    return;
  }

  container.innerHTML = allCounters.map((c) => {
    const service = allServices.find((s) => s.id === c.serviceId) || { name: "All Specialties" };
    const currentToken = allTokens.find((t) => t.id === c.currentTokenId);
    const isServing = !!currentToken;

    return `
      <div class="counter-card ${isServing ? "" : "idle"}">
        <div>
          <div class="counter-top">
            <h3 style="font-size: 17px; font-weight: 800; color: var(--text-dark);">${c.name}</h3>
            <span class="counter-badge-status ${isServing ? "serving" : "idle"}">
              ${isServing ? "● Serving" : "○ Idle"}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--primary-green); margin-bottom: 12px;">
            Specialty: ${service.name}
          </div>

          <div class="serving-patient-box">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-gray); text-transform: uppercase;">
              Active Consultation
            </div>
            ${currentToken ? `
              <div style="margin-top: 6px;">
                <div style="font-size: 16px; font-weight: 800; color: var(--text-dark);">${currentToken.userId}</div>
                <div style="font-size: 12px; color: var(--text-gray); margin: 2px 0;">Token: <code style="font-weight:700;">${currentToken.id.slice(0, 8)}</code></div>
                <div style="margin-top: 6px;">${getTierBadgeHtml(currentToken)}</div>
              </div>
            ` : `
              <div style="font-size: 13px; color: var(--text-gray); margin-top: 4px;">
                No patient currently called.
              </div>
            `}
          </div>
        </div>

        <div style="margin-top: 16px;">
          <div class="counter-btn-row">
            <button class="btn-action-sm call" style="flex: 2; padding: 10px;" onclick="callNextToken('${c.id}')">
              📢 Call Next Patient
            </button>
            ${isServing ? `
              <button class="btn-action-sm done" style="flex: 1; padding: 10px;" onclick="completeToken('${currentToken.id}')">
                ✓ Done
              </button>
            ` : ""}
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <button class="btn-action-sm danger" style="padding: 4px 10px; font-size: 11px;" onclick="deleteCounter('${c.id}')">
              Delete Counter
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// -------------------------------------------------------------
// VIEW 4: APPOINTMENTS MANAGEMENT
// -------------------------------------------------------------
function renderAppointmentsTable() {
  const tbody = document.getElementById("appointmentsTableBody");
  if (!tbody) return;

  if (allAppointments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 36px; color: var(--text-gray);">No appointments booked yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allAppointments.map((a) => {
    const service = allServices.find((s) => s.id === a.serviceId) || { name: "Clinic Service" };
    const dateStr = a.appointmentTime ? new Date(a.appointmentTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
    const isScheduled = a.status === "scheduled";

    let catBadge = `<span class="tier-badge tier-1">General</span>`;
    if (a.category === "vip") catBadge = `<span class="tier-badge tier-3">VIP / Doctor-Referred</span>`;
    else if (a.category === "senior") catBadge = `<span class="tier-badge tier-2">Senior Citizen</span>`;

    return `
      <tr>
        <td><code style="font-weight:700;">${a.id.slice(0, 8)}</code></td>
        <td><strong>${a.userId || "Patient"}</strong></td>
        <td>${service.name}</td>
        <td>${dateStr}</td>
        <td>${catBadge}</td>
        <td>
          <span class="live-badge-status ${isScheduled ? "waiting" : "completed"}" style="padding: 3px 8px; font-size: 11px;">
            ${a.status}
          </span>
        </td>
        <td>
          ${isScheduled ? `
            <button class="btn-action-sm call" onclick="checkinAppointment('${a.id}')">
              ⚡ Check In &amp; Queue
            </button>
          ` : `<span style="font-size: 12px; color: var(--text-gray);">Checked in</span>`}
        </td>
      </tr>
    `;
  }).join("");
}

// -------------------------------------------------------------
// VIEW 5: SERVICES MANAGEMENT
// -------------------------------------------------------------
function renderServicesList() {
  const tbody = document.getElementById("servicesTableBody");
  if (!tbody) return;

  if (allServices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 36px; color: var(--text-gray);">No specialties or services configured.</td></tr>`;
    return;
  }

  tbody.innerHTML = allServices.map((s) => {
    const waitingCount = allTokens.filter((t) => t.serviceId === s.id && t.status === "waiting").length;
    const countersCount = allCounters.filter((c) => c.serviceId === s.id).length;

    return `
      <tr>
        <td><strong style="font-size: 15px; color: var(--text-dark);">${s.name}</strong></td>
        <td>⏱️ ${s.avgServiceTimeMins || 15} mins</td>
        <td><span class="sidebar-badge">${waitingCount} waiting</span></td>
        <td>${countersCount} counter(s)</td>
        <td>
          <button class="btn-action-sm danger" onclick="deleteService('${s.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

// -------------------------------------------------------------
// STAFF ACTIONS & API CALLS
// -------------------------------------------------------------

// Call Next Customer on a counter
async function callNextToken(counterId) {
  try {
    const res = await fetch(`${API_BASE}/counters/${counterId}/call-next`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (data.error) {
      showStaffToast(data.error, "error");
    } else if (data.message === "No customers waiting") {
      showStaffToast("No waiting customers for this service.", "error");
    } else {
      showStaffToast(`Called token for ${data.token ? data.token.userId : "patient"}!`);
    }
    await fetchStaffData();
  } catch (err) {
    console.error("Error calling next", err);
    showStaffToast("Failed to call next customer.", "error");
  }
}

// Mark Token Completed
async function completeToken(tokenId) {
  try {
    const res = await fetch(`${API_BASE}/tokens/${tokenId}/complete`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else showStaffToast("Consultation marked as completed.");
    await fetchStaffData();
  } catch (err) {
    console.error("Error completing token", err);
    showStaffToast("Failed to mark completed.", "error");
  }
}

// Mark Token No-Show
async function noShowToken(tokenId) {
  if (!confirm("Are you sure you want to mark this patient as No-Show?")) return;
  try {
    const res = await fetch(`${API_BASE}/tokens/${tokenId}/no-show`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else showStaffToast("Token marked as No-Show.");
    await fetchStaffData();
  } catch (err) {
    console.error("Error marking no-show", err);
    showStaffToast("Failed to mark no-show.", "error");
  }
}

// Add Counter
async function addCounter() {
  const name = document.getElementById("newCounterName").value.trim();
  const serviceId = document.getElementById("newCounterServiceSelect").value;
  if (!name || !serviceId) return alert("Please enter a counter name and select a service.");

  try {
    const res = await fetch(`${API_BASE}/counters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, serviceId }),
    });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else {
      showStaffToast(`Counter "${name}" created.`);
      document.getElementById("newCounterName").value = "";
      await fetchStaffData();
    }
  } catch (err) {
    showStaffToast("Failed to create counter.", "error");
  }
}

// Delete Counter
async function deleteCounter(counterId) {
  if (!confirm("Delete this counter?")) return;
  try {
    const res = await fetch(`${API_BASE}/counters/${counterId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else {
      showStaffToast("Counter deleted.");
      await fetchStaffData();
    }
  } catch (err) {
    showStaffToast("Failed to delete counter.", "error");
  }
}

// Add Service
async function addService() {
  const name = document.getElementById("newServiceName").value.trim();
  const avgServiceTimeMins = Number(document.getElementById("newServiceAvgTime").value);
  if (!name || !avgServiceTimeMins) return alert("Please provide a specialty name and average duration.");

  try {
    const res = await fetch(`${API_BASE}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avgServiceTimeMins }),
    });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else {
      showStaffToast(`Service "${name}" added.`);
      document.getElementById("newServiceName").value = "";
      document.getElementById("newServiceAvgTime").value = "";
      await fetchStaffData();
    }
  } catch (err) {
    showStaffToast("Failed to add service.", "error");
  }
}

// Delete Service
async function deleteService(serviceId) {
  if (!confirm("Delete this clinic specialty?")) return;
  try {
    const res = await fetch(`${API_BASE}/services/${serviceId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else {
      showStaffToast("Service deleted.");
      await fetchStaffData();
    }
  } catch (err) {
    showStaffToast("Failed to delete service.", "error");
  }
}

// Book Staff-Authorized VIP Appointment (Strict Staff Feature)
async function bookVipAppointment() {
  const userId = document.getElementById("vipPatientName").value.trim();
  const serviceId = document.getElementById("vipServiceSelect").value;
  const dateTimeStr = document.getElementById("vipDateTime").value.trim();
  const notes = document.getElementById("vipNotes")?.value.trim() || "";

  if (!userId || !serviceId || !dateTimeStr) {
    return alert("Please complete the patient name, specialty, and scheduled time.");
  }

  const appointmentTime = new Date(dateTimeStr).getTime();
  if (isNaN(appointmentTime)) return alert("Invalid date/time format. Use YYYY-MM-DDTHH:mm");

  const submitBtn = document.getElementById("vipSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Authorizing VIP slot...";

  try {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        userId: notes ? `${userId} (${notes})` : userId,
        appointmentTime,
        category: "vip", // STRICT STAFF-ONLY PRIVILEGE
      }),
    });
    const data = await res.json();

    if (data.error) {
      showStaffToast(data.error, "error");
    } else {
      showStaffToast(`VIP Appointment authorized! ID: ${data.id}`);
      document.getElementById("vipPatientName").value = "";
      document.getElementById("vipDateTime").value = "";
      if (document.getElementById("vipNotes")) document.getElementById("vipNotes").value = "";
      await fetchStaffData();
      showStaffView("view-appointments");
    }
  } catch (err) {
    showStaffToast("Failed to authorize VIP appointment.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Authorize & Book VIP Slot";
  }
}

// Check In an Appointment from Staff Side
async function checkinAppointment(apptId) {
  try {
    const res = await fetch(`${API_BASE}/appointments/${apptId}/checkin`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.error) showStaffToast(data.error, "error");
    else {
      showStaffToast(`Appointment checked in! Token generated with Base Tier ${data.baseTier}.`);
      await fetchStaffData();
      showStaffView("view-queue");
    }
  } catch (err) {
    showStaffToast("Failed to check in appointment.", "error");
  }
}

// Seed Demo Data for Viva / Demonstration
async function seedDemoData() {
  try {
    showStaffToast("Seeding demo clinic departments, counters & queue...", "success");
    const res = await fetch(`${API_BASE}/demo/seed`, { method: "POST" });
    const data = await res.json();
    showStaffToast(data.message || "Demo data loaded!");
    await fetchStaffData();
  } catch (err) {
    showStaffToast("Failed to seed demo data. Check backend.", "error");
  }
}

// Clear Queue Tokens
async function clearQueueData() {
  if (!confirm("Are you sure you want to reset all queue tokens and appointments?")) return;
  try {
    const res = await fetch(`${API_BASE}/demo/clear-queue`, { method: "POST" });
    const data = await res.json();
    showStaffToast(data.message || "Queue cleared.");
    await fetchStaffData();
  } catch (err) {
    showStaffToast("Failed to clear queue.", "error");
  }
}

// Clock Updater
function updateClock() {
  const el = document.getElementById("staffLiveClock");
  if (el) {
    el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  updateClock();
  setInterval(updateClock, 1000);

  // Set default VIP datetime input to now
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
  const vipDateInput = document.getElementById("vipDateTime");
  if (vipDateInput) vipDateInput.value = localISOTime;

  await fetchStaffData();

  // Auto-refresh every 4 seconds for live dashboard experience
  autoRefreshTimer = setInterval(fetchStaffData, 4000);
});
