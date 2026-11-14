/**
 * The mission questions on the Compare page: what the mission needs (three priorities) and
 * what it cannot accept (four optional limits). The answers live in the URL so a comparison
 * can be shared; the API turns them into weights and returns every weight it used.
 */
import type { MissionAnswers, Priority } from "@/shared/api/client";

export const PRIORITY_OPTIONS: Array<{ id: Priority; label: string }> = [
  { id: "none", label: "Not needed" },
  { id: "low", label: "Nice to have" },
  { id: "medium", label: "Important" },
  { id: "high", label: "Critical" },
];

export type NeedId = "power" | "comms" | "landing";

export const NEED_QUESTIONS: Array<{ id: NeedId; question: string; hint: string }> = [
  {
    id: "power",
    question: "How much does the mission depend on sunlight?",
    hint: "Solar only: critical. Solar with storage for the dark: important. Nuclear: not needed.",
  },
  {
    id: "comms",
    question: "How much does it depend on a direct line of sight to Earth?",
    hint: "Direct-to-Earth only: critical. A relay orbiter covers the gaps: not needed.",
  },
  {
    id: "landing",
    question: "How much does it need gentle, smooth ground?",
    hint: "Rover or crew moving around: critical. Lander with hazard avoidance: nice to have.",
  },
];

export type LimitId = "maxSlopeDeg" | "maxDarknessD" | "maxEarthOutageD" | "minSunlitD";

export const LIMIT_QUESTIONS: Array<{
  id: LimitId;
  param: string;
  question: string;
  unit: string;
  placeholder: string;
}> = [
  {
    id: "maxSlopeDeg",
    param: "max_slope",
    question: "Steepest slope the lander can handle",
    unit: "°",
    placeholder: "e.g. 10",
  },
  {
    id: "maxDarknessD",
    param: "max_dark",
    question: "Longest darkness it can survive",
    unit: "days",
    placeholder: "e.g. 7",
  },
  {
    id: "maxEarthOutageD",
    param: "max_outage",
    question: "Longest gap without Earth in view",
    unit: "days",
    placeholder: "e.g. 14",
  },
  {
    id: "minSunlitD",
    param: "min_sun",
    question: "Unbroken sunlight needed for the surface stay",
    unit: "days",
    placeholder: "e.g. 14",
  },
];

export const DEFAULT_MISSION: MissionAnswers = {
  power: "medium",
  comms: "medium",
  landing: "medium",
  maxSlopeDeg: null,
  maxDarknessD: null,
  maxEarthOutageD: null,
  minSunlitD: null,
};

const isPriority = (value: string | null): value is Priority =>
  value === "none" || value === "low" || value === "medium" || value === "high";

/** A limit typed by a person: a positive finite number, else no limit. */
export function parseLimit(text: string | null): number | null {
  if (text === null || text.trim() === "") return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseMission(params: { get(name: string): string | null }): MissionAnswers {
  const priority = (name: NeedId) => {
    const raw = params.get(name);
    return isPriority(raw) ? raw : DEFAULT_MISSION[name];
  };
  const mission: MissionAnswers = {
    ...DEFAULT_MISSION,
    power: priority("power"),
    comms: priority("comms"),
    landing: priority("landing"),
  };
  for (const limit of LIMIT_QUESTIONS) mission[limit.id] = parseLimit(params.get(limit.param));
  if (mission.maxSlopeDeg !== null) mission.maxSlopeDeg = Math.min(mission.maxSlopeDeg, 90);
  return mission;
}

export const isDefaultMission = (mission: MissionAnswers) =>
  (Object.keys(DEFAULT_MISSION) as Array<keyof MissionAnswers>).every(
    (key) => mission[key] === DEFAULT_MISSION[key],
  );

/** URL changes that clear every mission answer. */
export const RESET_MISSION: Record<string, null> = Object.fromEntries(
  [...NEED_QUESTIONS.map((q) => q.id), ...LIMIT_QUESTIONS.map((q) => q.param)].map((name) => [
    name,
    null,
  ]),
);
