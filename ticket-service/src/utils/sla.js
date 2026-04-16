const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** First response / resolution SLA from ticket creation (hours). */
const PRIORITY_SLA_HOURS = {
  LOW: 72,
  MEDIUM: 48,
  HIGH: 24,
  CRITICAL: 4,
};

const normalizePriority = (value) => {
  const p = String(value || "MEDIUM")
    .trim()
    .toUpperCase();
  return PRIORITIES.includes(p) ? p : "MEDIUM";
};

const computeSlaDueAt = (fromDate, priority) => {
  const p = normalizePriority(priority);
  const hours = PRIORITY_SLA_HOURS[p] ?? 48;
  const d = new Date(fromDate);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
};

const isOverdueTicket = (ticket) => {
  if (!ticket || !ticket.slaDueAt) return false;
  const terminal = ["RESOLVED", "CLOSED"];
  if (terminal.includes(ticket.status)) return false;
  return new Date(ticket.slaDueAt) < new Date();
};

module.exports = {
  PRIORITIES,
  PRIORITY_SLA_HOURS,
  normalizePriority,
  computeSlaDueAt,
  isOverdueTicket,
};
