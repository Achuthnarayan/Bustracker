// Weekly bus rotation logic
// Every Monday, operators are rotated to the next bus/route in the list.
// Assignment is deterministic: (operatorIndex + weekNumber) % totalBuses

// ISO week number of a date
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// The fixed bus pool — same order as seed
export const BUS_POOL = [
  { busNumber: 'KL07-BUS01', route: 'ROUTE_1', routeName: 'Route 1 – Koratty → SCMS' },
  { busNumber: 'KL07-BUS02', route: 'ROUTE_2', routeName: 'Route 2 – Kaloor → SCMS' },
  { busNumber: 'KL07-BUS03', route: 'ROUTE_3', routeName: 'Route 3 – Thrissur → SCMS' },
  { busNumber: 'KL07-BUS04', route: 'ROUTE_4', routeName: 'Route 4 – Perumbavoor → SSET' },
  { busNumber: 'KL07-BUS05', route: 'ROUTE_5', routeName: 'Route 5 – Kalady → SSET' },
  { busNumber: 'KL07-BUS06', route: 'ROUTE_6', routeName: 'Route 6 – North Paravur → SSET' },
  { busNumber: 'KL07-BUS07', route: 'ROUTE_7', routeName: 'Route 7 – Thrissur → SSET' },
];

// Get this week's assignment for an operator given their 0-based index
export function getWeeklyAssignment(operatorIndex: number, weekNumber?: number) {
  const week = weekNumber ?? getISOWeek(new Date());
  const slot = (operatorIndex + week) % BUS_POOL.length;
  return { ...BUS_POOL[slot], week };
}

// Next Monday date string
export function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
