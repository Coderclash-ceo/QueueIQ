// priority.js
// Core priority-queue logic for SAQMS. Implements:
//   1. Base tiers by customer category / entry type
//   2. Aging: effective tier rises the longer someone waits, so a high-tier
//      group can never indefinitely starve a lower-tier group.

const FIVE_MIN_MS = 5 * 60 * 1000;
const MAX_TIER = 3;

// Base tier when a customer first enters the active queue.
//   category: "general" | "senior" | "vip"
//   type: "walkin" | "appointment"
//
// Rules:
//   - vip            -> 3   (set only by staff/admin at booking time)
//   - senior         -> 2   (self-declared at check-in/walk-in)
//   - appointment    -> 1   (booked slot, arrived at/after their time)
//   - walkin general -> 0   (default)
function computeBaseTier({ category, type }) {
  if (category === "vip") return 3;
  if (category === "senior") return 2;
  if (type === "appointment") return 1;
  return 0;
}

// Effective tier = base tier + 1 for every 5 minutes spent waiting,
// capped at MAX_TIER. This is the aging mechanism that prevents starvation:
// a normal appointment holder stuck waiting behind senior citizens will
// climb to the top within ~10-15 minutes regardless of their base tier.
function computeEffectiveTier(baseTier, queueEnteredAt, now = Date.now()) {
  const minutesWaited = (now - queueEnteredAt) / FIVE_MIN_MS;
  const bump = Math.floor(minutesWaited);
  return Math.min(MAX_TIER, baseTier + bump);
}

// Sort a list of active tokens by effective tier (desc), then by
// queueEnteredAt (asc) as a tie-breaker (fair FIFO within the same tier).
function sortByPriority(tokens, now = Date.now()) {
  return [...tokens].sort((a, b) => {
    const tierA = computeEffectiveTier(a.baseTier, a.queueEnteredAt, now);
    const tierB = computeEffectiveTier(b.baseTier, b.queueEnteredAt, now);
    if (tierB !== tierA) return tierB - tierA;
    return a.queueEnteredAt - b.queueEnteredAt;
  });
}

module.exports = { computeBaseTier, computeEffectiveTier, sortByPriority, MAX_TIER };
