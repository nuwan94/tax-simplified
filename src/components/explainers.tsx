// Plain-language explainers behind the "?" marks, each with a short animated scene.
// Scenes are one-shot CSS animations whose resting state is the finished picture,
// so reduced-motion users (animations off) still see the complete diagram.

import type { CSSProperties, ReactNode } from 'react';
import { rules } from './useTaxForm';

const INK = '#2a251e';
const MUTED = '#6b6152';
const LINE = '#b8a988';
const PRI = '#1f3d6d';
const PRI_L = '#dbe4f5';
const OK = '#2f6b3a';
const OK_L = '#e9f1e1';
const RELIEF = '#b5c9a4';
const OWE = '#9b2c2c';
const OWE_L = '#f8e9e4';
const GOLD = '#b07f22';
const GOLD_L = '#f5e6c4';
const SHEET = '#fffcf5';
const BANDS = ['#c6d4f2', '#93acea', '#5f80d6', '#3456b4', '#1b2f72'];

const rs = (n: number) => `Rs ${n.toLocaleString('en-LK')}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;
const RELIEF_AMT = rules.reliefs.personal.amount;
const CAP = pct(rules.foreignSourceIncome.maxRate);
const WHT = pct(rules.withholding.serviceFeesResident.rate);
const AIT = pct(rules.withholding.interestResident.rate);
const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayShort = (iso: string) => day(iso).replace(/ \d{4}$/, '');

// ---------- scene helpers ----------

const v = (d: number, fx = 0, fy = 0) => ({ '--d': `${d}s`, '--fx': `${fx}px`, '--fy': `${fy}px` }) as CSSProperties;

function Scene({ children }: { children: ReactNode }) {
  return (
    <svg className="scene" viewBox="0 0 320 150" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function T(p: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  bold?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
  cls?: string;
  d?: number;
}) {
  return (
    <text
      x={p.x}
      y={p.y}
      fontSize={p.size ?? 11}
      fill={p.color ?? INK}
      fontWeight={p.bold ? 700 : 400}
      textAnchor={p.anchor ?? 'start'}
      className={`${p.mono ? 'mono ' : ''}${p.cls ?? ''}`}
      style={p.d !== undefined ? v(p.d) : undefined}
    >
      {p.children}
    </text>
  );
}

function Box(p: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  label?: string;
  sub?: string;
  color?: string;
  cls?: string;
  style?: CSSProperties;
  dashed?: boolean;
}) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  return (
    <g className={p.cls} style={p.style}>
      <rect
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        rx={4}
        fill={p.fill ?? SHEET}
        stroke={p.stroke ?? LINE}
        strokeDasharray={p.dashed ? '4 3' : undefined}
      />
      {p.label && (
        <text
          x={cx}
          y={p.sub ? cy - 2 : cy + 4}
          fontSize={11.5}
          fontWeight={700}
          textAnchor="middle"
          fill={p.color ?? INK}
        >
          {p.label}
        </text>
      )}
      {p.sub && (
        <text x={cx} y={cy + 12} fontSize={10} textAnchor="middle" fill={p.color ?? MUTED}>
          {p.sub}
        </text>
      )}
    </g>
  );
}

function Coin(p: {
  cx: number;
  cy: number;
  r?: number;
  fill: string;
  text: string;
  cls?: string;
  style?: CSSProperties;
}) {
  const r = p.r ?? 15;
  return (
    <g className={p.cls ?? 'a-from'} style={p.style}>
      <circle cx={p.cx} cy={p.cy} r={r} fill={p.fill} stroke="#fff" strokeWidth={1.5} />
      <text x={p.cx} y={p.cy + 3.5} fontSize={r > 18 ? 11 : 9.5} fontWeight={700} textAnchor="middle" fill="#fff">
        {p.text}
      </text>
    </g>
  );
}

/** Straight arrow that draws itself, then its head appears. */
function Arrow(p: { x1: number; y1: number; x2: number; y2: number; color?: string; d?: number }) {
  const c = p.color ?? MUTED;
  const a = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
  const h = 7;
  const pts = [
    [p.x2, p.y2],
    [p.x2 - h * Math.cos(a - 0.45), p.y2 - h * Math.sin(a - 0.45)],
    [p.x2 - h * Math.cos(a + 0.45), p.y2 - h * Math.sin(a + 0.45)],
  ]
    .map((q) => q.map((n) => n.toFixed(1)).join(','))
    .join(' ');
  const d = p.d ?? 0;
  return (
    <g>
      <path
        d={`M${p.x1},${p.y1} L${p.x2},${p.y2}`}
        pathLength={1}
        stroke={c}
        strokeWidth={1.8}
        fill="none"
        className="a-draw"
        style={v(d)}
      />
      <polygon points={pts} fill={c} className="a-in" style={v(d + 0.55)} />
    </g>
  );
}

function Person({
  x,
  y,
  color = PRI,
  cls,
  style,
}: {
  x: number;
  y: number;
  color?: string;
  cls?: string;
  style?: CSSProperties;
}) {
  return (
    <g className={cls} style={style}>
      <circle cx={x} cy={y} r={9} fill={color} />
      <path d={`M${x - 15},${y + 30} q0,-18 15,-18 q15,0 15,18 z`} fill={color} />
    </g>
  );
}

function Building({
  x,
  y,
  label,
  color = PRI,
  cls,
  style,
}: {
  x: number;
  y: number;
  label: string;
  color?: string;
  cls?: string;
  style?: CSSProperties;
}) {
  return (
    <g className={cls} style={style}>
      <polygon points={`${x - 4},${y + 14} ${x + 40},${y - 6} ${x + 84},${y + 14}`} fill={color} />
      <rect x={x} y={y + 14} width={80} height={44} fill={SHEET} stroke={color} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 10 + i * 18} y={y + 22} width={6} height={28} fill={PRI_L} />
      ))}
      <text x={x + 40} y={y + 72} fontSize={11} fontWeight={700} textAnchor="middle" fill={color}>
        {label}
      </text>
    </g>
  );
}

function Doc({
  x,
  y,
  w,
  h,
  title,
  lines = 4,
  cls,
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: number;
  cls?: string;
  style?: CSSProperties;
}) {
  return (
    <g className={cls} style={style}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={SHEET} stroke={LINE} />
      <text x={x + 8} y={y + 16} fontSize={10.5} fontWeight={700} fill={INK}>
        {title}
      </text>
      {Array.from({ length: lines }, (_, i) => (
        <rect key={i} x={x + 8} y={y + 26 + i * 12} width={w - 16 - (i % 2) * 18} height={4} rx={2} fill="#e3d9c4" />
      ))}
    </g>
  );
}

// ---------- scenes ----------

function ResidentScene() {
  const months = 'AMJJASONDJFM'.split('');
  const x0 = 22;
  const mark = x0 + (183 / 365) * 288;
  return (
    <Scene>
      <T x={mark} y={22} anchor="middle" size={10.5} bold color={OK} cls="a-in" d={1.9}>
        183 days
      </T>
      {months.map((m, i) => (
        <g key={i}>
          <rect
            x={x0 + i * 24}
            y={34}
            width={22}
            height={34}
            rx={3}
            fill={i < 8 ? PRI : SHEET}
            stroke={i < 8 ? PRI : LINE}
            className={i < 8 ? 'a-pop' : undefined}
            style={i < 8 ? v(0.15 + i * 0.18) : undefined}
          />
          <T x={x0 + i * 24 + 11} y={82} anchor="middle" size={10} color={MUTED}>
            {m}
          </T>
        </g>
      ))}
      <path
        d={`M${mark},28 L${mark},74`}
        pathLength={1}
        stroke={OK}
        strokeWidth={2.5}
        className="a-draw"
        style={v(1.6)}
      />
      <T x={x0} y={100} size={10} color={MUTED}>
        1 Apr 2025
      </T>
      <T x={310} y={100} size={10} color={MUTED} anchor="end">
        31 Mar 2026
      </T>
      <g className="a-pop" style={v(2.3)}>
        <rect x={98} y={110} width={124} height={30} rx={15} fill={OK_L} stroke={OK} />
        <T x={160} y={129} anchor="middle" bold color={OK} size={12}>
          ✓ Resident
        </T>
      </g>
    </Scene>
  );
}

function OtherIncomeScene() {
  const left = ['Salary', 'Bank interest', 'Freelance work'];
  const right = ['Rent', 'Dividends', 'Selling land or shares'];
  return (
    <Scene>
      {left.map((s, i) => (
        <Box
          key={s}
          x={22}
          y={8 + i * 26}
          w={120}
          h={22}
          label={s}
          cls="a-from"
          style={v(0.2 + i * 0.25, 0, -18)}
          fill={OK_L}
          stroke={OK}
          color={OK}
        />
      ))}
      {right.map((s, i) => (
        <Box
          key={s}
          x={178}
          y={8 + i * 26}
          w={120}
          h={22}
          label={s}
          cls="a-from"
          style={v(1.0 + i * 0.25, 0, -18)}
          fill={GOLD_L}
          stroke={GOLD}
          color={INK}
        />
      ))}
      <Box
        x={14}
        y={92}
        w={136}
        h={48}
        label="This calculator"
        sub="covers these"
        fill={SHEET}
        stroke={OK}
        cls="a-pop"
        style={v(0.9)}
      />
      <Box
        x={170}
        y={92}
        w={136}
        h={48}
        label="Standard Return"
        sub="get help from IRD"
        fill={SHEET}
        stroke={GOLD}
        cls="a-pop"
        style={v(1.9)}
      />
    </Scene>
  );
}

function ReliefsScene() {
  return (
    <Scene>
      <T x={20} y={34} size={11} color={MUTED}>
        Your income for the year
      </T>
      <rect x={20} y={42} width={280} height={34} rx={3} fill={PRI_L} stroke={LINE} />
      <rect x={20} y={42} width={150} height={34} fill={RELIEF} className="a-grow" style={v(0.3)} />
      <T x={95} y={63} anchor="middle" bold size={11} cls="a-in" d={0.9}>
        Personal relief
      </T>
      <rect
        x={170}
        y={42}
        width={56}
        height={34}
        fill={GOLD_L}
        stroke={GOLD}
        strokeDasharray="4 3"
        className="a-grow"
        style={v(1.4)}
      />
      <T x={198} y={63} anchor="middle" size={10} cls="a-in" d={1.8}>
        Extra
      </T>
      <T x={263} y={63} anchor="middle" size={10.5} bold color={PRI} cls="a-in" d={2.2}>
        Taxed
      </T>
      <T x={95} y={96} anchor="middle" size={10.5} color={OK} bold cls="a-in" d={1}>
        {rs(RELIEF_AMT)}
      </T>
      <T x={95} y={110} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.1}>
        automatic for everyone
      </T>
      <T x={198} y={96} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.9}>
        solar, donations…
      </T>
      <T x={198} y={110} anchor="middle" size={10} color={GOLD} bold cls="a-in" d={2}>
        Standard Return
      </T>
    </Scene>
  );
}

function ApitScene() {
  return (
    <Scene>
      <Doc x={16} y={18} w={104} h={100} title="Monthly payslip" lines={2} />
      <T x={24} y={78} size={10} color={MUTED}>
        Salary
      </T>
      <T x={112} y={78} size={10} anchor="end" mono>
        300,000
      </T>
      <T x={24} y={94} size={10} color={OWE}>
        APIT
      </T>
      <T x={112} y={94} size={10} anchor="end" mono color={OWE}>
        −27,000
      </T>
      <Arrow x1={124} y1={90} x2={202} y2={90} d={0.5} />
      <Building x={216} y={30} label="IRD" />
      <Coin cx={256} cy={76} fill={OWE} text="Tax" style={v(0.6, -150, 18)} />
      <T x={160} y={140} anchor="middle" size={11} bold color={OK} cls="a-in" d={1.7}>
        Counts as tax you have already paid
      </T>
    </Scene>
  );
}

function IrdFileScene() {
  return (
    <Scene>
      <path d="M24,40 h40 l8,10 h70 v76 h-118 z" fill={GOLD_L} stroke={GOLD} />
      <T x={83} y={96} anchor="middle" size={11} bold>
        Your tax file
      </T>
      <g className="a-from" style={v(0.5, -100, 0)}>
        <rect x={166} y={46} width={134} height={60} rx={6} fill={SHEET} stroke={PRI} />
        <rect x={166} y={46} width={134} height={16} rx={6} fill={PRI} />
        <T x={174} y={58} size={9.5} color="#fff" bold>
          TAXPAYER ID (TIN)
        </T>
        <T x={174} y={82} size={13} mono bold color={PRI}>
          123456789
        </T>
        <T x={174} y={98} size={9.5} color={MUTED}>
          RAMIS online login
        </T>
      </g>
      <T x={160} y={140} anchor="middle" size={11} bold color={PRI} cls="a-in" d={1.5}>
        IRD may expect a return every year
      </T>
    </Scene>
  );
}

function EmploymentScene() {
  return (
    <Scene>
      <Doc x={14} y={8} w={128} h={134} title="APIT certificate" lines={2} />
      <rect x={20} y={60} width={116} height={20} rx={2} fill={GOLD_L} className="a-grow" style={v(0.3)} />
      <T x={24} y={74} size={10}>
        Gross pay
      </T>
      <T x={132} y={74} size={10} anchor="end" mono>
        3,600,000
      </T>
      <rect x={20} y={88} width={116} height={20} rx={2} fill={GOLD_L} className="a-grow" style={v(1.2)} />
      <T x={24} y={102} size={10}>
        Tax deducted
      </T>
      <T x={132} y={102} size={10} anchor="end" mono>
        222,000
      </T>
      <Arrow x1={140} y1={70} x2={186} y2={44} d={0.6} />
      <Arrow x1={140} y1={98} x2={186} y2={112} d={1.5} />
      <T x={192} y={30} size={10} color={MUTED}>
        Gross remuneration
      </T>
      <Box x={192} y={34} w={112} h={24} />
      <T x={298} y={51} size={11} anchor="end" mono cls="a-in" d={1.1}>
        3,600,000
      </T>
      <T x={192} y={98} size={10} color={MUTED}>
        APIT deducted
      </T>
      <Box x={192} y={102} w={112} h={24} />
      <T x={298} y={119} size={11} anchor="end" mono cls="a-in" d={2}>
        222,000
      </T>
    </Scene>
  );
}

function InterestScene() {
  return (
    <Scene>
      <Coin cx={56} cy={68} r={30} fill={GOLD} text="Rs 100" cls="a-pop" style={v(0.1)} />
      <T x={56} y={116} anchor="middle" size={10.5} color={MUTED}>
        interest earned
      </T>
      <Arrow x1={90} y1={58} x2={168} y2={34} color={OK} d={0.6} />
      <Arrow x1={90} y1={80} x2={168} y2={104} color={PRI} d={0.9} />
      <Coin cx={190} cy={32} r={20} fill={OK} text="Rs 90" style={v(1.1, -100, 30)} />
      <Coin cx={190} cy={106} r={16} fill={PRI} text="Rs 10" style={v(1.4, -100, -30)} />
      <T x={218} y={30} size={11} bold color={OK} cls="a-in" d={1.6}>
        paid to you
      </T>
      <T x={218} y={44} size={10} color={MUTED} cls="a-in" d={1.6}>
        by the bank
      </T>
      <T x={214} y={104} size={11} bold color={PRI} cls="a-in" d={1.9}>
        {AIT} sent to IRD
      </T>
      <T x={214} y={118} size={10} color={MUTED} cls="a-in" d={2.1}>
        counts as tax paid
      </T>
    </Scene>
  );
}

function FreelanceScene() {
  const clients = ['Upwork', 'Fiverr', 'Acme Ltd'];
  return (
    <Scene>
      {clients.map((c, i) => (
        <g key={c}>
          <Box x={12} y={12 + i * 46} w={84} h={28} label={c} cls="a-in" style={v(i * 0.2)} />
          <Arrow x1={100} y1={26 + i * 46} x2={196} y2={66 + (i - 1) * 10} d={0.5 + i * 0.25} color={GOLD} />
        </g>
      ))}
      <Person x={238} y={44} />
      <rect x={214} y={84} width={48} height={30} rx={2} fill={INK} />
      <rect x={206} y={114} width={64} height={5} rx={2} fill={INK} />
      <T x={238} y={140} anchor="middle" size={11} bold color={PRI} cls="a-in" d={1.6}>
        One entry per client
      </T>
    </Scene>
  );
}

function ClientLocationScene() {
  return (
    <Scene>
      <g className="a-in" style={v(0)}>
        <circle cx={52} cy={56} r={32} fill={GOLD_L} stroke={GOLD} />
        <ellipse cx={52} cy={56} rx={14} ry={32} fill="none" stroke={GOLD} />
        <path d="M20,56 h64 M26,40 h52 M26,72 h52" stroke={GOLD} fill="none" />
      </g>
      <T x={52} y={106} anchor="middle" size={11} bold>
        Client abroad
      </T>
      <T x={52} y={120} anchor="middle" size={10} color={GOLD} bold cls="a-in" d={1.4}>
        foreign income
      </T>
      <Arrow x1={88} y1={56} x2={136} y2={56} color={GOLD} d={0.5} />
      <Person x={160} y={40} />
      <T x={160} y={92} anchor="middle" size={10.5} color={MUTED}>
        You, in Sri Lanka
      </T>
      <Arrow x1={226} y1={56} x2={184} y2={56} color={PRI} d={0.9} />
      <Building x={230} y={24} label="" />
      <T x={270} y={106} anchor="middle" size={11} bold>
        Client here
      </T>
      <T x={270} y={120} anchor="middle" size={10} color={PRI} bold cls="a-in" d={1.7}>
        local income
      </T>
    </Scene>
  );
}

function RemittedScene() {
  return (
    <Scene>
      <Coin cx={34} cy={75} r={22} fill={GOLD} text="US$" cls="a-pop" style={v(0)} />
      <T x={34} y={114} anchor="middle" size={10} color={MUTED}>
        from client
      </T>
      <Arrow x1={58} y1={66} x2={110} y2={34} color={OK} d={0.4} />
      <Arrow x1={58} y1={84} x2={110} y2={116} color={OWE} d={1.3} />
      <Box
        x={114}
        y={12}
        w={122}
        h={44}
        label="Sri Lankan bank"
        sub="in dollars"
        fill={OK_L}
        stroke={OK}
        cls="a-in"
        style={v(0.9)}
      />
      <Box
        x={114}
        y={94}
        w={122}
        h={44}
        label="Payoneer, Wise"
        sub="or a bank abroad"
        fill={OWE_L}
        stroke={OWE}
        cls="a-in"
        style={v(1.8)}
      />
      <g className="a-pop" style={v(1.3)}>
        <rect x={244} y={20} width={70} height={28} rx={14} fill={OK} />
        <T x={279} y={38} anchor="middle" bold size={11} color="#fff">
          max {CAP}
        </T>
      </g>
      <g className="a-pop" style={v(2.2)}>
        <rect x={244} y={102} width={70} height={28} rx={14} fill={OWE} />
        <T x={279} y={120} anchor="middle" bold size={10.5} color="#fff">
          up to 36%
        </T>
      </g>
    </Scene>
  );
}

function FxScene() {
  const rates = [298.5, 299.4, 299.9, 301.1, 301.5, 302.2, 303.1, 306.3, 309.2, 309.7, 309.4, 311.9];
  const months = 'AMJJASONDJFM'.split('');
  return (
    <Scene>
      <T x={20} y={14} size={10} color={MUTED}>
        CBSL average: rupees for one US dollar
      </T>
      {rates.map((r, i) => {
        const h = (r - 290) * 3.4;
        const sel = i === 5;
        return (
          <g key={i}>
            <rect
              x={22 + i * 24}
              y={96 - h}
              width={18}
              height={h}
              rx={2}
              fill={sel ? GOLD : PRI_L}
              className="a-growy"
              style={v(0.1 + i * 0.08)}
            />
            <T x={31 + i * 24} y={108} anchor="middle" size={9.5} color={sel ? GOLD : MUTED} bold={sel}>
              {months[i]}
            </T>
          </g>
        );
      })}
      <T
        x={22 + 5 * 24 + 9}
        y={96 - (302.2 - 290) * 3.4 - 5}
        anchor="middle"
        size={9.5}
        bold
        color={GOLD}
        cls="a-in"
        d={1.2}
      >
        302.20
      </T>
      <g className="a-in" style={v(1.6)}>
        <rect x={20} y={118} width={284} height={26} rx={4} fill={GOLD_L} />
        <T x={162} y={135} anchor="middle" size={11.5} mono>
          $1,000 in Sep × 302.20 = Rs 302,196
        </T>
      </g>
    </Scene>
  );
}

function ExpensesScene() {
  return (
    <Scene>
      <T x={20} y={22} size={10.5} color={MUTED}>
        What clients paid you
      </T>
      <rect x={20} y={28} width={280} height={28} rx={3} fill={PRI_L} className="a-grow" style={v(0.1)} />
      <T x={160} y={47} anchor="middle" size={11} mono cls="a-in" d={0.5}>
        1,000,000
      </T>
      <rect x={20} y={80} width={224} height={28} rx={3} fill={OK_L} stroke={OK} className="a-grow" style={v(1.2)} />
      <T x={132} y={99} anchor="middle" size={11} mono color={OK} bold cls="a-in" d={1.6}>
        800,000 taxed
      </T>
      <g className="a-from" style={v(0.7, 0, -52)}>
        <rect x={248} y={80} width={52} height={28} rx={3} fill={OWE_L} stroke={OWE} strokeDasharray="4 3" />
        <T x={274} y={99} anchor="middle" size={10} mono color={OWE}>
          −200k
        </T>
      </g>
      <T x={274} y={124} anchor="middle" size={10} color={OWE} cls="a-in" d={1}>
        expenses
      </T>
      <T x={132} y={124} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.7}>
        net income
      </T>
    </Scene>
  );
}

function WhtScene() {
  return (
    <Scene>
      <Doc x={14} y={16} w={92} h={110} title="Invoice" lines={3} />
      <T x={60} y={100} anchor="middle" size={12} mono bold>
        200,000
      </T>
      <Arrow x1={110} y1={56} x2={156} y2={36} color={OK} d={0.4} />
      <Arrow x1={110} y1={86} x2={156} y2={106} color={PRI} d={0.9} />
      <Box
        x={160}
        y={14}
        w={146}
        h={44}
        label="You get 190,000"
        sub="from the client"
        fill={OK_L}
        stroke={OK}
        color={OK}
        cls="a-in"
        style={v(0.9)}
      />
      <Box
        x={160}
        y={84}
        w={146}
        h={44}
        label={`${WHT} = 10,000 to IRD`}
        sub="credited to your tax"
        fill={PRI_L}
        stroke={PRI}
        color={PRI}
        cls="a-in"
        style={v(1.4)}
      />
      <T x={160} y={146} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.9}>
        Ask the client for the WHT certificate
      </T>
    </Scene>
  );
}

function ForeignTaxScene() {
  return (
    <Scene>
      <rect x={60} y={30} width={60} height={90} fill={OWE_L} stroke={OWE} className="a-growy" style={v(0.1)} />
      <rect x={196} y={52} width={60} height={68} fill={PRI_L} stroke={PRI} className="a-growy" style={v(0.6)} />
      <T x={90} y={136} anchor="middle" size={10.5} bold>
        Tax paid abroad
      </T>
      <T x={226} y={136} anchor="middle" size={10.5} bold>
        Sri Lankan tax on it
      </T>
      <T x={90} y={24} anchor="middle" size={10} mono color={OWE}>
        20%
      </T>
      <T x={226} y={46} anchor="middle" size={10} mono color={PRI}>
        {CAP}
      </T>
      <path d="M40,52 H276" stroke={OK} strokeWidth={2} strokeDasharray="5 4" className="a-in" style={v(1.2)} />
      <g className="a-in" style={v(1.5)}>
        <rect x={124} y={70} width={68} height={36} rx={4} fill={OK} />
        <T x={158} y={86} anchor="middle" size={10} bold color="#fff">
          Credit =
        </T>
        <T x={158} y={99} anchor="middle" size={10} bold color="#fff">
          the smaller
        </T>
      </g>
    </Scene>
  );
}

function InstalmentsScene() {
  const xAt = (m: number) => 18 + m * 13.6; // months after 1 Apr 2025
  const inst = rules.payments.instalments.map((p, i) => ({ x: xAt(4.5 + i * 3), label: dayShort(p.due) }));
  return (
    <Scene>
      <path
        d={`M${xAt(0)},70 H${xAt(20.5)}`}
        stroke={LINE}
        strokeWidth={2}
        pathLength={1}
        className="a-draw"
        style={v(0)}
      />
      <path d={`M${xAt(12)},40 V100`} stroke={MUTED} strokeDasharray="3 3" />
      <T x={xAt(12)} y={112} anchor="middle" size={9.5} color={MUTED}>
        year ends
      </T>
      {inst.map((p, i) => (
        <g key={i}>
          <g className="a-pop" style={v(0.4 + i * 0.35)}>
            <circle cx={p.x} cy={70} r={11} fill={GOLD} />
            <T x={p.x} y={74} anchor="middle" size={10} bold color="#fff">
              {i + 1}
            </T>
          </g>
          <T x={p.x} y={48} anchor="middle" size={9.5} cls="a-in" d={0.5 + i * 0.35}>
            {p.label}
          </T>
        </g>
      ))}
      <g className="a-pop" style={v(2)}>
        <circle cx={xAt(18)} cy={70} r={8} fill={OWE} />
      </g>
      <T x={xAt(18)} y={48} anchor="middle" size={9.5} bold color={OWE} cls="a-in" d={2.1}>
        {dayShort(rules.payments.final.due)}
      </T>
      <T x={xAt(18) - 6} y={96} anchor="middle" size={9.5} color={OWE} cls="a-in" d={2.1}>
        pay the rest
      </T>
      <g className="a-pop" style={v(2.4)}>
        <circle cx={xAt(20)} cy={70} r={8} fill={PRI} />
      </g>
      <T x={xAt(20) - 4} y={130} anchor="middle" size={9.5} bold color={PRI} cls="a-in" d={2.5}>
        {dayShort(rules.filing.deadline)}: file
      </T>
      <T x={xAt(9)} y={138} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.9}>
        Pay a quarter of the year’s tax each time
      </T>
    </Scene>
  );
}

function BandsScene() {
  const steps = [
    { w: 62, r: 0, c: RELIEF, l: '0%' },
    { w: 44, r: 0.06, c: BANDS[0]!, l: '6%' },
    { w: 34, r: 0.18, c: BANDS[1]!, l: '18%' },
    { w: 34, r: 0.24, c: BANDS[2]!, l: '24%' },
    { w: 34, r: 0.3, c: BANDS[3]!, l: '30%' },
    { w: 70, r: 0.36, c: BANDS[4]!, l: '36%' },
  ];
  let x = 18;
  const base = 112;
  return (
    <Scene>
      {steps.map((s, i) => {
        const h = Math.max(4, s.r * 220);
        const x0 = x;
        x += s.w + 2;
        return (
          <g key={i}>
            <rect
              x={x0}
              y={base - h}
              width={s.w}
              height={h}
              fill={s.c}
              className="a-growy"
              style={v(0.15 + i * 0.25)}
            />
            <T x={x0 + s.w / 2} y={base - h - 5} anchor="middle" size={10.5} bold cls="a-in" d={0.3 + i * 0.25}>
              {s.l}
            </T>
          </g>
        );
      })}
      <T x={49} y={126} anchor="middle" size={9.5} color={OK}>
        tax-free
      </T>
      <path
        d={`M126,${base - 0.15 * 220} H${x}`}
        stroke={GOLD}
        strokeWidth={2.5}
        strokeDasharray="5 3"
        className="a-in"
        style={v(2)}
      />
      <T x={x - 2} y={base - 0.15 * 220 - 5} anchor="end" size={9.5} bold color={GOLD} cls="a-in" d={2.1}>
        foreign income: max {CAP}
      </T>
      <T x={160} y={142} anchor="middle" size={10.5} color={MUTED} cls="a-in" d={1.7}>
        Each slice of income has its own rate
      </T>
    </Scene>
  );
}

function ReturnTypeScene() {
  return (
    <Scene>
      <Doc x={40} y={18} w={90} h={84} title="Simplified" lines={3} cls="a-in" style={v(0.1)} />
      <T x={85} y={120} anchor="middle" size={10.5} bold>
        Salary + interest
      </T>
      <T x={85} y={134} anchor="middle" size={10} color={MUTED}>
        a few boxes
      </T>
      <rect x={198} y={6} width={90} height={104} rx={3} fill={SHEET} stroke={LINE} className="a-in" style={v(0.8)} />
      <Doc x={192} y={12} w={90} h={104} title="Standard" lines={7} cls="a-in" style={v(0.9)} />
      <T x={237} y={130} anchor="middle" size={10.5} bold cls="a-in" d={1.2}>
        Freelance, rent, foreign…
      </T>
      <T x={237} y={144} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.2}>
        more schedules
      </T>
    </Scene>
  );
}

function DeadlinesScene() {
  const pts = [
    { x: 40, label: '31 Mar 2026', sub: 'tax year ends', c: MUTED },
    { x: 165, label: day(rules.payments.final.due), sub: 'pay what you owe', c: OWE },
    { x: 282, label: day(rules.filing.deadline), sub: 'file your return', c: PRI },
  ];
  return (
    <Scene>
      <path d="M24,70 H298" stroke={LINE} strokeWidth={2} pathLength={1} className="a-draw" style={v(0)} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={70} r={9} fill={p.c} className="a-pop" style={v(0.4 + i * 0.5)} />
          <T x={p.x} y={48} anchor="middle" size={10.5} bold color={p.c} cls="a-in" d={0.5 + i * 0.5}>
            {p.label}
          </T>
          <T x={p.x} y={96} anchor="middle" size={10} color={MUTED} cls="a-in" d={0.6 + i * 0.5}>
            {p.sub}
          </T>
        </g>
      ))}
      <T x={160} y={134} anchor="middle" size={10.5} color={OWE} cls="a-in" d={2}>
        Late? Penalties and interest are added
      </T>
    </Scene>
  );
}

function PayslipsScene() {
  return (
    <Scene>
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={18 + i * 6}
          y={22 + i * 6}
          width={80}
          height={92}
          rx={3}
          fill={SHEET}
          stroke={LINE}
          className="a-from"
          style={v(0.1 + i * 0.12, -30, 0)}
        />
      ))}
      <T x={88} y={130} anchor="middle" size={10.5} bold>
        12 payslips
      </T>
      <T x={58} y={72} size={10} cls="a-in" d={0.9}>
        Gross
      </T>
      <T x={58} y={86} size={10} color={OWE} cls="a-in" d={0.9}>
        APIT
      </T>
      <Arrow x1={130} y1={70} x2={186} y2={70} d={1.1} />
      <T x={158} y={60} anchor="middle" size={9.5} color={MUTED} cls="a-in" d={1.2}>
        added up
      </T>
      <Doc x={196} y={22} w={110} h={92} title="T-10 certificate" lines={2} cls="a-in" style={v(1.5)} />
      <T x={204} y={84} size={10} cls="a-in" d={1.7}>
        Year total
      </T>
      <T x={204} y={98} size={10} color={OWE} cls="a-in" d={1.8}>
        APIT for the year
      </T>
      <T x={251} y={130} anchor="middle" size={10.5} bold cls="a-in" d={1.9}>
        Same answer
      </T>
    </Scene>
  );
}

function PeggedScene() {
  return (
    <Scene>
      <Coin cx={40} cy={64} r={26} fill={GOLD} text="$2,000" cls="a-pop" style={v(0)} />
      <T x={40} y={108} anchor="middle" size={10} color={MUTED}>
        salary in dollars
      </T>
      <Arrow x1={70} y1={52} x2={104} y2={40} color={PRI} d={0.4} />
      <Arrow x1={70} y1={76} x2={104} y2={92} color={GOLD} d={0.8} />
      <rect x={110} y={24} width={130} height={30} rx={3} fill={PRI_L} stroke={PRI} className="a-grow" style={v(0.6)} />
      <T x={116} y={44} size={10.5} bold color={PRI} cls="a-in" d={0.9}>
        Basic: × 200 peg
      </T>
      <T x={300} y={44} size={11} anchor="end" mono cls="a-in" d={1}>
        400,000
      </T>
      <rect x={110} y={76} width={66} height={30} rx={3} fill={GOLD_L} stroke={GOLD} className="a-grow" style={v(1)} />
      <T x={116} y={96} size={10.5} bold color={GOLD} cls="a-in" d={1.3}>
        Allowance: × 100 more
      </T>
      <T x={300} y={96} size={11} anchor="end" mono cls="a-in" d={1.4}>
        200,000
      </T>
      <path d="M110,120 H304" stroke={INK} strokeWidth={1} className="a-in" style={v(1.7)} />
      <T x={116} y={138} size={11} bold cls="a-in" d={1.8}>
        Taxed on both
      </T>
      <T x={300} y={138} size={11.5} anchor="end" mono bold cls="a-in" d={1.9}>
        600,000
      </T>
    </Scene>
  );
}

function BonusScene() {
  const months = 'AMJJASONDJFM'.split('');
  return (
    <Scene>
      {months.map((m, i) => {
        const bonus = i === 5;
        return (
          <g key={i}>
            <rect
              x={20 + i * 24}
              y={70}
              width={18}
              height={40}
              fill={PRI_L}
              className="a-growy"
              style={v(0.1 + i * 0.05)}
            />
            {bonus && (
              <rect x={20 + i * 24} y={14} width={18} height={56} fill={GOLD} className="a-growy" style={v(1)} />
            )}
            <T x={29 + i * 24} y={124} anchor="middle" size={9.5} color={bonus ? GOLD : MUTED} bold={bonus}>
              {m}
            </T>
          </g>
        );
      })}
      <T x={150} y={30} size={10.5} bold color={GOLD} cls="a-in" d={1.4}>
        Bonus month
      </T>
      <T x={150} y={44} size={10} color={MUTED} cls="a-in" d={1.6}>
        taxed at your top rate
      </T>
      <T x={160} y={142} anchor="middle" size={10} color={MUTED} cls="a-in" d={1.9}>
        Regular pay: the same tax every month
      </T>
    </Scene>
  );
}

// ---------- topics ----------

export interface Topic {
  title: string;
  scene: () => ReactNode;
  body: ReactNode;
  example?: ReactNode;
  where?: ReactNode;
}

export const TOPICS = {
  resident: {
    title: 'Are you a resident?',
    scene: ResidentScene,
    body: (
      <>
        <p>
          For tax, you are a <b>resident</b> if you were in Sri Lanka for <b>183 days or more</b> in the tax year (1
          April 2025 to 31 March 2026). The days don&rsquo;t have to be in a row.
        </p>
        <p>Most people who live and work here are residents. Short trips abroad don&rsquo;t change that.</p>
      </>
    ),
    example: 'You lived in Colombo all year and took a two-week holiday in Thailand. You are a resident.',
  },
  otherIncome: {
    title: 'Other kinds of income',
    scene: OtherIncomeScene,
    body: (
      <>
        <p>
          This calculator works out tax on <b>salary</b>, <b>bank interest</b> and <b>freelance or foreign work</b>.
        </p>
        <p>
          If you also earned <b>rent</b>, <b>dividends</b> from shares, a salary from a <b>foreign employer</b>, or made
          a profit <b>selling land or shares</b>, answer Yes. Those need the Standard Return, which this tool
          doesn&rsquo;t cover yet.
        </p>
      </>
    ),
  },
  reliefs: {
    title: 'Reliefs: income that isn’t taxed',
    scene: ReliefsScene,
    body: (
      <>
        <p>
          Everyone gets a <b>personal relief</b> of {rs(RELIEF_AMT)} a year. That slice of your income is tax-free, and
          this calculator applies it for you.
        </p>
        <p>
          Some spending can reduce your taxable income further, such as <b>installing solar panels</b> or certain{' '}
          <b>donations</b>. If you want to claim any of those, answer Yes: they need the Standard Return.
        </p>
      </>
    ),
  },
  apit: {
    title: 'What is APIT?',
    scene: ApitScene,
    body: (
      <>
        <p>
          <b>APIT</b> (Advance Personal Income Tax) is the tax your employer cuts from your salary every month and sends
          to the Inland Revenue Department (IRD). It used to be called PAYE.
        </p>
        <p>
          Everything deducted counts as tax <b>you have already paid</b>. If your salary is under Rs 150,000 a month,
          usually nothing is deducted because no tax is due.
        </p>
      </>
    ),
    where: 'Your payslips, or the yearly APIT certificate your employer gives you.',
  },
  irdFile: {
    title: 'Your IRD tax file',
    scene: IrdFileScene,
    body: (
      <>
        <p>
          When you register with IRD you get a <b>TIN</b> (Taxpayer Identification Number) and a login for <b>RAMIS</b>,
          IRD&rsquo;s online system for filing returns and paying tax.
        </p>
        <p>
          Answer Yes if you have a TIN, have filed before, or IRD has written to you asking for a return. Once you have
          a file, IRD may expect a return even in a year when you owe nothing.
        </p>
      </>
    ),
  },
  employment: {
    title: 'Salary from your employer',
    scene: EmploymentScene,
    body: (
      <>
        <p>
          Enter your <b>gross remuneration</b>: everything your employer paid you in the year <b>before</b> any
          deductions, including allowances and bonuses.
        </p>
        <p>
          Then enter the <b>APIT deducted</b>. If you had two jobs, add one line for each. Your main job is your
          &ldquo;primary&rdquo; employment.
        </p>
      </>
    ),
    where: 'The annual APIT certificate from each employer. Ask HR or payroll if you didn’t receive one.',
  },
  interest: {
    title: 'Bank interest and AIT',
    scene: InterestScene,
    body: (
      <>
        <p>
          When a bank pays you interest, it keeps back <b>{AIT}</b> as <b>AIT</b> (Advance Income Tax, also called WHT)
          and pays it to IRD for you.
        </p>
        <p>
          Enter the <b>gross</b> interest, which is the amount before that {AIT} was taken. The {AIT} counts as tax
          you&rsquo;ve already paid, so if your total tax is lower, you can <b>claim the difference back</b>.
        </p>
      </>
    ),
    example:
      'You earned Rs 50,000 interest and the bank kept Rs 5,000. Enter 50,000 as gross interest and 5,000 as AIT.',
    where:
      'Ask each bank for an interest or AIT certificate for April 2025 to March 2026. Many banks show it in online banking.',
  },
  freelance: {
    title: 'Freelance and foreign income',
    scene: FreelanceScene,
    body: (
      <>
        <p>
          Income from work you do <b>for yourself</b> (not as an employee): freelancing, consulting, tutoring, online
          platforms like Upwork or Fiverr, or software and design work for overseas clients.
        </p>
        <p>
          Add one entry per client or platform. Unlike salary, no one takes tax out for you, so you need to pay it
          yourself.
        </p>
      </>
    ),
  },
  clientLocation: {
    title: 'Where is your client?',
    scene: ClientLocationScene,
    body: (
      <>
        <p>
          Choose <b>Abroad</b> if the client or platform paying you is outside Sri Lanka, even though you did the work
          from here. This is <b>foreign income</b>, and it can qualify for a lower tax rate.
        </p>
        <p>
          Choose <b>In Sri Lanka</b> if a local company or person pays you. That is taxed at the normal rates, and the
          client may deduct {WHT} tax before paying you.
        </p>
      </>
    ),
  },
  remitted: {
    title: 'Brought in through a Sri Lankan bank?',
    scene: RemittedScene,
    body: (
      <>
        <p>
          Foreign income is taxed at <b>no more than {CAP}</b> if it&rsquo;s received <b>in foreign currency</b>{' '}
          (dollars, euros and so on) <b>through a bank in Sri Lanka</b>, for example straight into a USD account here.
        </p>
        <p>
          Money that stays in <b>Payoneer, Wise, PayPal</b> or a bank abroad doesn&rsquo;t qualify, so it&rsquo;s taxed
          at the normal rates of up to 36%.
        </p>
      </>
    ),
    example:
      'Moving your Payoneer balance to your Sri Lankan bank’s dollar account before you spend it keeps you on the lower rate.',
  },
  fxMonthly: {
    title: 'Converting dollars to rupees',
    scene: FxScene,
    body: (
      <>
        <p>
          Tax is worked out in rupees. Enter the dollars you received <b>in each month</b>, and we convert them using
          the Central Bank of Sri Lanka (CBSL) <b>average USD rate for that month</b>.
        </p>
        <p>
          The law uses the CBSL rate on the <b>exact day</b> the money was received, so the monthly average is a close
          estimate. Use the month the money reached you, not the month you sent the invoice.
        </p>
      </>
    ),
    where: (
      <>
        Your bank or Payoneer statement.{' '}
        <a href="https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates" target="_blank" rel="noreferrer">
          CBSL exchange rates
        </a>
      </>
    ),
  },
  expenses: {
    title: 'Expenses',
    scene: ExpensesScene,
    body: (
      <>
        <p>
          You pay tax on your <b>profit</b>, not on everything clients paid you. Subtract costs you had{' '}
          <b>only because of this work</b>.
        </p>
        <p>
          Typical ones are platform and payment fees, software subscriptions, and the work share of internet and phone
          bills. Personal spending doesn&rsquo;t count. Keep receipts in case IRD asks.
        </p>
      </>
    ),
    example: 'Clients paid Rs 1,000,000 and Upwork fees plus software cost Rs 200,000. You are taxed on Rs 800,000.',
  },
  wht: {
    title: 'Tax deducted by a local client (WHT)',
    scene: WhtScene,
    body: (
      <>
        <p>
          When a Sri Lankan client pays you more than Rs 100,000 in a month for services, they must keep back{' '}
          <b>{WHT}</b> as <b>withholding tax (WHT)</b> and pay it to IRD.
        </p>
        <p>That amount counts as tax you&rsquo;ve already paid. Enter the total they deducted during the year.</p>
      </>
    ),
    where: 'Ask each client for a WHT certificate. Leave it blank if nothing was deducted.',
  },
  foreignTax: {
    title: 'Tax paid abroad',
    scene: ForeignTaxScene,
    body: (
      <>
        <p>
          If another country already taxed this income, enter what you paid. It&rsquo;s taken off your Sri Lankan tax so
          you don&rsquo;t pay twice.
        </p>
        <p>
          The credit can&rsquo;t be more than the Sri Lankan tax on that same income, and any extra isn&rsquo;t
          refunded. Most freelancers paid by platforms have <b>no</b> foreign tax, so leave it blank.
        </p>
      </>
    ),
  },
  instalments: {
    title: 'Quarterly instalments',
    scene: InstalmentsScene,
    body: (
      <>
        <p>
          Because nobody deducts tax from freelance income, IRD expects you to pay it in <b>four instalments</b>:{' '}
          {rules.payments.instalments.map((p) => dayShort(p.due)).join(', ')}. Anything left is due by{' '}
          {day(rules.payments.final.due)}.
        </p>
        <p>
          Enter the total you&rsquo;ve paid for 2025/26 so far. It counts as tax already paid. Leave it blank if you
          haven&rsquo;t paid any.
        </p>
      </>
    ),
    where: 'Payment receipts in RAMIS, or the bank slips from paying at a bank.',
  },
  bands: {
    title: 'How the tax rates work',
    scene: BandsScene,
    body: (
      <>
        <p>
          The first {rs(RELIEF_AMT)} is <b>tax-free</b>. After that, the next Rs 1,000,000 is taxed at 6%, the next Rs
          500,000 at 18%, then 24%, then 30%, and anything above at 36%.
        </p>
        <p>
          A higher rate only applies to the slice of income in that step, so earning more never leaves you worse off.
          Foreign income brought in through a bank is never taxed at more than {CAP}.
        </p>
      </>
    ),
  },
  returnType: {
    title: 'Simplified or Standard Return',
    scene: ReturnTypeScene,
    body: (
      <>
        <p>
          You file your return online in <b>RAMIS</b>. If you only had salary and bank interest, you can use the shorter{' '}
          <b>Simplified Return</b>.
        </p>
        <p>
          With freelance, business, rent or foreign income you need the <b>Standard Return</b>, which has more
          schedules. The computation here follows the same steps, so you can copy the figures across.
        </p>
      </>
    ),
  },
  deadlines: {
    title: 'Key dates',
    scene: DeadlinesScene,
    body: (
      <>
        <p>
          The tax year runs from 1 April 2025 to 31 March 2026. Pay any tax you still owe by{' '}
          <b>{day(rules.payments.final.due)}</b>, and file your return by <b>{day(rules.filing.deadline)}</b>.
        </p>
        <p>Paying or filing late adds penalties and interest, so file even if you can&rsquo;t pay everything yet.</p>
      </>
    ),
  },
  payslips: {
    title: 'T-10 certificate or payslips?',
    scene: PayslipsScene,
    body: (
      <>
        <p>
          The <b>T-10</b> is the yearly certificate your employer gives you after March. It shows your total pay and the
          total APIT deducted. If you have it, choose T-10 and copy two numbers.
        </p>
        <p>
          No T-10 yet? Choose <b>Monthly payslips</b> and enter each month&rsquo;s <b>total gross earnings</b> and{' '}
          <b>APIT</b>. Your own EPF 8% and other deductions don&rsquo;t reduce tax, so ignore them. Employer EPF 12% and
          ETF 3% aren&rsquo;t taxed either.
        </p>
      </>
    ),
    where: 'Ask HR or payroll for the T-10. Payslips are usually in your HR system or email.',
  },
  pegged: {
    title: 'Salaries pegged to US dollars',
    scene: PeggedScene,
    body: (
      <>
        <p>
          Some companies set your salary in <b>US dollars</b>. The payslip shows a <b>basic salary</b> at a fixed peg
          rate (for example Rs 200 per dollar) and a <b>variable allowance</b> that tops it up to the current exchange
          rate.
        </p>
        <p>
          Both parts are taxable salary. Enter the dollar amount and we work out the basic. The allowance is estimated
          from the CBSL monthly average until you type the figure from your payslip. Add any other regular monthly
          allowance, such as an ex gratia payment, to the same box.
        </p>
      </>
    ),
    example: '$2,000 at a Rs 200 peg is a basic of Rs 400,000. At Rs 300 a dollar the allowance is Rs 200,000.',
  },
  bonus: {
    title: 'Bonuses and one-off payments',
    scene: BonusScene,
    body: (
      <>
        <p>
          Put <b>bonuses</b>, <b>salary arrears</b> and other <b>one-off payments</b> in this column, not in the monthly
          pay. Your employer deducts APIT on them at your highest rate, which is often 36%.
        </p>
        <p>
          Keeping them separate lets the calculator check the APIT on each payslip. It all adds up to the same yearly
          income either way.
        </p>
      </>
    ),
  },
} satisfies Record<string, Topic>;

export type TopicId = keyof typeof TOPICS;
