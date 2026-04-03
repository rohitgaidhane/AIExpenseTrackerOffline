import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import type { CategorySlice } from "@/db/transactions-repo";

const PALETTE = [
  "#208AEF",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
  "#EF4444",
  "#64748B",
];

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

type Props = {
  slices: CategorySlice[];
  size?: number;
};

export function CategoryPieChart({ slices, size = 200 }: Props) {
  const total = slices.reduce((s, x) => s + x.total, 0);

  if (total <= 0 || slices.length === 0) {
    return (
      <View style={[styles.emptyWrap, { minHeight: size * 0.6 }]}>
        <Text style={styles.empty}>No debit categories this month yet.</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  let angle = -Math.PI / 2;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((sl, i) => {
            const frac = sl.total / total;
            const sweep = frac * Math.PI * 2;
            const start = angle;
            angle += sweep;
            const d = arcPath(cx, cy, r, start, angle);
            const fill = PALETTE[i % PALETTE.length];
            return <Path key={sl.category} d={d} fill={fill} />;
          })}
        </G>
      </Svg>
      <View style={styles.legend}>
        {slices.map((sl, i) => (
          <View key={sl.category} style={styles.legendRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: PALETTE[i % PALETTE.length] },
              ]}
            />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {sl.category}
            </Text>
            <Text style={styles.legendAmt}>
              ₹{sl.total.toFixed(sl.total >= 100 ? 0 : 2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  emptyWrap: {
    justifyContent: "center",
  },
  empty: {
    opacity: 0.7,
    fontSize: 14,
  },
  legend: {
    flex: 1,
    minWidth: 160,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
  },
  legendAmt: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
