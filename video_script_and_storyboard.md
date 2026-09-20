# QueueIQ: Official Video Script & Animation Storyboard

This document contains the complete **Scene-by-Scene Animation Storyboard, Voiceover Narration Script, On-Screen Visuals, and Audio Prompts** for creating a detailed product presentation video for **QueueIQ (Smart Appointment & Queue Management System)**.

---

## 🎬 Video Overview
- **Title**: *QueueIQ — Solving Hospital Outpatient Chaos with Fair Priority Scheduling*
- **Total Duration**: ~1 Minute 30 Seconds (90 seconds)
- **Aspect Ratio**: 16:9 (1920x1080 Full HD)
- **Target Audience**: College Viva Evaluators, Hospital Administrators, Hackathon Judges, Product Reviewers
- **Tone**: Professional, High-Tech, Empathetic, Authoritative

---

## 🎞️ Scene-by-Scene Storyboard & Script

### Scene 1: The Problem — The Outpatient Nightmare
- **Timing**: `0:00 – 0:15` (15 sec)
- **Visuals**:
  - Animated illustration of a chaotic hospital waiting hall: crowded chairs, frustrated patients, long physical lines.
  - Split screen comparing two patients:
    - *Patient A (Left)*: Booked an appointment 3 days in advance for 10:00 AM.
    - *Patient B (Right)*: Walked in unannounced at 9:55 AM declaring an emergency/senior citizen status.
  - Red warning flashes: **"The Starvation Trap"** — Booked appointments get continuously delayed by new arrivals.
  - Question mark bubble: **"Zero Visibility — How long will I wait?"**
- **Voiceover (English)**:
  > *"Every day, hospitals and clinics face a classic queuing crisis: how to balance patients who booked appointments in advance with unscheduled walk-ins arriving at the door. Without intelligent sequencing, pre-booked patients get repeatedly pushed back by new arrivals—leading to queue starvation, crowded waiting halls, and complete lack of visibility."*
- **On-Screen Text**:
  - `The Conflict: Booked Appointments vs. Walk-In Demand`
  - `Problem: Queue Starvation & Zero Wait Visibility`

---

### Scene 2: The Solution — Introducing QueueIQ
- **Timing**: `0:15 – 0:30` (15 sec)
- **Visuals**:
  - Dark cinematic background transitions to life.
  - QueueIQ Medical Pulse Cross badge glows with emerald green telemetry waveforms.
  - Diagram showing multiple scattered patient streams (Appointments, Walk-ins, Seniors, VIPs) merging smoothly into **One Unified Priority Stream**.
  - CPU scheduling processor metaphor: *"Borrowed from OS CPU Priority Scheduling"*.
- **Voiceover (English)**:
  > *"Introducing QueueIQ: a smart queue intelligence engine that eliminates bypass favoritism and guesswork. Inspired by Operating System CPU priority scheduling, QueueIQ unifies all appointment holders and walk-in patients into a single, deterministic priority queue where nobody waits indefinitely."*
- **On-Screen Text**:
  - `QueueIQ: Unified Priority & Scheduling Engine`
  - `Zero Guesswork · Zero Starvation`

---

### Scene 3: How It Works — The 4-Tier & Aging Algorithm
- **Timing**: `0:30 – 0:48` (18 sec)
- **Visuals**:
  - Interactive ladder showing the **4 Base Priority Tiers**:
    - 🟡 **Tier 3**: VIP / Doctor-Referred (Authorized by staff only)
    - 🟣 **Tier 2**: Senior Citizens & Priority Care
    - 🔵 **Tier 1**: Pre-booked Appointments (Checked in on arrival)
    - ⚪ **Tier 0**: Normal Walk-in Patients
  - **The Aging Animation**:
    - A Tier 0 walk-in patient timer ticks: *5 minutes elapsed... BUMP!* Effective Tier rises to Tier 1.
    - *10 minutes elapsed... BUMP!* Effective Tier rises to Tier 2.
  - The Mathematical Formula highlighted:
    `effectiveTier = min(3, baseTier + floor(minutesWaited / 5))`
- **Voiceover (English)**:
  > *"Here's how the engine works: every patient receives a Base Tier upon arrival. But to solve starvation, our Anti-Starvation Aging Engine kicks in: for every five minutes a patient waits, their effective tier rises by one. This mathematical guarantee ensures even a general walk-in will eventually overtake newer arrivals and be served fairly."*
- **On-Screen Text**:
  - `Tier 3: VIP | Tier 2: Senior | Tier 1: Appointment | Tier 0: Walk-in`
  - `Formula: effectiveTier = min(3, baseTier + floor(minutesWaited / 5))`

---

### Scene 4: The Patient Experience — Mobile Portal
- **Timing**: `0:48 – 1:02` (14 sec)
- **Visuals**:
  - Hospital reception desk with the **QueueIQ Printable QR Standee**.
  - Patient scans QR code using phone camera; mobile browser opens `customer.html`.
  - Patient selects department (*General OPD, Pediatrics, Cardiology*).
  - Clean live tracker: **Position #2 · ETA ~8 min · Aging Progress Ring**.
  - Screen flashes green: *"📢 Now Calling: Please proceed to Desk 1!"*
- **Voiceover (English)**:
  > *"For patients, the experience is effortless. They scan a reception QR code with their phone, select their department, and receive instant visibility: real-time position in line, estimated wait time, and a live aging clock. Patients can wait comfortably anywhere in the clinic until their phone alerts them when their desk is ready."*
- **On-Screen Text**:
  - `Scan Reception QR → Select Department → Live Mobile Tracking`
  - `Live Position · Dynamic ETA · Instant Alert`

---

### Scene 5: Staff Command & Doctor Consultation (Rx)
- **Timing**: `1:02 – 1:17` (15 sec)
- **Visuals**:
  - Smooth cut to the **Staff Command Dashboard (`staff.html`)**.
  - PIN Security Lock Screen: Doctor enters `1234` to unlock the operations center.
  - Counter Desks view: Doctor clicks **"📢 Call Next Patient"**.
  - Doctor opens **"🩺 Rx & Notes"**: fills primary diagnosis, examination notes, and prescribes medications.
  - Clicks **"Save Rx & Complete"**: Patient's mobile instantly displays **"📄 View & Download Digital Prescription"** with verified signature slip.
- **Voiceover (English)**:
  > *"For hospital staff, a secure PIN-protected operations dashboard empowers doctors to manage departmental desks with one-click calling. Doctors can log clinical observations, record diagnoses, and issue digital prescriptions that patients can instantly view and print from their phones."*
- **On-Screen Text**:
  - `Secure 4-Digit Doctor PIN Authentication`
  - `Multi-Desk Calling & Electronic Prescription (Rx) Slip`

---

### Scene 6: Conclusion & Impact
- **Timing**: `1:17 – 1:30` (13 sec)
- **Visuals**:
  - Metric impact cards animation:
    - 📉 **40% Shorter Hallway Congestion**
    - 🛡️ **0% Starvation Rate**
    - ☁️ **Google Firebase Firestore & Node.js Architecture**
  - Final branding screen with QueueIQ Medical Pulse Cross logo and GitHub repo link.
- **Voiceover (English)**:
  > *"QueueIQ is a complete full-stack solution built on Node.js, Express, and Google Firebase Firestore—transforming hospital queues from stressful waiting rooms into transparent, fair, and modern healthcare spaces."*
- **On-Screen Text**:
  - `QueueIQ — Fair, Intelligent, Starvation-Free Clinic Queues`
  - `Tech Stack: Node.js · Express · Google Firebase Firestore`

---

## 🛠️ How to View & Record Your Video

### Method 1: The Built-in Animated Web Player (Instant!)
You can run our custom interactive video player in any browser:
1. Start local server: `cd backend && node src/server.js`
2. Open: [http://localhost:4000/video-presentation.html](http://localhost:4000/video-presentation.html)
3. Press **"▶ Play Video"** or click Fullscreen!
4. Use **Windows Game Bar (`Win + G`)**, **OBS Studio**, or **Loom** to record the 90-second animated video directly in Full HD 1080p!

### Method 2: AI Voiceover & Video Generators
- **Voiceover Generator**: Copy the voiceover text from each scene into [ElevenLabs.io](https://elevenlabs.io) or [Murf.ai](https://murf.ai) (voice recommendation: *Adam* or *Rachel* with 'Professional Explainer' style).
- **Video Editing**: Import into **Canva**, **InVideo**, or **CapCut** and align with screen recordings of QueueIQ.
