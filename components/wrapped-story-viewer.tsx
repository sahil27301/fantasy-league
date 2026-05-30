"use client";

import type {
  TeamWrappedPayload,
  WrappedGlobalStat,
} from "@/lib/wrapped/types";
import { WrappedBestMatchBreakdownTable } from "@/components/wrapped-best-match-breakdown-table";
import { WrappedCaptaincyBreakdownTable } from "@/components/wrapped-captaincy-breakdown-table";
import { WrappedLeagueBestPlayersCard } from "@/components/wrapped-league-best-players-card";
import { WrappedTopPerformersTable } from "@/components/wrapped-top-performers-table";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface WrappedStoryViewerProps {
  payload: TeamWrappedPayload;
}

interface MetricTooltipContent {
  title: string;
  lines: string[];
}

export function WrappedStoryViewer({ payload }: WrappedStoryViewerProps) {
  const animationTimeScale = 2;
  const searchParams = useSearchParams();
  const isSlowMo = searchParams.get("slowmo") === "1";
  const firstSlideFocusHoldMs = Math.round(
    (isSlowMo ? 1700 : 650) * animationTimeScale,
  );
  const firstSlideTransitionMs = Math.round(
    (isSlowMo ? 3200 : 1700) * animationTimeScale,
  );
  const firstSlideIntroFadeMs = Math.round(
    (isSlowMo ? 1600 : 850) * animationTimeScale,
  );
  const firstSlideIntroGapMs = Math.round(
    (isSlowMo ? 900 : 450) * animationTimeScale,
  );
  const wrappedCardInMs = Math.round(380 * animationTimeScale);
  const wrappedDriftSec = 14 * animationTimeScale;
  const wrappedFloatLeftSec = 9 * animationTimeScale;
  const wrappedFloatRightSec = 12 * animationTimeScale;
  const rowOpacityTransitionMs = Math.round(520 * animationTimeScale);
  const rowHeaderFadeMs = Math.round(500 * animationTimeScale);
  const globalLowerSectionDelayMs = Math.round(320 * animationTimeScale);
  const globalLowerSectionInMs = Math.round(560 * animationTimeScale);
  const detailTableMotion = useMemo(
    () => ({
      introDelayMs: firstSlideIntroGapMs,
      tableInMs: firstSlideIntroFadeMs,
      rowInMs: rowOpacityTransitionMs,
      rowStaggerMs: Math.max(Math.round(rowOpacityTransitionMs * 0.32), 90),
    }),
    [firstSlideIntroGapMs, firstSlideIntroFadeMs, rowOpacityTransitionMs],
  );
  const highlightedRowIndex = Math.max(
    payload.pointsTable.findIndex((row) => row.teamId === payload.teamId),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [tooltipOpenCardId, setTooltipOpenCardId] = useState<string | null>(null);
  const [firstSlidePhase, setFirstSlidePhase] = useState<"focus" | "expand">(
    "focus",
  );
  const [firstSlideReady, setFirstSlideReady] = useState(false);
  const [firstSlideMetrics, setFirstSlideMetrics] = useState({
    focusOffset: Math.max(highlightedRowIndex * 44 - 8, 0),
    focusHeight: 160,
    tableFullHeight: 420,
    tableScale: 1,
  });
  const dragStartX = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTouchInteractionAtMs = useRef<number>(0);
  const firstSlideSceneRef = useRef<HTMLDivElement | null>(null);
  const firstSlideViewportRef = useRef<HTMLDivElement | null>(null);
  const firstSlideTableRef = useRef<HTMLDivElement | null>(null);
  const firstSlideHeaderRef = useRef<HTMLDivElement | null>(null);
  const highlightedRowRef = useRef<HTMLDivElement | null>(null);
  const totalCards = payload.cards.length;
  const activeCard = payload.cards[activeIndex];
  const globalStatByCardId = useMemo(
    () =>
      new Map(payload.globalStats.map((stat) => [`global-${stat.id}`, stat])),
    [payload.globalStats],
  );
  const activeGlobalStat =
    activeCard.kind === "global"
      ? globalStatByCardId.get(activeCard.id)
      : undefined;
  const activeVolatilityDetails =
    activeGlobalStat?.id === "volatility-king" ? activeGlobalStat.volatilityDetails : undefined;
  const activeLeagueBestPlayersBreakdown =
    activeGlobalStat?.id === "overall-best-player"
      ? activeGlobalStat.leagueBestPlayersBreakdown
      : undefined;
  const activeBestMatchBreakdown =
    activeCard.id === "personal-best-match" ? activeCard.bestMatchBreakdown : undefined;
  const activeWorstMatchBreakdown =
    activeCard.id === "personal-worst-match" ? activeCard.worstMatchBreakdown : undefined;
  const activeCaptaincyBreakdown =
    activeCard.id === "personal-captaincy" ? activeCard.captaincyBreakdown : undefined;
  const activeTopPerformersBreakdown =
    activeCard.id === "personal-top-performers"
      ? activeCard.topPerformersBreakdown
      : undefined;
  const isGlobalCard = activeCard.kind === "global";
  const activeMetricTooltip = useMemo<MetricTooltipContent | null>(() => {
    if (!activeGlobalStat) {
      return null;
    }
    if (activeGlobalStat.id === "concentration-king") {
      return {
        title: "How Star Dependence is calculated",
        lines: [
          "We measure how concentrated your total points are among contributors.",
          "Base index: normalized concentration from contributor point shares (after C/VC multipliers).",
          "Displayed value uses a square-root stretch to increase visual separation between teams.",
          "Higher % = more dependence on a few players. Lower % = more balanced scoring spread.",
        ],
      };
    }
    if (activeGlobalStat.id === "depth-king") {
      return {
        title: "How Depth is calculated",
        lines: [
          "Depth is the inverse of Star Dependence after the same stretch.",
          "Depth = 100% - Star Dependence.",
          "Higher % means your points came from a broader set of contributors.",
        ],
      };
    }
    return null;
  }, [activeGlobalStat]);
  const shouldTopAlignCard =
    activeCard.id === "personal-captaincy" ||
    activeCard.id === "personal-worst-match" ||
    activeCard.id === "personal-top-performers" ||
    activeCard.id === "league-transition" ||
    isGlobalCard;
  const isFirstSlide = activeIndex === 0;
  const isMetricTooltipOpen = tooltipOpenCardId === activeCard.id;

  useEffect(() => {
    if (activeCard.id !== "personal-best-match") {
      return;
    }
    console.info("[wrapped-viewer] Rendering best match slide", {
      activeIndex,
      hasBreakdown: Boolean(activeBestMatchBreakdown),
      matchupLabel: activeBestMatchBreakdown?.matchupLabel ?? null,
      matchNumber: activeBestMatchBreakdown?.matchNumber ?? null,
      playerCount: activeBestMatchBreakdown?.players.length ?? 0,
    });
  }, [activeIndex, activeCard.id, activeBestMatchBreakdown]);

  useEffect(() => {
    if (activeCard.id !== "personal-worst-match") {
      return;
    }
    console.info("[wrapped-viewer] Rendering lowest match slide", {
      activeIndex,
      hasBreakdown: Boolean(activeWorstMatchBreakdown),
      matchupLabel: activeWorstMatchBreakdown?.matchupLabel ?? null,
      matchNumber: activeWorstMatchBreakdown?.matchNumber ?? null,
      playerCount: activeWorstMatchBreakdown?.players.length ?? 0,
    });
  }, [activeIndex, activeCard.id, activeWorstMatchBreakdown]);

  useEffect(() => {
    if (activeCard.id !== "personal-best-match") {
      return;
    }
    console.info("[wrapped-viewer] Best match table intro configuration", {
      activeIndex,
      detailTableMotion,
      hasBreakdown: Boolean(activeBestMatchBreakdown),
      playerCount: activeBestMatchBreakdown?.players.length ?? 0,
    });
  }, [
    activeIndex,
    activeCard.id,
    activeBestMatchBreakdown,
    detailTableMotion,
  ]);

  useEffect(() => {
    if (activeCard.id !== "personal-worst-match") {
      return;
    }
    console.info("[wrapped-viewer] Lowest match table intro configuration", {
      activeIndex,
      detailTableMotion,
      hasBreakdown: Boolean(activeWorstMatchBreakdown),
      playerCount: activeWorstMatchBreakdown?.players.length ?? 0,
      matchupLabel: activeWorstMatchBreakdown?.matchupLabel ?? null,
      matchNumber: activeWorstMatchBreakdown?.matchNumber ?? null,
    });
  }, [
    activeIndex,
    activeCard.id,
    activeWorstMatchBreakdown,
    detailTableMotion,
  ]);

  useEffect(() => {
    if (activeCard.id !== "personal-captaincy") {
      return;
    }
    console.info("[wrapped-viewer] Captaincy breakdown configuration", {
      activeIndex,
      detailTableMotion,
      hasBreakdown: Boolean(activeCaptaincyBreakdown),
      playersCount: activeCaptaincyBreakdown?.players.length ?? 0,
      totalBonus: activeCaptaincyBreakdown?.totalBonus ?? null,
    });
  }, [
    activeCard.id,
    activeIndex,
    activeCaptaincyBreakdown,
    detailTableMotion,
  ]);

  useEffect(() => {
    if (activeCard.id !== "personal-top-performers") {
      return;
    }
    console.info("[wrapped-viewer] Top performers breakdown configuration", {
      activeIndex,
      detailTableMotion,
      hasBreakdown: Boolean(activeTopPerformersBreakdown),
      topFiveCount: activeTopPerformersBreakdown?.topFive.length ?? 0,
      bestPerformer: activeTopPerformersBreakdown?.bestPerformer.playerName ?? null,
    });
  }, [
    activeCard.id,
    activeIndex,
    activeTopPerformersBreakdown,
    detailTableMotion,
  ]);

  useEffect(() => {
    if (!isGlobalCard) {
      return;
    }
    console.info("[wrapped-viewer] Global slide lower section animation", {
      activeIndex,
      cardId: activeCard.id,
      globalLowerSectionDelayMs,
      globalLowerSectionInMs,
      hasGlobalStat: Boolean(activeGlobalStat),
      hasStatValue: Boolean(activeCard.statValue),
    });
  }, [
    isGlobalCard,
    activeIndex,
    activeCard.id,
    activeCard.statValue,
    activeGlobalStat,
    globalLowerSectionDelayMs,
    globalLowerSectionInMs,
  ]);

  useEffect(() => {
    if (activeGlobalStat?.id !== "volatility-king") {
      return;
    }
    console.info("[wrapped-viewer] Volatility details rendered", {
      activeIndex,
      cardId: activeCard.id,
      winnerMatchNumber: activeVolatilityDetails?.winner.matchNumber ?? null,
      winnerSwing: activeVolatilityDetails?.winner.rankSwing ?? null,
      yourMatchNumber: activeVolatilityDetails?.you.matchNumber ?? null,
      yourSwing: activeVolatilityDetails?.you.rankSwing ?? null,
    });
  }, [activeCard.id, activeGlobalStat?.id, activeIndex, activeVolatilityDetails]);

  useEffect(() => {
    if (activeGlobalStat?.id !== "overall-best-player") {
      return;
    }
    console.info("[wrapped-viewer] League best players card rendered", {
      activeIndex,
      cardId: activeCard.id,
      hasBreakdown: Boolean(activeLeagueBestPlayersBreakdown),
      bestPlayerId: activeLeagueBestPlayersBreakdown?.bestPlayer.playerId ?? null,
      topPlayersCount: activeLeagueBestPlayersBreakdown?.topPlayers.length ?? 0,
    });
  }, [activeCard.id, activeGlobalStat?.id, activeIndex, activeLeagueBestPlayersBreakdown]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
    };
  }, []);

  useEffect(() => {
    if (activeIndex !== 0) {
      return;
    }

    const sceneEl = firstSlideSceneRef.current;
    const viewportEl = firstSlideViewportRef.current;
    const tableEl = firstSlideTableRef.current;
    const headerEl = firstSlideHeaderRef.current;
    const highlightedRowEl = highlightedRowRef.current;
    if (!sceneEl || !viewportEl || !tableEl || !headerEl || !highlightedRowEl) {
      return;
    }

    const applyMeasuredLayout = () => {
      const viewportRect = viewportEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const headerRect = headerEl.getBoundingClientRect();
      const highlightedRowRect = highlightedRowEl.getBoundingClientRect();
      if (
        tableRect.height <= 0 ||
        headerRect.height <= 0 ||
        highlightedRowRect.height <= 0
      ) {
        return;
      }

      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));
      const highlightedRowTopInTable = highlightedRowRect.top - tableRect.top;
      const rowHeight = highlightedRowRect.height;
      const topInset = 6;
      const bottomInset = 10;
      let focusHeight = rowHeight + topInset + bottomInset;
      const desiredOffset = highlightedRowTopInTable - topInset;
      let maxOffset = Math.max(tableRect.height - focusHeight, 0);
      let focusOffset = clamp(desiredOffset, 0, maxOffset);
      const rowBottomInTable = highlightedRowTopInTable + rowHeight;
      const rowBottomVisible = rowBottomInTable - focusOffset;
      if (rowBottomVisible > focusHeight - bottomInset) {
        focusHeight = Math.min(
          tableRect.height,
          rowBottomVisible + bottomInset,
        );
        maxOffset = Math.max(tableRect.height - focusHeight, 0);
        focusOffset = clamp(desiredOffset, 0, maxOffset);
      }
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const safeBottomBuffer = 12;
      const availableHeight =
        viewportHeight - viewportRect.top - safeBottomBuffer;
      const tableScale = Math.min(1, availableHeight / tableRect.height);

      setFirstSlideMetrics({
        focusOffset: Number(focusOffset.toFixed(2)),
        focusHeight: Number(focusHeight.toFixed(2)),
        tableFullHeight: Number(tableRect.height.toFixed(2)),
        tableScale: Number(tableScale.toFixed(4)),
      });

      console.info("[wrapped-viewer] First slide table focus metrics", {
        focusOffset: Number(focusOffset.toFixed(2)),
        focusHeight: Number(focusHeight.toFixed(2)),
        rowHeight: Number(rowHeight.toFixed(2)),
        rowBottomVisible: Number(rowBottomVisible.toFixed(2)),
        headerHeight: Number(headerRect.height.toFixed(2)),
        fullHeight: Number(tableRect.height.toFixed(2)),
        tableScale: Number(tableScale.toFixed(4)),
        availableHeight: Number(availableHeight.toFixed(2)),
      });
    };

    setFirstSlidePhase("focus");
    setFirstSlideReady(false);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applyMeasuredLayout();
      });
    });
    const revealTimer = window.setTimeout(() => {
      setFirstSlideReady(true);
    }, firstSlideIntroGapMs);
    const expandTimer = window.setTimeout(() => {
      setFirstSlidePhase("expand");
    }, firstSlideIntroGapMs + firstSlideFocusHoldMs);

    return () => {
      setFirstSlidePhase("focus");
      setFirstSlideReady(false);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
      window.clearTimeout(expandTimer);
    };
  }, [
    activeIndex,
    payload.teamId,
    payload.pointsTable.length,
    highlightedRowIndex,
    firstSlideFocusHoldMs,
    firstSlideIntroGapMs,
  ]);

  const progress = useMemo(
    () => ((activeIndex + 1) / Math.max(totalCards, 1)) * 100,
    [activeIndex, totalCards],
  );

  function goNext() {
    setActiveIndex((current) => {
      const nextIndex = Math.min(current + 1, totalCards - 1);
      console.info("[wrapped-viewer] Navigating to next slide", {
        currentIndex: current,
        nextIndex,
        totalCards,
      });
      return nextIndex;
    });
  }

  function goPrev() {
    setActiveIndex((current) => {
      const nextIndex = Math.max(current - 1, 0);
      console.info("[wrapped-viewer] Navigating to previous slide", {
        currentIndex: current,
        nextIndex,
        totalCards,
      });
      return nextIndex;
    });
  }

  function onCardTap(clientX: number, bounds: DOMRect) {
    const relative = (clientX - bounds.left) / bounds.width;
    if (relative < 0.35) {
      goPrev();
      return;
    }
    if (relative > 0.65) {
      goNext();
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      return;
    }
    const now = Date.now();
    if (now - lastTouchInteractionAtMs.current < 700) {
      console.info("[wrapped-viewer] Ignoring pointer down near touch interaction", {
        pointerType: event.pointerType,
        elapsedSinceTouchMs: now - lastTouchInteractionAtMs.current,
      });
      return;
    }
    dragStartX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      return;
    }
    const now = Date.now();
    if (now - lastTouchInteractionAtMs.current < 700) {
      console.info("[wrapped-viewer] Ignoring pointer up near touch interaction", {
        pointerType: event.pointerType,
        elapsedSinceTouchMs: now - lastTouchInteractionAtMs.current,
      });
      return;
    }
    const startX = dragStartX.current;
    dragStartX.current = null;
    if (startX === null) {
      return;
    }
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 40) {
      if (delta < 0) {
        goNext();
      } else {
        goPrev();
      }
      return;
    }
    onCardTap(event.clientX, event.currentTarget.getBoundingClientRect());
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    lastTouchInteractionAtMs.current = Date.now();
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    lastTouchInteractionAtMs.current = Date.now();
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (startX === null || startY === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const isHorizontalSwipe =
      Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isHorizontalSwipe) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
      return;
    }

    const tapDistance = Math.hypot(deltaX, deltaY);
    if (tapDistance < 12) {
      onCardTap(touch.clientX, event.currentTarget.getBoundingClientRect());
    }
  }

  function cardGradient(cardKind: (typeof activeCard)["kind"]) {
    if (cardKind === "global") {
      return "from-fuchsia-500/35 via-indigo-500/25 to-cyan-400/25";
    }
    if (cardKind === "transition") {
      return "from-violet-400/30 via-blue-400/20 to-cyan-400/25";
    }
    if (cardKind === "outro") {
      return "from-amber-300/30 via-orange-400/20 to-rose-400/25";
    }
    return "from-indigo-500/35 via-violet-500/22 to-sky-400/25";
  }

  function formatGlobalValue(stat: WrappedGlobalStat, value: number) {
    if (stat.unit === "percent") {
      return `${value.toFixed(2)}%`;
    }
    if (stat.unit === "delta") {
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
    }
    if (stat.unit === "rank") {
      return value.toFixed(0);
    }
    return value.toFixed(1);
  }

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-[#050a1a] text-white"
      style={{ touchAction: "pan-y" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          goNext();
        }
        if (event.key === "ArrowLeft") {
          goPrev();
        }
      }}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${cardGradient(activeCard.kind)}`}
          style={{
            animation: `wrapped-drift ${wrappedDriftSec}s ease-in-out infinite alternate`,
          }}
        />
        <div
          className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-violet-500/40 blur-3xl"
          style={{
            animation: `wrapped-float ${wrappedFloatLeftSec}s ease-in-out infinite`,
          }}
        />
        <div
          className="absolute -right-24 top-28 h-[22rem] w-[22rem] rounded-full bg-cyan-500/35 blur-3xl"
          style={{
            animation: `wrapped-float ${wrappedFloatRightSec}s ease-in-out infinite reverse`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_78%_72%,rgba(56,189,248,0.24),transparent_36%)] opacity-75" />
      </div>

      <div className="relative flex min-h-[100svh] flex-col px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-100/80">
              {payload.teamName} Wrapped
            </p>
            <p className="mt-1 text-xs text-indigo-100/70">
              Slide {activeIndex + 1} of {totalCards}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white/85">
              {Math.round(progress)}% complete
            </p>
            <p className="text-[11px] text-white/55">Tap / swipe / arrows</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {payload.cards.map((card, index) => (
            <div
              key={card.id}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index < activeIndex
                  ? "bg-white/85"
                  : index === activeIndex
                    ? "bg-cyan-300"
                    : "bg-white/20"
              }`}
              style={{
                transitionDuration: `${Math.round(300 * animationTimeScale)}ms`,
              }}
            />
          ))}
        </div>

        <article
          key={`${activeCard.id}-${activeIndex}`}
          className={`relative flex flex-1 flex-col py-6 ${isFirstSlide || shouldTopAlignCard ? "justify-start pt-2" : "justify-center"}`}
          style={{
            animation: `wrapped-card-in ${wrappedCardInMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          {isFirstSlide ? (
            <div
              ref={firstSlideSceneRef}
              style={
                {
                  ["--wrapped-focus-offset" as string]: `${firstSlideMetrics.focusOffset}px`,
                  ["--wrapped-focus-height" as string]: `${firstSlideMetrics.focusHeight}px`,
                  ["--wrapped-table-full-height" as string]: `${firstSlideMetrics.tableFullHeight}px`,
                  ["--wrapped-table-scale" as string]: `${firstSlideMetrics.tableScale}`,
                } as React.CSSProperties
              }
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                {activeCard.kicker}
              </p>
              <h2 className="mt-3 max-w-3xl text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[3rem] md:text-[3.5rem]">
                {activeCard.title}
              </h2>
              {activeCard.body ? (
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                  {activeCard.body}
                </p>
              ) : null}

              <div className="relative mt-6 max-w-2xl">
                <div
                  ref={firstSlideViewportRef}
                  className="wrapped-table-viewport"
                  style={{
                    height:
                      firstSlidePhase === "expand"
                        ? firstSlideMetrics.tableFullHeight *
                            firstSlideMetrics.tableScale +
                          8
                        : firstSlideMetrics.focusHeight,
                    opacity: firstSlideReady ? 1 : 0,
                    transition:
                      firstSlidePhase === "expand"
                        ? `opacity ${firstSlideIntroFadeMs}ms ease, height ${firstSlideTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                        : `opacity ${firstSlideIntroFadeMs}ms ease`,
                  }}
                >
                  <div
                    ref={firstSlideTableRef}
                    className={`wrapped-table-motion wrapped-table-scale ${
                      firstSlidePhase === "expand"
                        ? "rounded-2xl border border-white/20 bg-black/15 px-3 py-3 backdrop-blur"
                        : "rounded-2xl border border-transparent bg-transparent px-3 py-3"
                    }`}
                    style={{
                      transform:
                        firstSlidePhase === "expand"
                          ? `translateY(0px) scale(${firstSlideMetrics.tableScale})`
                          : `translateY(${-1 * firstSlideMetrics.focusOffset}px) scale(${firstSlideMetrics.tableScale})`,
                      transition:
                        firstSlidePhase === "expand"
                          ? `transform ${firstSlideTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                          : "none",
                    }}
                  >
                    <div
                      ref={firstSlideHeaderRef}
                      className={`mb-2 grid grid-cols-[40px_1fr_96px] px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-opacity ${
                        firstSlidePhase === "expand"
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                      style={{ transitionDuration: `${rowHeaderFadeMs}ms` }}
                    >
                      <span>Rank</span>
                      <span>Team</span>
                      <span className="text-right">Points</span>
                    </div>
                    <div className="space-y-1">
                      {payload.pointsTable.map((row) => {
                        const isYou = row.teamId === payload.teamId;
                        return (
                          <div
                            ref={isYou ? highlightedRowRef : undefined}
                            key={row.teamId}
                            className={`wrapped-table-row grid grid-cols-[40px_1fr_96px] items-center rounded-xl px-2 py-2 text-sm ${
                              isYou
                                ? firstSlidePhase === "expand"
                                  ? "wrapped-table-row-highlight bg-cyan-300/20 text-white ring-1 ring-cyan-200/35"
                                  : "wrapped-table-row-highlight bg-cyan-300/26 text-white ring-1 ring-cyan-200/45"
                                : "bg-white/6 text-white/80"
                            }`}
                            style={
                              isYou
                                ? undefined
                                : {
                                    opacity:
                                      firstSlidePhase === "expand" ? 0.62 : 0,
                                  }
                            }
                          >
                            <span className="font-semibold">#{row.rank}</span>
                            <span>{row.teamName}</span>
                            <span className="text-right font-semibold">
                              {row.points.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                {activeCard.kicker}
              </p>
              <h2 className="mt-3 max-w-3xl text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[3rem] md:text-[3.5rem]">
                {activeCard.title}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                {activeCard.body}
              </p>
              {isGlobalCard && activeGlobalStat?.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                  {activeGlobalStat.description}
                </p>
              ) : null}

              {activeBestMatchBreakdown ? (
                <WrappedBestMatchBreakdownTable
                  breakdown={activeBestMatchBreakdown}
                  motion={detailTableMotion}
                />
              ) : null}

              {activeWorstMatchBreakdown ? (
                <WrappedBestMatchBreakdownTable
                  breakdown={activeWorstMatchBreakdown}
                  motion={detailTableMotion}
                />
              ) : null}

              {activeCaptaincyBreakdown ? (
                <WrappedCaptaincyBreakdownTable
                  breakdown={activeCaptaincyBreakdown}
                  motion={detailTableMotion}
                />
              ) : null}

              {activeTopPerformersBreakdown ? (
                <WrappedTopPerformersTable
                  breakdown={activeTopPerformersBreakdown}
                  motion={detailTableMotion}
                />
              ) : null}

              {isGlobalCard ? (
                <>
                  <div
                    className="wrapped-global-lower-section mt-6 max-h-[56svh] max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/20 bg-black/18 px-4 py-4 backdrop-blur sm:max-h-[62svh] sm:px-5 sm:py-5"
                    style={{
                      animationName: "wrapped-global-lower-in",
                      animationDuration: `${globalLowerSectionInMs}ms`,
                      animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                      animationFillMode: "forwards",
                      animationDelay: `${globalLowerSectionDelayMs}ms`,
                      touchAction: "pan-y",
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchEnd={(event) => event.stopPropagation()}
                  >
                    {activeCard.statLabel && activeCard.statValue ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                          {activeCard.statLabel}
                        </p>
                        <p className="mt-2 bg-gradient-to-r from-cyan-100 via-white to-violet-200 bg-clip-text text-[2.9rem] font-semibold leading-none tracking-[-0.05em] text-transparent sm:text-[3.6rem]">
                          {activeCard.statValue}
                        </p>
                      </div>
                    ) : null}

                    {activeGlobalStat ? (
                      <div className="mt-5 grid max-w-2xl grid-cols-3 gap-3 text-sm text-white/88">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                            Winner
                          </p>
                          <p className="mt-1 font-semibold">
                            {activeGlobalStat.comparison.winnerTeamName}
                          </p>
                          <p className="mt-1 text-cyan-200">
                            {formatGlobalValue(
                              activeGlobalStat,
                              activeGlobalStat.comparison.winnerValue,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                            You
                          </p>
                          <p className="mt-1 font-semibold">
                            #{activeGlobalStat.comparison.yourRank}
                          </p>
                          <p className="mt-1 text-cyan-100">
                            {formatGlobalValue(
                              activeGlobalStat,
                              activeGlobalStat.comparison.yourValue,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                            Gap
                          </p>
                          <p className="mt-1 font-semibold">to #1</p>
                          <p className="mt-1 text-amber-200">
                            {formatGlobalValue(
                              activeGlobalStat,
                              activeGlobalStat.comparison.gapToWinner,
                            )}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {activeLeagueBestPlayersBreakdown ? (
                      <WrappedLeagueBestPlayersCard
                        breakdown={activeLeagueBestPlayersBreakdown}
                        motion={{
                          introDelayMs: Math.max(Math.round(detailTableMotion.introDelayMs * 0.25), 120),
                          tableInMs: detailTableMotion.tableInMs,
                          rowInMs: detailTableMotion.rowInMs,
                          rowStaggerMs: detailTableMotion.rowStaggerMs,
                        }}
                      />
                    ) : null}
                    {activeVolatilityDetails ? (
                      <div className="mt-4 grid max-w-2xl grid-cols-1 gap-2 text-[11px] text-white/88 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                          <p className="uppercase tracking-[0.12em] text-white/55">Winner swing</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            Match #{activeVolatilityDetails.winner.matchNumber} ·{" "}
                            {activeVolatilityDetails.winner.matchupLabel}
                          </p>
                          <p className="mt-1 text-white/75">
                            Points:{" "}
                            <span className="font-semibold text-cyan-100">
                              {activeVolatilityDetails.winner.points.toFixed(1)}
                            </span>
                          </p>
                          <p className="mt-0.5 text-white/75">
                            Rank:{" "}
                            <span className="font-semibold text-cyan-100">
                              #{activeVolatilityDetails.winner.oldRank} → #
                              {activeVolatilityDetails.winner.newRank}
                            </span>{" "}
                            (Δ{activeVolatilityDetails.winner.rankSwing})
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                          <p className="uppercase tracking-[0.12em] text-white/55">Your swing</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            Match #{activeVolatilityDetails.you.matchNumber} ·{" "}
                            {activeVolatilityDetails.you.matchupLabel}
                          </p>
                          <p className="mt-1 text-white/75">
                            Points:{" "}
                            <span className="font-semibold text-cyan-100">
                              {activeVolatilityDetails.you.points.toFixed(1)}
                            </span>
                          </p>
                          <p className="mt-0.5 text-white/75">
                            Rank:{" "}
                            <span className="font-semibold text-cyan-100">
                              #{activeVolatilityDetails.you.oldRank} → #
                              {activeVolatilityDetails.you.newRank}
                            </span>{" "}
                            (Δ{activeVolatilityDetails.you.rankSwing})
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {activeMetricTooltip ? (
                    <div
                      className="relative mt-3 w-fit wrapped-global-lower-section"
                      style={{
                        animationName: "wrapped-global-lower-in",
                        animationDuration: `${globalLowerSectionInMs}ms`,
                        animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                        animationFillMode: "forwards",
                        animationDelay: `${globalLowerSectionDelayMs}ms`,
                      }}
                    >
                      <button
                        type="button"
                        className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/15"
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerUp={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        onTouchEnd={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          const nextOpen = !isMetricTooltipOpen;
                          setTooltipOpenCardId(nextOpen ? activeCard.id : null);
                          console.info("[wrapped-viewer] Toggled metric tooltip", {
                            activeIndex,
                            metricId: activeGlobalStat?.id ?? null,
                            nextOpen,
                          });
                        }}
                      >
                        How is this calculated?
                      </button>
                      {isMetricTooltipOpen ? (
                        <div
                          className="absolute bottom-full left-0 z-20 mb-2 max-h-[42svh] w-[min(88vw,30rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/25 bg-[#0b1026]/95 p-3 text-xs leading-relaxed text-white/90 shadow-[0_16px_32px_rgba(0,0,0,0.35)] backdrop-blur"
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                          onTouchEnd={(event) => event.stopPropagation()}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                            {activeMetricTooltip.title}
                          </p>
                          <div className="mt-2 space-y-1">
                            {activeMetricTooltip.lines.map((line, index) => (
                              <p key={`${activeGlobalStat?.id ?? "metric"}-${index}`}>{line}</p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {activeCard.statLabel && activeCard.statValue ? (
                    <div className="mt-10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        {activeCard.statLabel}
                      </p>
                      <p className="mt-2 bg-gradient-to-r from-cyan-100 via-white to-violet-200 bg-clip-text text-[3.2rem] font-semibold leading-none tracking-[-0.05em] text-transparent sm:text-[4rem] md:text-[4.6rem]">
                        {activeCard.statValue}
                      </p>
                    </div>
                  ) : null}

                  {activeGlobalStat ? (
                    <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4 text-sm text-white/88">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                          Winner
                        </p>
                        <p className="mt-1 font-semibold">
                          {activeGlobalStat.comparison.winnerTeamName}
                        </p>
                        <p className="mt-1 text-cyan-200">
                          {formatGlobalValue(
                            activeGlobalStat,
                            activeGlobalStat.comparison.winnerValue,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                          You
                        </p>
                        <p className="mt-1 font-semibold">
                          #{activeGlobalStat.comparison.yourRank}
                        </p>
                        <p className="mt-1 text-cyan-100">
                          {formatGlobalValue(
                            activeGlobalStat,
                            activeGlobalStat.comparison.yourValue,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
                          Gap
                        </p>
                        <p className="mt-1 font-semibold">to #1</p>
                        <p className="mt-1 text-amber-200">
                          {formatGlobalValue(
                            activeGlobalStat,
                            activeGlobalStat.comparison.gapToWinner,
                          )}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {activeCard.meta ? (
                    <p className="mt-6 max-w-2xl text-sm text-white/70">
                      {activeCard.meta}
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
        </article>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-[35%] bg-gradient-to-r from-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[35%] bg-gradient-to-l from-black/20 to-transparent" />
      </div>

      <style jsx>{`
        @keyframes wrapped-drift {
          0% {
            transform: scale(1) translateY(0px);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.08) translateY(-10px);
            opacity: 0.95;
          }
        }

        @keyframes wrapped-float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-10px) translateX(8px);
          }
        }

        @keyframes wrapped-card-in {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes wrapped-global-lower-in {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrapped-table-viewport-expand {
          0%,
          36% {
            height: var(--wrapped-focus-height);
          }
          100% {
            height: calc(
              var(--wrapped-table-full-height) * var(--wrapped-table-scale)
            );
          }
        }

        @keyframes wrapped-table-pan {
          0%,
          36% {
            transform: translateY(calc(-1 * var(--wrapped-focus-offset)))
              scale(var(--wrapped-table-scale));
          }
          100% {
            transform: translateY(0px) scale(var(--wrapped-table-scale));
          }
        }

        @keyframes wrapped-row-highlight-in {
          0%,
          36% {
            box-shadow: 0 0 0 rgba(34, 211, 238, 0);
            background: rgba(34, 211, 238, 0.12);
          }
          100% {
            box-shadow:
              0 0 0 1px rgba(165, 243, 252, 0.35),
              0 12px 36px rgba(34, 211, 238, 0.22);
            background: rgba(34, 211, 238, 0.2);
          }
        }

        .wrapped-table-viewport {
          overflow: hidden;
          height: var(--wrapped-focus-height);
        }

        .wrapped-table-motion {
        }

        .wrapped-table-scale {
          transform-origin: top left;
          width: 100%;
        }

        .wrapped-table-row {
          opacity: 0.62;
          transition: opacity ${rowOpacityTransitionMs}ms ease;
        }

        .wrapped-table-row-highlight {
          opacity: 1;
        }

        .wrapped-global-lower-section {
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
