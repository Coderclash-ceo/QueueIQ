# Smart Appointment & Queue Management System (SAQMS)

## What this solves
Organizations that handle both **pre-booked appointments** and **walk-in demand**
have no fair way to sequence both into one queue, and customers get no visibility
into their wait. This system merges both streams into a single priority queue,
gives customers a live position/ETA, and gives staff a dashboard to run it.

## Two customer entry points
1. **Walk-in** (`customer.html` → "Join Walk-in") — for someone who has just
   arrived and scanned the clinic's QR code. They pick a service, declare a
   category (general / senior citizen), and join the active queue immediately.
2. **Appointment** (`customer.html` → "Book Ahead") — booked in
   advance for a future time using the calendar and time slots. Booking does NOT put them in the active queue —
   it just reserves a slot. When they arrive, they use the "Check-in" screen
   (entering the appointment ID they were given) to actually enter the active queue.

Staff can also book a **VIP / doctor-referred** appointment on a patient's
behalf from the staff dashboard — this is the only way to get VIP category (Tier 3);
patients can never self-select it on the public form.

## The priority engine (backend/src/priority.js)
Two-part logic:

**1. Base tier**, assigned when someone enters the active queue:
| Tier | Who | How it's set |
|---|---|---|
| 3 | VIP / doctor-referred | Staff only, at booking time |
| 2 | Senior citizen | Self-declared at walk-in/check-in |
| 1 | Normal appointment | Automatic, once checked in |
| 0 | Normal walk-in | Default |

**2. Aging** — solves the starvation problem: without this, a steady stream of
senior citizens could indefinitely push back an appointment holder who arrived
on time. Every 5 minutes someone waits, their effective tier rises by 1
(capped at 3):
```
effectiveTier = min(3, baseTier + floor(minutesWaited / 5))
```
Sorting is always `effectiveTier DESC, queueEnteredAt ASC` — same-tier
customers are served in arrival order.

This is the answer to "how do you reconcile appointments, walk-ins, senior
citizens and VIPs in one queue" — a single sort function handles every case,
no special-cased bypass logic anywhere.

## Folder structure
```
saqms-v2/
  backend/
    src/
      firestore.js        -> Firebase Admin init
      priority.js          -> tier + aging logic (the core algorithm)
      server.js             -> Express app entry
      routes/
        services.js         -> create/list/delete services
        counters.js          -> create/list/delete counters + call-next (uses priority.js)
        tokens.js             -> walk-in join, live status (position/ETA/tier), complete/no-show
        appointments.js       -> book ahead, check in (creates the active token)
        demo.js               -> 1-click seed demo data and reset queue
    package.json
  frontend/
    customer.html            -> 7-screen DocSpot mobile patient portal
    customer.js              -> Patient navigation, booking calendar, live aging tracking
    staff.html                 -> Staff command dashboard (KPIs, Queue table, Counters, VIP)
    staff.js                 -> Live dashboard real-time data sync, counter controls
    styles.css               -> Complete Figma design system tokens + responsive layout
    config.js                -> API base URL configuration
  README.md
```

## Setup
1. Firebase Console → new project → Firestore Database → Create (test mode).
2. Project Settings → Service Accounts → Generate new private key → save as
   `backend/serviceAccountKey.json`.
3. In `backend/src/firestore.js`, swap `admin.credential.applicationDefault()`
   for:
   ```js
   const serviceAccount = require("../serviceAccountKey.json");
   admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
   ```
4. `cd backend && npm install && npm run dev` — runs on http://localhost:4000
5. Open `frontend/staff.html`, add a service and a counter.
6. Open `frontend/customer.html` to try all three flows.

## Suggested demo script for your viva
1. Add "General Consultation" service (avg 5 min) and "Counter 1".
2. Join as a normal walk-in (general).
3. Join as a second walk-in, category "senior citizen" — show their position
   is ahead of the first despite joining later.
4. From staff.html, book a VIP appointment for "now-ish", check in via the
   customer check-in tab — show it jumps to the very top.
5. Wait ~5 minutes (or explain the aging formula) to show how a general
   walk-in's tier would rise over time and eventually overtake a senior
   citizen who has been waiting even longer — this is the starvation fix.
6. Call next on the counter, mark completed, repeat.

## What to say when asked "what exactly did you build"
"A queue engine that unifies appointments and walk-ins into one priority
queue using a tiered-plus-aging algorithm — similar in spirit to priority
scheduling in OS — so that no customer group can be starved indefinitely,
while still respecting genuine priority (VIP, senior citizens, booked slots)."
