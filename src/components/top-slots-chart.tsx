"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { days, sessions, type rankSlots } from "@/lib/team";

export function TopSlotsChart({
  ranks,
  memberCount,
}: {
  ranks: ReturnType<typeof rankSlots>;
  memberCount: number;
}) {
  const data = ranks.map((rank, index) => ({
    label: `${days[Math.floor(rank.slot / 3)]} · ${sessions[rank.slot % 3].name}`,
    available: rank.available,
    fill: index === 0 ? "#fcd34d" : "#94a3b8",
  }));

  return (
    <figure
      className="mt-6"
      aria-label="Biểu đồ số người có mặt ở top 5 khung giờ"
    >
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="#ffffff12" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.max(1, memberCount)]}
              allowDecimals={false}
              tickCount={Math.min(memberCount + 1, 5)}
              tick={{ fill: "#a7bdb3", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={104}
              interval={0}
              tick={{ fill: "#d1e3da", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#ffffff08" }}
              contentStyle={{
                background: "#0a211a",
                border: "1px solid #ffffff26",
                borderRadius: 8,
                color: "#eef7ef",
                fontSize: 12,
              }}
              itemStyle={{ color: "#eef7ef" }}
            />
            <Bar
              dataKey="available"
              name="Số người có mặt"
              barSize={22}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="available"
                position="right"
                fill="#eef7ef"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-center text-xs text-emerald-100/60">
        Số người có mặt ·{" "}
        <span className="text-amber-300">Vàng: khung giờ tốt nhất</span>
      </figcaption>
    </figure>
  );
}
