"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

interface Point {
  x: number;
  y: number;
}

interface Series {
  label: string;
  color: string;
  points: Point[];
}

interface MultiLineChartProps {
  series: Series[];
  height?: number;
  minY?: number;
  maxY?: number;
}

export function MultiLineChart({
  series,
  height = 220,
  minY,
  maxY,
}: MultiLineChartProps) {
  const option = useMemo<EChartsOption>(() => {
    const allPoints = series.flatMap((entry) => entry.points);
    if (allPoints.length === 0) {
      return {};
    }

    const xValues = [...new Set(allPoints.map((point) => point.x))].sort((a, b) => a - b);
    const computedMinY = minY ?? Math.min(...allPoints.map((point) => point.y));
    const computedMaxY = maxY ?? Math.max(...allPoints.map((point) => point.y));

    return {
      color: series.map((line) => line.color),
      grid: {
        left: 24,
        right: 20,
        top: 30,
        bottom: 24,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderWidth: 0,
        textStyle: { color: "#f8fafc" },
      },
      legend: {
        type: "scroll",
        top: 0,
        textStyle: { color: "#475569", fontSize: 11 },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xValues,
        axisLine: { lineStyle: { color: "rgba(100,116,139,0.35)" } },
        axisLabel: { color: "#64748b" },
      },
      yAxis: {
        type: "value",
        min: computedMinY,
        max: computedMaxY,
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: "rgba(100,116,139,0.15)" },
        },
        axisLabel: { color: "#64748b" },
      },
      series: series.map((line) => ({
        name: line.label,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.08,
        },
        data: xValues.map((x) => {
          const point = line.points.find((candidate) => candidate.x === x);
          return point?.y ?? null;
        }),
      })),
    };
  }, [maxY, minY, series]);

  if (series.length === 0) {
    return null;
  }

  return <ReactECharts option={option} style={{ height }} />;
}
