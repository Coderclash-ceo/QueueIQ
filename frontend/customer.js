// customer.js — QueueIQ Customer-Facing Web Application
// Implements 7 patient screens matching QueueIQ layout with Figma tokens.

let services = [];
let selectedService = null;
let currentTokenId = localStorage.getItem("queueiq_active_token_id") || null;
let currentAppointment = JSON.parse(localStorage.getItem("queueiq_last_appointment") || "null");
let statusPollTimer = null;
let agingTickerTimer = null;
let tokenQueueEnteredAt = null;
let tokenBaseTier = 0;

// Default clinic departments if backend is initially empty
const DEFAULT_SERVICES = [
  { id: "dept_opd", name: "General OPD", avgServiceTimeMins: 10, icon: "🩺", desc: "Primary health consultations, routine checkups & prescriptions." },
  { id: "dept_peds", name: "Pediatrics", avgServiceTimeMins: 15, icon: "👶", desc: "Child care, vaccinations and developmental health assessments." },
  { id: "dept_derm", name: "Dermatology", avgServiceTimeMins: 15, icon: "🧴", desc: "Skin diseases, allergy screenings and cosmetic dermatology." },
  { id: "dept_cardio", name: "Cardiology", avgServiceTimeMins: 20, icon: "❤️", desc: "ECG reviews, cardiovascular checkups and hypertension care." },
  { id: "dept_ortho", name: "Orthopedics", avgServiceTimeMins: 15, icon: "🦴", desc: "Joint pain, bone injuries and mobility assessments." },
  { id: "dept_ent", name: "ENT Specialist", avgServiceTimeMins: 12, icon: "👂", desc: "Ear, nose and throat diagnostics and infection treatments." }
];

// Screen Navigation
function showScreen(screenId) {
  document.querySelectorAll(".screen-view").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
  }

  // Update top nav links and pills
  document.querySelectorAll(".nav-link-btn, .nav-pill-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId || btn.dataset.targetScreen === screenId);
  });

  // Screen-specific triggers
  if (screenId === "screen-home") {
    renderHome();
  } else if (screenId === "screen-browse") {
    renderBrowseServices();
  } else if (screenId === "screen-live-status") {
    if (currentTokenId) {
      startLiveTracking(currentTokenId);
    } else {
      renderNoActiveToken();
    }
  }

  // Smooth scroll to top of window
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Toast helper
function showToast(message, type = "success") {
  const toast = document.getElementById("customerToast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast-notice ${type} show`;
  setTimeout(() => {
    toast.className = "toast-notice";
  }, 3200);
}

// Copy ID helper
function copyToClipboard(text, message = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(() => {
    // Fallback for browsers
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast(message);
  });
}

// -------------------------------------------------------------
// DATA FETCHING
// -------------------------------------------------------------
async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      services = data.map((s, idx) => ({
        ...s,
        icon: DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length].icon,
        desc: s.desc || DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length].desc
      }));
    } else {
      services = DEFAULT_SERVICES;
    }
  } catch (err) {
    console.warn("Using default clinic services (backend offline or empty)", err);
    services = DEFAULT_SERVICES;
  }
}

// -------------------------------------------------------------
// SCREEN 1: HOME VIEW
// -------------------------------------------------------------
function renderHome() {
  // 1. Check if user has active token or appointment
  const upcomingBanner = document.getElementById("upcomingTrackerBanner");
  if (currentTokenId) {
    upcomingBanner.style.display = "block";
    document.getElementById("bannerTokenId").textContent = `#${currentTokenId.slice(0, 8)}`;
    const savedService = localStorage.getItem("queueiq_active_service_name");
    if (savedService) document.getElementById("bannerStatus").textContent = savedService;

    // Quick fetch live stats for home banner
    fetch(`${API_BASE}/tokens/${currentTokenId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error && data.status === "waiting") {
          document.getElementById("bannerPos").textContent = `#${data.position}`;
          document.getElementById("bannerEta").textContent = `~${data.etaMins || 0}m`;
        } else if (data && data.status === "called") {
          document.getElementById("bannerPos").textContent = "NOW";
          document.getElementById("bannerEta").textContent = "0m";
          document.getElementById("bannerStatus").textContent = "CALLED — Proceed to counter!";
        }
      })
      .catch(() => {});
  } else if (currentAppointment) {
    upcomingBanner.style.display = "block";
    document.getElementById("bannerTokenId").textContent = `Appt ID: ${currentAppointment.id.slice(0, 8)}`;
    document.getElementById("bannerStatus").textContent = `${currentAppointment.serviceName || "Scheduled"} (Not checked in)`;
    document.getElementById("bannerPos").textContent = "—";
    document.getElementById("bannerEta").textContent = "—";
  } else {
    upcomingBanner.style.display = "none";
  }

  // 2. Render Department Grid
  const grid = document.getElementById("homeDepartmentGrid");
  if (!grid) return;

  grid.innerHTML = services.slice(0, 6).map((service) => `
    <div class="department-card" onclick="selectServiceAndOpen('${service.id}')">
      <div>
        <div class="dept-icon-wrap" style="background: var(--primary-green-light)">
          ${service.icon || "🏥"}
        </div>
        <div class="dept-title">${service.name}</div>
      </div>
      <div class="dept-wait-chip">
        <span>⏱️</span> ~${service.avgServiceTimeMins || 15}m avg
      </div>
    </div>
  `).join("");
}

// -------------------------------------------------------------
// SCREEN 2: BROWSE SERVICES
// -------------------------------------------------------------
function renderBrowseServices(filterQuery = "") {
  const container = document.getElementById("browseServicesList");
  if (!container) return;

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (s.desc && s.desc.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-gray)">No clinic departments found.</div>`;
    return;
  }

  container.innerHTML = filtered.map((s) => `
    <div class="choice-action-card" onclick="selectServiceAndOpen('${s.id}')">
      <div class="choice-info">
        <div class="choice-icon" style="background: var(--primary-green-light)">
          ${s.icon || "🏥"}
        </div>
        <div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-dark)">${s.name}</div>
          <div style="font-size: 12px; color: var(--text-gray); margin-top: 2px">
            ⏱️ ${s.avgServiceTimeMins || 15} mins per consultation
          </div>
        </div>
      </div>
      <div class="choice-arrow">→</div>
    </div>
  `).join("");
}

function filterBrowseServices() {
  const q = document.getElementById("browseSearchInput")?.value || "";
  renderBrowseServices(q);
}

// -------------------------------------------------------------
// SCREEN 3: SERVICE DETAIL
// -------------------------------------------------------------
function selectServiceAndOpen(serviceId) {
  selectedService = services.find((s) => s.id === serviceId) || services[0];
  renderServiceDetail();
  showScreen("screen-service-detail");
}

function renderServiceDetail() {
  if (!selectedService) return;
  document.getElementById("detailServiceIcon").textContent = selectedService.icon || "🏥";
  document.getElementById("detailServiceName").textContent = selectedService.name;
  document.getElementById("detailServiceDesc").textContent = selectedService.desc || "Comprehensive clinic consultations and care.";
  document.getElementById("detailAvgTime").textContent = `${selectedService.avgServiceTimeMins || 15}m`;
}

function proceedToWalkin() {
  if (!selectedService) return;
  document.getElementById("walkinServiceName").textContent = selectedService.name;
  document.getElementById("walkinPatientName").value = localStorage.getItem("queueiq_patient_name") || "";
  selectWalkinCategory("general");
  showScreen("screen-walkin");
}

function proceedToBooking() {
  if (!selectedService) return;
  document.getElementById("bookingServiceName").textContent = selectedService.name;
  document.getElementById("bookingPatientName").value = localStorage.getItem("queueiq_patient_name") || "";
  selectBookingCategory("general");
  initBookingCalendar();
  showScreen("screen-booking");
}

// -------------------------------------------------------------
// SCREEN 4: WALKIN FLOW (GENERAL OR SENIOR ONLY)
// -------------------------------------------------------------
let activeWalkinCategory = "general";

function selectWalkinCategory(cat) {
  // Strict rule: Only general or senior
  if (cat !== "general" && cat !== "senior") return;
  activeWalkinCategory = cat;

  document.querySelectorAll("#walkinCategoryChips .category-chip").forEach((chip) => {
    chip.classList.toggle("selected", chip.dataset.cat === cat);
  });
}

async function submitWalkin() {
  const patientName = document.getElementById("walkinPatientName").value.trim() || "Walk-in Patient";
  localStorage.setItem("queueiq_patient_name", patientName);

  if (!selectedService) {
    showToast("Please select a clinic service.", "error");
    return;
  }

  const submitBtn = document.getElementById("walkinSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Joining live queue...";

  try {
    const res = await fetch(`${API_BASE}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        userId: patientName,
        category: activeWalkinCategory // "general" or "senior" ONLY
      })
    });

    const data = await res.json();
    if (data.error) {
      showToast(data.error, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm & Join Queue";
      return;
    }

    // Save token
    currentTokenId = data.id;
    localStorage.setItem("queueiq_active_token_id", data.id);
    localStorage.setItem("queueiq_active_service_name", selectedService.name);

    showToast("Successfully joined the queue!");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm & Join Queue";

    // Navigate to live status
    showScreen("screen-live-status");
  } catch (err) {
    console.error("Walkin join error", err);
    showToast("Failed to join queue. Ensure backend is running.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm & Join Queue";
  }
}

// -------------------------------------------------------------
// SCREEN 5: BOOK APPOINTMENT FLOW (CALENDAR + CONFIRMATION)
// -------------------------------------------------------------
let selectedDateObj = new Date();
let selectedTimeSlot = "10:00 - 10:30";
let activeBookingCategory = "general";

function selectBookingCategory(cat) {
  if (cat !== "general" && cat !== "senior") return;
  activeBookingCategory = cat;

  document.querySelectorAll("#bookingCategoryChips .category-chip").forEach((chip) => {
    chip.classList.toggle("selected", chip.dataset.cat === cat);
  });
}

function initBookingCalendar() {
  const container = document.getElementById("calendarDaysScroll");
  if (!container) return;

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const today = new Date();
  document.getElementById("calendarMonthTitle").textContent = `${months[today.getMonth()]} ${today.getFullYear()}`;

  let daysHtml = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayName = daysOfWeek[d.getDay()];
    const dayNum = d.getDate();
    const isSelected = i === 0;

    daysHtml += `
      <div class="day-chip ${isSelected ? "selected" : ""}" data-date="${d.toISOString()}" onclick="selectCalendarDay(this)">
        <span class="weekday">${dayName}</span>
        <span class="daynum">${dayNum}</span>
        <span class="slots-count">${5 - (i % 3)} slots</span>
      </div>
    `;
  }
  container.innerHTML = daysHtml;
  selectedDateObj = today;
  selectTimeSlot("10:00 - 10:30");
}

function selectCalendarDay(el) {
  document.querySelectorAll(".day-chip").forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
  selectedDateObj = new Date(el.dataset.date);
}

function selectTimeSlot(slotStr) {
  selectedTimeSlot = slotStr;
  document.querySelectorAll(".time-slot-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.slot === slotStr);
  });
}

async function submitBooking() {
  const patientName = document.getElementById("bookingPatientName").value.trim() || "Patient";
  localStorage.setItem("queueiq_patient_name", patientName);

  if (!selectedService) {
    showToast("Select a clinic service.", "error");
    return;
  }

  const [startHour, startMin] = selectedTimeSlot.split(" - ")[0].split(":").map(Number);
  const apptDate = new Date(selectedDateObj);
  apptDate.setHours(startHour, startMin, 0, 0);
  const appointmentTime = apptDate.getTime();

  const submitBtn = document.getElementById("bookingSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Reserving your slot...";

  try {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        userId: patientName,
        appointmentTime,
        category: activeBookingCategory // "general" or "senior" ONLY
      })
    });

    const data = await res.json();
    if (data.error) {
      showToast(data.error, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
      return;
    }

    // Save appointment details
    currentAppointment = {
      id: data.id,
      patientName,
      serviceName: selectedService.name,
      appointmentTime,
      category: activeBookingCategory
    };
    localStorage.setItem("queueiq_last_appointment", JSON.stringify(currentAppointment));

    // Render confirmed screen
    document.getElementById("confirmedApptId").textContent = data.id;
    document.getElementById("confirmedPatient").textContent = patientName;
    document.getElementById("confirmedService").textContent = selectedService.name;
    document.getElementById("confirmedTime").textContent = `${apptDate.toLocaleDateString()} at ${selectedTimeSlot}`;
    document.getElementById("confirmedCategory").textContent = activeBookingCategory === "senior" ? "Senior Citizen" : "General";

    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm Booking";

    showScreen("screen-booking-confirmed");
  } catch (err) {
    console.error("Booking error", err);
    showToast("Failed to book appointment.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm Booking";
  }
}

// -------------------------------------------------------------
// SCREEN 6: CHECK-IN SCREEN
// -------------------------------------------------------------
function prefillCheckinId(apptId) {
  const input = document.getElementById("checkinApptInput");
  if (input) input.value = apptId;
  showScreen("screen-checkin");
}

async function submitCheckin() {
  const apptId = document.getElementById("checkinApptInput").value.trim();
  if (!apptId) {
    showToast("Please enter your Appointment ID.", "error");
    return;
  }

  const checkinBtn = document.getElementById("checkinSubmitBtn");
  checkinBtn.disabled = true;
  checkinBtn.textContent = "Checking in...";

  try {
    const res = await fetch(`${API_BASE}/appointments/${apptId}/checkin`, {
      method: "POST"
    });
    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      checkinBtn.disabled = false;
      checkinBtn.textContent = "Check In & Enter Queue";
      return;
    }

    // Checked in! Active token is created
    currentTokenId = data.id;
    localStorage.setItem("queueiq_active_token_id", data.id);

    showToast("Check-in successful! Joined live queue.");
    checkinBtn.disabled = false;
    checkinBtn.textContent = "Check In & Enter Queue";

    showScreen("screen-live-status");
  } catch (err) {
    console.error("Checkin error", err);
    showToast("Check-in failed. Please verify your appointment ID.", "error");
    checkinBtn.disabled = false;
    checkinBtn.textContent = "Check In & Enter Queue";
  }
}

// -------------------------------------------------------------
// SCREEN 7: LIVE STATUS & STARVATION AGING CLOCK
// -------------------------------------------------------------
function renderNoActiveToken() {
  document.getElementById("liveTrackingActive").style.display = "none";
  document.getElementById("liveTrackingEmpty").style.display = "block";
}

function startLiveTracking(tokenId) {
  currentTokenId = tokenId;
  localStorage.setItem("queueiq_active_token_id", tokenId);
  document.getElementById("liveTrackingActive").style.display = "block";
  document.getElementById("liveTrackingEmpty").style.display = "none";
  document.getElementById("liveTokenIdDisplay").textContent = tokenId;

  if (statusPollTimer) clearInterval(statusPollTimer);
  if (agingTickerTimer) clearInterval(agingTickerTimer);

  pollLiveStatus();
  statusPollTimer = setInterval(pollLiveStatus, 4000); // 4-5s interval per spec

  // 1-second interval ticker for smooth aging countdown
  agingTickerTimer = setInterval(updateAgingTick, 1000);
}

async function pollLiveStatus() {
  if (!currentTokenId) return;

  try {
    const res = await fetch(`${API_BASE}/tokens/${currentTokenId}/status`);
    const data = await res.json();

    if (data.error) {
      console.warn("Token status error", data.error);
      return;
    }

    tokenBaseTier = data.baseTier !== undefined ? data.baseTier : 0;
    tokenQueueEnteredAt = data.queueEnteredAt || Date.now();

    // Position & ETA
    const posElem = document.getElementById("liveQueuePosition");
    const etaElem = document.getElementById("liveEtaMinutes");
    const statusPill = document.getElementById("liveStatusPill");
    const calledModal = document.getElementById("calledNoticeModal");

    const rxBtn = document.getElementById("btnViewPrescription");

    if (data.status === "waiting") {
      posElem.textContent = `#${data.position}`;
      etaElem.textContent = `${data.etaMins || 0} min`;
      statusPill.textContent = "Waiting in Queue";
      statusPill.className = "live-badge-status waiting";
      calledModal.style.display = "none";
      if (rxBtn) rxBtn.style.display = "none";
    } else if (data.status === "called") {
      posElem.textContent = "NOW";
      etaElem.textContent = "0 min";
      statusPill.textContent = "CALLED — PROCEED TO COUNTER";
      statusPill.className = "live-badge-status called";
      calledModal.style.display = "block";
      document.getElementById("calledCounterName").textContent = data.counterId ? `Counter ${data.counterId.slice(0, 4)}` : "Assigned Counter";
      if (rxBtn) rxBtn.style.display = "none";
    } else if (data.status === "completed") {
      posElem.textContent = "✓";
      etaElem.textContent = "Done";
      statusPill.textContent = "Consultation Completed";
      statusPill.className = "live-badge-status completed";
      calledModal.style.display = "none";
      if (rxBtn) rxBtn.style.display = "block";
      clearInterval(statusPollTimer);
      clearInterval(agingTickerTimer);
    } else if (data.status === "no-show") {
      posElem.textContent = "✕";
      etaElem.textContent = "Closed";
      statusPill.textContent = "Marked as No-Show";
      statusPill.className = "live-badge-status no-show";
      calledModal.style.display = "none";
      if (rxBtn) rxBtn.style.display = "none";
      clearInterval(statusPollTimer);
      clearInterval(agingTickerTimer);
    }

    // Effective Tier Badge
    const effectiveTier = data.effectiveTier !== null && data.effectiveTier !== undefined ? data.effectiveTier : tokenBaseTier;
    const tierBadge = document.getElementById("liveTierBadge");
    tierBadge.className = `tier-badge tier-${effectiveTier}`;

    const tierLabels = [
      "Tier 0 · General Walk-in",
      "Tier 1 · Booked Appointment",
      "Tier 2 · Senior Citizen",
      "Tier 3 · VIP / Doctor-Referred"
    ];
    tierBadge.textContent = tierLabels[effectiveTier] || `Tier ${effectiveTier}`;

    // Update aging math
    updateAgingUI(data.baseTier, data.queueEnteredAt, effectiveTier);
  } catch (err) {
    console.warn("Error polling token status", err);
  }
}

function updateAgingUI(baseTier, queueEnteredAt, effectiveTier) {
  if (!queueEnteredAt) return;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - queueEnteredAt);
  const totalMinutes = Math.floor(elapsedMs / (60 * 1000));
  const msInCurrentBucket = elapsedMs % (5 * 60 * 1000);
  const msToNextBucket = (5 * 60 * 1000) - msInCurrentBucket;

  // Elapsed wait string
  const m = Math.floor(elapsedMs / 60000);
  const s = Math.floor((elapsedMs % 60000) / 1000);
  document.getElementById("agingWaitDuration").textContent = `${m}m ${s < 10 ? '0' : ''}${s}s waited`;

  // Next tier countdown
  const progressPct = (msInCurrentBucket / (5 * 60 * 1000)) * 100;
  const progressBar = document.getElementById("agingProgressBar");
  if (progressBar) progressBar.style.width = `${progressPct}%`;

  const countdownElem = document.getElementById("agingCountdownText");
  if (effectiveTier >= 3) {
    countdownElem.textContent = "Max Priority Tier (Tier 3) Reached";
    if (progressBar) progressBar.style.width = "100%";
  } else {
    const nextM = Math.floor(msToNextBucket / 60000);
    const nextS = Math.floor((msToNextBucket % 60000) / 1000);
    countdownElem.textContent = `Next tier boost in ${nextM}m ${nextS < 10 ? '0' : ''}${nextS}s (+1 Tier)`;
  }

  // Formula honest breakdown
  const bumps = Math.floor(elapsedMs / (5 * 60 * 1000));
  document.getElementById("agingFormulaBreakdown").textContent =
    `Base Tier ${baseTier} + ${bumps} aging boost(s) = Effective Tier ${effectiveTier} (Capped at 3).`;
}

function updateAgingTick() {
  if (!tokenQueueEnteredAt) return;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - tokenQueueEnteredAt);
  const m = Math.floor(elapsedMs / 60000);
  const s = Math.floor((elapsedMs % 60000) / 1000);
  const durationElem = document.getElementById("agingWaitDuration");
  if (durationElem) durationElem.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s waited`;
}

function leaveOrClearQueue() {
  if (confirm("Are you sure you want to stop tracking this token?")) {
    clearInterval(statusPollTimer);
    clearInterval(agingTickerTimer);
    localStorage.removeItem("queueiq_active_token_id");
    currentTokenId = null;
    showScreen("screen-home");
  }
}

// -------------------------------------------------------------
// PATIENT DIGITAL PRESCRIPTION (Rx) VIEWER & PRINT
// -------------------------------------------------------------
async function openPatientRxModal() {
  if (!currentTokenId) return;

  const modal = document.getElementById("patientRxModal");
  const content = document.getElementById("patientRxContent");
  if (!modal || !content) return;

  content.innerHTML = `<div style="text-align:center; padding: 32px; color:#64748B;">Loading your verified electronic prescription...</div>`;
  modal.style.display = "flex";

  try {
    const res = await fetch(`${API_BASE}/tokens/${currentTokenId}/prescription`);
    const data = await res.json();

    if (data.error) {
      content.innerHTML = `
        <div style="text-align:center; padding: 32px;">
          <div style="font-size: 36px; margin-bottom: 8px;">📋</div>
          <h3 style="font-size: 16px; color: var(--text-dark); margin-bottom: 6px;">Prescription Not Available</h3>
          <p style="font-size: 13px; color: var(--text-muted);">The attending doctor did not issue a digital prescription for this visit.</p>
        </div>
      `;
      return;
    }

    const medRows = (data.medicines && data.medicines.length > 0)
      ? data.medicines.map((m, i) => `
          <tr>
            <td><strong>${i + 1}. ${m.name}</strong></td>
            <td>${m.dosage || "1 tab"}</td>
            <td>${m.frequency || "1-0-1"}</td>
            <td>${m.duration || "3 Days"}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No medications prescribed.</td></tr>`;

    content.innerHTML = `
      <div class="rx-slip-header">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <div class="brand-badge" style="width:28px; height:28px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 2h2a2 2 0 0 1 2 2v4h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4v4a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2z" fill="currentColor" fill-opacity="0.25"/><path d="M3 12h4.5l2-4 3.5 8 2.5-5 1.5 2H21" stroke-width="2.3"/></svg>
            </div>
            <strong style="font-size: 16px; color:#0f172a;">QueueIQ Central Healthcare Clinic</strong>
          </div>
          <div style="font-size: 12px; color:#64748b;">Department of Outpatient Care &amp; Clinical Medicine</div>
          <div style="font-size: 12px; color:#059669; font-weight: 600; margin-top:2px;">Consultant: ${data.doctorName || "Dr. A. Sharma (OPD)"}</div>
        </div>
        <div style="text-align:right;">
          <div class="rx-symbol">℞</div>
          <div style="font-size: 11px; color:#64748b; margin-top:4px;">${new Date(data.completedAt || Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div style="background:#f8fafc; border-radius:10px; padding:12px 16px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
        <div><strong>Patient Name:</strong> <span style="color:#0f172a;">${data.patientName || "Patient"}</span></div>
        <div><strong>Token Ref:</strong> <code style="font-weight:700; color:#059669;">#${(data.tokenId || currentTokenId).slice(0, 8)}</code></div>
        <div style="grid-column: 1/-1;"><strong>Primary Diagnosis:</strong> <span style="color:#0f172a; font-weight:600;">${data.diagnosis || "Clinical Consultation"}</span></div>
      </div>

      ${data.clinicalNotes ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:4px;">Clinical Observations &amp; Notes:</div>
          <div style="font-size:13px; color:#1e293b; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">${data.clinicalNotes}</div>
        </div>
      ` : ""}

      <div style="margin-bottom:16px;">
        <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">Prescribed Medications (Rx):</div>
        <table class="rx-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medRows}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:20px; font-size:12px; color:#475569; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px;">
        <strong style="color:#065f46;">Doctor's Advice:</strong> ${data.advice || "Take medicines as scheduled and maintain adequate hydration."}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px dashed #cbd5e1; padding-top:16px; margin-top:20px;">
        <div style="font-size:10px; color:#94a3b8;">
          Digitally generated by QueueIQ Healthcare System.<br>Verified Electronic Medical Prescription Slip.
        </div>
        <div style="text-align:center;">
          <div style="font-family:'Courier New', monospace; font-size:13px; font-weight:700; color:#0f172a; border-bottom:1px solid #0f172a; padding-bottom:2px; min-width:120px;">
            ${data.doctorName || "Dr. A. Sharma"}
          </div>
          <div style="font-size:10px; color:#64748b; margin-top:2px;">Attending Physician</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Prescription load error", err);
    content.innerHTML = `<div style="text-align:center; padding:24px; color:#ef4444;">Failed to load prescription slip.</div>`;
  }
}

function closePatientRxModal() {
  const modal = document.getElementById("patientRxModal");
  if (modal) modal.style.display = "none";
}

// -------------------------------------------------------------
// APP INITIALIZATION
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
  renderHome();

  // If patient already has an active token, offer quick resume
  if (currentTokenId) {
    // Keep on home but enable live indicator
    renderHome();
  }
});
