/**
 * A light haptic tap for the web app on iPhone.
 *
 * Safari has no vibration API, but since iOS 18 it plays the system "selection" haptic when a
 * `<input type="checkbox" switch>` toggles. Clicking a hidden label for such a switch triggers
 * it. Elsewhere (older iOS, Android, desktop) the switch is just a checkbox and nothing is felt.
 * iOS may only allow it during a touch, so it works best called from touch-driven changes.
 */

let label: HTMLLabelElement | null = null;
let lastTapAt = 0;
/** Fast flicks pass many rows; cap the rate so it feels like ticks, not a buzz. */
export const MIN_TAP_INTERVAL_MS = 35;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }
  if (label && label.isConnected) {
    return label;
  }
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = 'relish-haptic-switch';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  label = document.createElement('label');
  label.htmlFor = input.id;
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

/** Whether a tap should fire now, given the time of the last one. */
export function shouldTap(now: number, last: number): boolean {
  return now - last >= MIN_TAP_INTERVAL_MS;
}

/** Play one light tap (a no-op where unsupported). */
export function hapticTap(now: number = Date.now()): void {
  if (!shouldTap(now, lastTapAt)) {
    return;
  }
  const target = ensureSwitch();
  if (!target) {
    return;
  }
  lastTapAt = now;
  try {
    target.click();
  } catch {
    // Haptics are a nicety; never let them break a picker.
  }
}
