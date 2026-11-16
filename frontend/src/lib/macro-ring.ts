/** A macro ring: the share of the day's target eaten, with a second lap past 100%. */

export interface MacroRingState {
  /** 0–1: the first lap (up to the target). */
  firstLap: number;
  /** 0–1: the second lap past the target (capped at one extra lap). */
  overLap: number;
  over: boolean;
  /** Under each ring: "72%" or "+24 g". */
  footer: string;
}

export function macroRing(consumed: number, target: number): MacroRingState {
  const eaten = Math.max(0, Math.round(consumed));
  if (target <= 0) {
    return { firstLap: 0, overLap: 0, over: false, footer: '—' };
  }
  const ratio = eaten / target;
  if (eaten > target) {
    return { firstLap: 1, overLap: Math.min(1, ratio - 1), over: true, footer: `+${eaten - Math.round(target)} g` };
  }
  return { firstLap: ratio, overLap: 0, over: false, footer: `${Math.round(ratio * 100)}%` };
}
