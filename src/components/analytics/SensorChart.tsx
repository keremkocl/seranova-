"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface SensorDataPoint {
  date: string;
  temperature: number | null;
  humidity: number | null;
  ph: number | null;
  ec: number | null;
  lightLevel: number | null;
  soilMoisture: number | null;
}

interface Props {
  data: SensorDataPoint[];
}

const GRID    = "rgba(255, 255, 255, 0.08)";
const AXIS    = "#94A3B8";    // slate-400
const PRIMARY = "#F8FAFC";    // slate-50 — main metric
const ACCENT  = "#22C55E";    // emerald-500 — secondary metric

const tooltipStyle: React.CSSProperties = {
  background:    "rgba(8, 22, 16, 0.96)",
  borderRadius:  "12px",
  border:        "1px solid rgba(255, 255, 255, 0.10)",
  fontSize:      "12px",
  color:         "#F8FAFC",
  boxShadow:     "0 24px 60px -32px rgba(0, 0, 0, 0.65)",
  padding:       "8px 12px",
};

const tooltipLabelStyle: React.CSSProperties = { color: "#94A3B8", marginBottom: 4 };
const tooltipItemStyle:  React.CSSProperties = { color: "#F8FAFC" };

const legendStyle: React.CSSProperties = { fontSize: 11, color: "#CBD5E1", paddingTop: 8 };

const axisTick = { fontSize: 11, fill: AXIS };

function commonLineProps(color: string) {
  return {
    strokeWidth: 2,
    stroke: color,
    dot: { r: 0, fill: color },
    activeDot: { r: 4, strokeWidth: 0, fill: color },
    connectNulls: true,
  } as const;
}

export function TempHumidityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: "rgba(255,255,255,0.05)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <Line {...commonLineProps(PRIMARY)} type="monotone" dataKey="temperature" name="Sıcaklık (°C)" />
        <Line {...commonLineProps(ACCENT)}  type="monotone" dataKey="humidity"    name="Nem (%)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PhEcChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: "rgba(255,255,255,0.05)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <Line {...commonLineProps(PRIMARY)} type="monotone" dataKey="ph" name="pH" />
        <Line {...commonLineProps(ACCENT)}  type="monotone" dataKey="ec" name="EC (dS/m)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SoilMoistureChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: "rgba(255,255,255,0.05)" }} />
        <Line {...commonLineProps(ACCENT)} type="monotone" dataKey="soilMoisture" name="Toprak Nemi (%)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
