// frontend/src/components/ContributionGraph.jsx
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

const WEEKS_IN_YEAR = 53;
const DAYS_IN_WEEK  = 7;
const JANUARY_MONTH = 0;
const DECEMBER_MONTH = 11;
const SUNDAY_DAY = 0;
const MIN_WEEKS_FOR_DECEMBER_HEADER = 2;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 40;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const CONTRIBUTION_COLORS = [
  "rgba(255,255,255,0.07)",
  "rgba(99,102,241,0.3)",
  "rgba(99,102,241,0.5)",
  "rgba(99,102,241,0.7)",
  "rgba(99,102,241,0.9)",
];

const CONTRIBUTION_LEVELS = [0, 1, 2, 3, 4];

const isDateInValidRange = (currentDate, startDate, endDate, targetYear) => {
  const isInRange = currentDate >= startDate && currentDate <= endDate;
  const isPreviousYearDecember =
    currentDate.getFullYear() === targetYear - 1 &&
    currentDate.getMonth() === DECEMBER_MONTH;
  const isNextYearJanuary =
    currentDate.getFullYear() === targetYear + 1 &&
    currentDate.getMonth() === JANUARY_MONTH;
  return isInRange || isPreviousYearDecember || isNextYearJanuary;
};

const createDayData = (currentDate, contributionData) => {
  const dateString  = currentDate.toISOString().split("T")[0];
  const existingData = contributionData.find(d => d.date === dateString);
  return {
    date:  dateString,
    count: existingData?.count ?? 0,
    level: existingData?.level ?? 0,
  };
};

const shouldShowMonthHeader = ({ currentYear, targetYear, currentMonth, startDateDay, weekCount }) =>
  currentYear === targetYear ||
  (currentYear === targetYear - 1 &&
    currentMonth === DECEMBER_MONTH &&
    startDateDay !== SUNDAY_DAY &&
    weekCount >= MIN_WEEKS_FOR_DECEMBER_HEADER);

const calculateMonthHeaders = (targetYear) => {
  const headers = [];
  const startDate   = new Date(targetYear, JANUARY_MONTH, 1);
  const firstSunday = new Date(startDate);
  firstSunday.setDate(startDate.getDate() - startDate.getDay());

  let currentMonth = -1, currentYear = -1, monthStartWeek = 0, weekCount = 0;

  for (let weekNumber = 0; weekNumber < WEEKS_IN_YEAR; weekNumber++) {
    const weekDate = new Date(firstSunday);
    weekDate.setDate(firstSunday.getDate() + weekNumber * DAYS_IN_WEEK);

    const monthKey = weekDate.getMonth();
    const yearKey  = weekDate.getFullYear();

    if (monthKey !== currentMonth || yearKey !== currentYear) {
      if (currentMonth !== -1 && shouldShowMonthHeader({ currentYear, targetYear, currentMonth, startDateDay: startDate.getDay(), weekCount })) {
        headers.push({ month: MONTHS[currentMonth], colspan: weekCount, startWeek: monthStartWeek });
      }
      currentMonth = monthKey;
      currentYear  = yearKey;
      monthStartWeek = weekNumber;
      weekCount = 1;
    } else {
      weekCount++;
    }
  }

  if (currentMonth !== -1 && shouldShowMonthHeader({ currentYear, targetYear, currentMonth, startDateDay: startDate.getDay(), weekCount })) {
    headers.push({ month: MONTHS[currentMonth], colspan: weekCount, startWeek: monthStartWeek });
  }

  return headers;
};

export function ContributionGraph({ data = [], year = new Date().getFullYear(), className = "", showLegend = true, showTooltips = true }) {
  const [hoveredDay, setHoveredDay]         = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const yearData = useMemo(() => {
    const startDate   = new Date(year, JANUARY_MONTH, 1);
    const endDate     = new Date(year, DECEMBER_MONTH, 31);
    const days        = [];
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());

    for (let weekNum = 0; weekNum < WEEKS_IN_YEAR; weekNum++) {
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const currentDate = new Date(firstSunday);
        currentDate.setDate(firstSunday.getDate() + weekNum * DAYS_IN_WEEK + day);
        if (isDateInValidRange(currentDate, startDate, endDate, year)) {
          days.push(createDayData(currentDate, data));
        } else {
          days.push({ date: "", count: 0, level: 0 });
        }
      }
    }
    return days;
  }, [data, year]);

  const monthHeaders = useMemo(() => calculateMonthHeaders(year), [year]);

  const handleDayHover = (day, event) => {
    if (showTooltips && day.date) {
      setHoveredDay(day);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  };

  const getContributionText = (count) => {
    if (count === 0) return "No contributions";
    if (count === 1) return "1 contribution";
    return `${count} contributions`;
  };

  return (
    <div style={{ fontFamily:'inherit' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderSpacing:'2px', borderCollapse:'separate', fontSize:'0.72rem' }}>
          <caption style={{ position:'absolute', width:1, height:1, overflow:'hidden' }}>Contribution Graph {year}</caption>
          <thead>
            <tr style={{ height:12 }}>
              <td style={{ width:28, minWidth:28 }} />
              {monthHeaders.map(h => (
                <td key={`${h.month}-${h.startWeek}`} colSpan={h.colspan} style={{ position:'relative', color:'var(--text-muted)', textAlign:'left' }}>
                  <span style={{ position:'absolute', top:0, left:4 }}>{h.month}</span>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => (
              <tr key={DAYS[dayIndex]} style={{ height:10 }}>
                <td style={{ position:'relative', width:28, minWidth:28, color:'var(--text-muted)' }}>
                  {dayIndex % 2 === 0 && (
                    <span style={{ position:'absolute', bottom:0, left:0, fontSize:'0.68rem' }}>{DAYS[dayIndex]}</span>
                  )}
                </td>
                {Array.from({ length: WEEKS_IN_YEAR }, (_, w) => {
                  const dayData = yearData[w * DAYS_IN_WEEK + dayIndex];
                  const key     = `${dayData?.date ?? 'empty'}-${w}-${dayIndex}`;
                  if (!dayData?.date) return <td key={key} style={{ width:10, height:10, padding:0 }}><div style={{ width:10, height:10 }} /></td>;
                  return (
                    <td
                      key={key}
                      style={{ width:10, height:10, padding:0, cursor:'pointer' }}
                      onMouseEnter={e => handleDayHover(dayData, e)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={showTooltips ? `${formatDate(dayData.date)}: ${getContributionText(dayData.count)}` : undefined}
                    >
                      <div style={{
                        width:10, height:10, borderRadius:2,
                        backgroundColor: CONTRIBUTION_COLORS[dayData.level],
                        border:'1px solid rgba(255,255,255,0.06)',
                        transition:'transform 0.1s',
                      }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showTooltips && hoveredDay && (
        <motion.div
          initial={shouldReduceMotion ? { opacity:1 } : { opacity:0, scale:0.85 }}
          animate={shouldReduceMotion ? { opacity:1 } : { opacity:1, scale:1 }}
          exit={shouldReduceMotion ? { opacity:0 } : { opacity:0, scale:0.85 }}
          transition={{ duration:0.15 }}
          style={{
            position:'fixed', zIndex:9999, pointerEvents:'none',
            left: tooltipPosition.x + TOOLTIP_OFFSET_X,
            top:  tooltipPosition.y - TOOLTIP_OFFSET_Y,
            background:'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)',
            border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
            padding:'8px 12px', fontSize:'0.8rem', color:'var(--text-primary)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontWeight:600 }}>{getContributionText(hoveredDay.count)}</div>
          <div style={{ color:'var(--text-muted)', fontSize:'0.72rem', marginTop:2 }}>{formatDate(hoveredDay.date)}</div>
        </motion.div>
      )}

      {showLegend && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6, marginTop:10, color:'var(--text-muted)', fontSize:'0.72rem' }}>
          <span>Less</span>
          {CONTRIBUTION_LEVELS.map(level => (
            <div key={level} style={{ width:10, height:10, borderRadius:2, backgroundColor:CONTRIBUTION_COLORS[level], border:'1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  );
}

export default ContributionGraph;
