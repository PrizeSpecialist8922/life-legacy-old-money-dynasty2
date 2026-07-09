import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Character } from "../../game/types";
import { formatMoney } from "../../game/util";

export function NetWorthChart({ character }: { character: Character }) {
  const data = character.netWorthHistory;
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Net Worth Over Time</h3>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.14 84)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.82 0.14 84)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="age"
              tick={{ fontSize: 10, fill: "oklch(0.68 0.03 258)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={44}
              tick={{ fontSize: 10, fill: "oklch(0.68 0.03 258)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatMoney(Number(v))}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.2 0.03 264)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 12,
                color: "white",
              }}
              formatter={(v) => [formatMoney(Number(v)), "Net worth"]}
              labelFormatter={(l) => `Age ${l}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="oklch(0.82 0.14 84)"
              strokeWidth={2}
              fill="url(#nw)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
