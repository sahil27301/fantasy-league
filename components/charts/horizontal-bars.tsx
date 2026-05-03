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
        left: 8,
        right: 64,
        top: 8,
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
          width: 150,
          overflow: "truncate",
          color: "#334155",
          fontSize: 12,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 23, 42, 0.92)",
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
                  { offset: 0, color: "#4f46e5" },
                  { offset: 1, color: "#0ea5e9" },
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
      style={{ height: Math.max(280, data.length * 44) }}
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
