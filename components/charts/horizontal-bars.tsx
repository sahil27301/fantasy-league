"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

interface HorizontalBarDatum {
  label: string;
  value: number;
}

interface HorizontalBarsProps {
  data: HorizontalBarDatum[];
  highlightedLabel?: string | null;
  highlightedLabels?: string[];
  highlightRoles?: Record<string, "captain" | "viceCaptain">;
  onSelectLabel?: (label: string) => void;
}

function formatChartValue(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function HorizontalBars({
  data,
  highlightedLabel = null,
  highlightedLabels = [],
  highlightRoles = {},
  onSelectLabel,
}: HorizontalBarsProps) {
  const option = useMemo<EChartsOption>(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const highlightedSet = new Set(
      [
        ...highlightedLabels,
        ...(highlightedLabel ? [highlightedLabel] : []),
      ].filter(Boolean),
    );
    return {
      grid: {
        left: 4,
        right: 58,
        top: 6,
        bottom: 0,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        show: false,
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: sorted.map((item) => item.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          width: 120,
          overflow: "truncate",
          color: "#334155",
          fontSize: 11,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(30, 41, 82, 0.94)",
        borderWidth: 0,
        textStyle: {
          color: "#f8fafc",
        },
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          const value =
            typeof point === "object" && point !== null && "value" in point
              ? Number((point as { value: number }).value)
              : 0;
          return formatChartValue(value);
        },
      },
      series: [
        {
          type: "bar",
          data: sorted.map((item) => item.value),
          barWidth: 12,
          clip: false,
          showBackground: true,
          backgroundStyle: {
            color: "rgba(148, 163, 184, 0.25)",
            borderRadius: 999,
          },
          itemStyle: {
            borderRadius: 999,
            color: (params: any) => {
              const entry = sorted[params.dataIndex];
              const label = entry?.label ?? "";
              const isHighlighted = highlightedSet.has(label);
              if (isHighlighted) {
                const role = highlightRoles[label];
                if (role === "viceCaptain") {
                  return {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 1,
                    y2: 0,
                    colorStops: [
                      { offset: 0, color: "#0f172a" },
                      { offset: 1, color: "#0284c7" },
                    ],
                  };
                }
                return {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: "#0f172a" },
                    { offset: 1, color: "#4f46e5" },
                  ],
                };
              }
              return {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: "#4338ca" },
                  { offset: 1, color: "#0284c7" },
                ],
              };
            },
          },
          label: {
            show: true,
            position: "right",
            distance: 10,
            color: "#0f172a",
            fontWeight: 700,
            fontSize: 11,
            formatter: (params: any) =>
              formatChartValue(Number(params.value)),
          },
        },
      ],
    };
  }, [data, highlightedLabel, highlightedLabels, highlightRoles]);

  return (
    <ReactECharts
      option={option}
      style={{ height: Math.max(240, data.length * 40) }}
      onEvents={
        onSelectLabel
          ? {
              click: (params: { name?: string }) => {
                if (params.name) {
                  onSelectLabel(params.name);
                }
              },
            }
          : undefined
      }
    />
  );
}
