import type { Goal, Profile } from '../data/types';

/** Mifflin–St Jeor activity multipliers; labels live in i18n/common.ts (COMMON.activity). */
export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9];

export const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

/** ±5 % around the calorie target counts as "on target" for a day. */
export const KCAL_BAND = 0.05;

/**
 * One line of the "how we got these numbers" table. The UI words it per language from
 * `key` and the numbers in `v`.
 */
export type TargetStep =
  | { key: 'bmr'; v: { w: number; h: number; age: number; sexConst: number }; result: number }
  | { key: 'tdee'; v: { bmr: number; activity: number }; result: number }
  | { key: 'goal'; v: { tdee: number; factor: number }; result: number }
  | { key: 'kcalFloor'; v: { floor: number }; result: number }
  | { key: 'proteinWeight'; v: { w: number; bmi25: number }; result: number }
  | { key: 'protein'; v: { lb: number; rate: number }; result: number }
  | { key: 'proteinFloor'; v: { lose: boolean; kg: number }; result: number }
  | { key: 'proteinCeiling'; v: { kcal: number }; result: number };

export interface Targets {
  kcal: number;
  protein: number;
  kcalMin: number;
  kcalMax: number;
  custom: boolean;
  steps: TargetStep[];
}

const LB_PER_KG = 2.20462;
const roundTo = (x: number, step: number) => Math.round(x / step) * step;
const floorTo = (x: number, step: number) => Math.floor(x / step) * step;
const ceilTo = (x: number, step: number) => Math.ceil(x / step) * step;

/**
 * Calories: Mifflin–St Jeor × activity, then the goal adjustment.
 * Protein: g per lb of (goal-adjusted) body weight, capped at 35 % of calories and
 * never below a safety floor. Every step is returned so the UI can show the arithmetic.
 */
export function computeTargets(p: Profile): Targets {
  const steps: TargetStep[] = [];
  const sexConst = p.sex === 'male' ? 5 : -161;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexConst;
  steps.push({ key: 'bmr', v: { w: p.weightKg, h: p.heightCm, age: p.age, sexConst }, result: bmr });

  const tdee = bmr * p.activity;
  steps.push({ key: 'tdee', v: { bmr, activity: p.activity }, result: tdee });

  const goalFactor = p.goal === 'lose' ? 0.8 : p.goal === 'gain' ? 1.1 : 1;
  let kcalCalc = roundTo(tdee * goalFactor, 50);
  steps.push({ key: 'goal', v: { tdee, factor: goalFactor }, result: kcalCalc });
  const kcalFloor = p.sex === 'male' ? 1500 : 1200;
  if (kcalCalc < kcalFloor) {
    kcalCalc = kcalFloor;
    steps.push({ key: 'kcalFloor', v: { floor: kcalFloor }, result: kcalFloor });
  }

  const bmi25Kg = 25 * (p.heightCm / 100) ** 2;
  const proteinKg = p.goal === 'lose' ? Math.min(p.weightKg, bmi25Kg) : p.weightKg;
  if (p.goal === 'lose') steps.push({ key: 'proteinWeight', v: { w: p.weightKg, bmi25: bmi25Kg }, result: proteinKg });
  const rate = p.goal === 'lose' ? 1 : p.goal === 'gain' ? 0.9 : 0.8;
  let protein = roundTo(proteinKg * LB_PER_KG * rate, 5);
  steps.push({ key: 'protein', v: { lb: proteinKg * LB_PER_KG, rate }, result: protein });

  const floorG = p.goal === 'lose' ? 0.8 * proteinKg * LB_PER_KG : 1.2 * p.weightKg;
  if (protein < floorG) {
    protein = ceilTo(floorG, 5);
    steps.push({ key: 'proteinFloor', v: { lose: p.goal === 'lose', kg: p.goal === 'lose' ? proteinKg : p.weightKg }, result: protein });
  }
  // The ceiling has the last word: a plan above 35 % protein is hard to cook and eat.
  const ceiling = floorTo((0.35 * kcalCalc) / 4, 5);
  if (protein > ceiling) {
    steps.push({ key: 'proteinCeiling', v: { kcal: kcalCalc }, result: ceiling });
    protein = ceiling;
  }

  const custom = !!p.customTargets;
  const kcal = p.customTargets?.kcal ?? kcalCalc;
  if (custom) protein = p.customTargets!.protein;

  return {
    kcal,
    protein,
    kcalMin: Math.round(kcal * (1 - KCAL_BAND)),
    kcalMax: Math.round(kcal * (1 + KCAL_BAND)),
    custom,
    steps,
  };
}
