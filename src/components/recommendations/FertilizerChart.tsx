"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ApplicationSchedule } from "@/types";

interface FertilizerChartProps {
  schedule: ApplicationSchedule[];
}

export default function FertilizerChart({ schedule }: FertilizerChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={schedule} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" kg/da" />
        <Tooltip formatter={(v) => [`${v} kg/da`]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="nitrogen"   name="Azot (N)"      fill="#4ade80" radius={[3,3,0,0]} />
        <Bar dataKey="phosphorus" name="Fosfor (P)"    fill="#60a5fa" radius={[3,3,0,0]} />
        <Bar dataKey="potassium"  name="Potasyum (K)"  fill="#f59e0b" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
