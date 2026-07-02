// Generates leetcode-heatmap.svg: a GitHub-native-style heatmap with month
// labels, total active days, and max streak — pulled from alfa-leetcode-api.

const USERNAME = process.env.LEETCODE_USERNAME;
if (!USERNAME) {
  console.error("Missing LEETCODE_USERNAME env var");
  process.exit(1);
}

const CELL = 11;
const GAP = 3;
const MONTH_LABEL_H = 16;
const LEFT_PAD = 4;
const TOP_PAD = 4;
const DAY_LEN = 86400;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function main() {
  const res = await fetch(`https://alfa-leetcode-api.onrender.com/${USERNAME}/calendar`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  const raw = data.submissionCalendar || data;
  const calendar = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Normalize to day-start UTC timestamps -> count
  const byDay = {};
  for (const [k, v] of Object.entries(calendar)) {
    const day = Math.floor(Number(k) / DAY_LEN) * DAY_LEN;
    byDay[day] = (byDay[day] || 0) + Number(v);
  }

  const now = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor(now / DAY_LEN) * DAY_LEN;
  const startDay = todayStart - 370 * DAY_LEN;
  // align start to a Sunday
  const startDate = new Date(startDay * 1000);
  const alignBack = startDate.getUTCDay();
  const gridStart = startDay - alignBack * DAY_LEN;

  const days = [];
  for (let d = gridStart; d <= todayStart; d += DAY_LEN) {
    days.push({ ts: d, count: byDay[d] || 0 });
  }

  const totalSubs = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  let maxStreak = 0, cur = 0;
  for (const d of days) {
    if (d.count > 0) { cur += 1; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const width = LEFT_PAD + weeks.length * (CELL + GAP) + 20;
  const height = TOP_PAD + MONTH_LABEL_H + 7 * (CELL + GAP) + 40;

  const shade = (c, max) => {
    if (c === 0) return "#1b2129";
    const t = Math.min(1, c / Math.max(1, max));
    if (t < 0.25) return "#0f3b3a";
    if (t < 0.5) return "#12564f";
    if (t < 0.75) return "#189e8e";
    return "#4fd1c5";
  };
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  let cells = "";
  let monthLabels = "";
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const x = LEFT_PAD + wi * (CELL + GAP);
    const firstOfWeek = new Date(week[0].ts * 1000);
    const m = firstOfWeek.getUTCMonth();
    if (m !== lastMonth) {
      monthLabels += `<text x="${x}" y="${TOP_PAD + 11}" font-size="10" fill="#7c8a9a" font-family="monospace">${MONTHS[m]}</text>`;
      lastMonth = m;
    }
    week.forEach((d, di) => {
      const y = TOP_PAD + MONTH_LABEL_H + di * (CELL + GAP);
      const date = new Date(d.ts * 1000).toISOString().slice(0, 10);
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${shade(d.count, maxCount)}"><title>${date}: ${d.count} submission${d.count === 1 ? "" : "s"}</title></rect>`;
    });
  });

  const footerY = TOP_PAD + MONTH_LABEL_H + 7 * (CELL + GAP) + 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="monospace">
  <rect width="100%" height="100%" fill="#0b0f14" rx="8"/>
  <text x="${LEFT_PAD}" y="${height - 10}" font-size="11" fill="#e8edf2">${totalSubs} submissions in the past year</text>
  <text x="${width - 210}" y="${height - 10}" font-size="11" fill="#7c8a9a">Active days: <tspan fill="#e8edf2">${activeDays}</tspan>&#160;&#160;Max streak: <tspan fill="#e8edf2">${maxStreak}</tspan></text>
  ${monthLabels}
  ${cells}
</svg>`;

  require("fs").writeFileSync("leetcode-heatmap.svg", svg);
  console.log(`Done. ${totalSubs} submissions, ${activeDays} active days, max streak ${maxStreak}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
