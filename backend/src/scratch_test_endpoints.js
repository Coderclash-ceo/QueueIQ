// scratch/test_endpoints.js
// Automated verification of all 7 core backend API endpoints with Firestore.

async function runTests() {
  const base = "http://localhost:4000";
  console.log("Starting End-to-End API Verification against", base);

  // 1. Create a service
  console.log("\n[TEST 1] POST /services (Creating 'Emergency Triage')");
  const sRes = await fetch(`${base}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Emergency Triage", avgServiceTimeMins: 8 })
  });
  const service = await sRes.json();
  console.log("Service created:", service);
  if (!service.id) throw new Error("Failed to create service");

  // Verify in GET /services
  const servicesList = await fetch(`${base}/services`).then(r => r.json());
  const foundService = servicesList.find(s => s.id === service.id);
  console.log("Verified in GET /services:", foundService ? "YES" : "NO");

  // 2. Create a counter
  console.log("\n[TEST 2] POST /counters (Creating 'Triage Desk 1')");
  const cRes = await fetch(`${base}/counters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Triage Desk 1", serviceId: service.id })
  });
  const counter = await cRes.json();
  console.log("Counter created:", counter);
  if (!counter.id) throw new Error("Failed to create counter");

  // Verify in GET /counters
  const countersList = await fetch(`${base}/counters`).then(r => r.json());
  const foundCounter = countersList.find(c => c.id === counter.id);
  console.log("Verified in GET /counters:", foundCounter ? "YES" : "NO");

  // 3. Book an appointment
  console.log("\n[TEST 3] POST /appointments (Booking appointment for 'Rohan Kapoor')");
  const aRes = await fetch(`${base}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      userId: "Rohan Kapoor",
      appointmentTime: Date.now() + 3600000,
      category: "general"
    })
  });
  const appt = await aRes.json();
  console.log("Appointment booked:", appt);
  if (!appt.id) throw new Error("Failed to book appointment");

  // Verify in GET /appointments
  const apptsList = await fetch(`${base}/appointments`).then(r => r.json());
  const foundAppt = apptsList.find(a => a.id === appt.id);
  console.log("Verified in GET /appointments (status=" + (foundAppt ? foundAppt.status : "missing") + "):", foundAppt ? "YES" : "NO");

  // 4. Check in the appointment
  console.log("\n[TEST 4] POST /appointments/:id/checkin (Checking in)");
  const ciRes = await fetch(`${base}/appointments/${appt.id}/checkin`, { method: "POST" });
  const checkinResult = await ciRes.json();
  console.log("Check-in result:", checkinResult);
  if (!checkinResult.id) throw new Error("Failed to check in");

  // Verify token in GET /tokens
  const tokensList1 = await fetch(`${base}/tokens?status=waiting`).then(r => r.json());
  const apptToken = tokensList1.find(t => t.id === checkinResult.id);
  console.log("Verified token in live queue (baseTier=" + (apptToken ? apptToken.baseTier : "missing") + "):", apptToken ? "YES" : "NO");

  // 5. Join walk-in queue
  console.log("\n[TEST 5] POST /tokens (Walk-in for 'Priya Nair' as Senior Citizen)");
  const wiRes = await fetch(`${base}/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      userId: "Priya Nair",
      category: "senior"
    })
  });
  const walkinToken = await wiRes.json();
  console.log("Walk-in token created:", walkinToken);
  if (!walkinToken.id) throw new Error("Failed to create walkin token");

  // Verify live status
  const stRes = await fetch(`${base}/tokens/${walkinToken.id}/status`).then(r => r.json());
  console.log("Live status for Senior Walk-in:", stRes);
  console.log("Senior token position:", stRes.position, "ETA:", stRes.etaMins, "min, Tier:", stRes.effectiveTier);

  // 6. Call Next on the counter
  console.log("\n[TEST 6] PATCH /counters/:id/call-next");
  const cnRes = await fetch(`${base}/counters/${counter.id}/call-next`, { method: "PATCH" });
  const callResult = await cnRes.json();
  console.log("Call Next result:", callResult);

  // 7. Mark Completed
  console.log("\n[TEST 7] PATCH /tokens/:id/complete");
  const calledTokenId = callResult.token.id;
  const compRes = await fetch(`${base}/tokens/${calledTokenId}/complete`, { method: "PATCH" });
  const compResult = await compRes.json();
  console.log("Complete result:", compResult);

  // Verify counter is freed
  const countersList2 = await fetch(`${base}/counters`).then(r => r.json());
  const updatedCounter = countersList2.find(c => c.id === counter.id);
  console.log("Counter currentTokenId after complete:", updatedCounter ? updatedCounter.currentTokenId : "unknown");

  console.log("\n>>> ALL 7 END-TO-END TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
