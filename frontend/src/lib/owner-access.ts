export type OwnerAccessDecision =
  | { access: 'owner'; message: null }
  | { access: 'signin'; message: null }
  | { access: 'blocked'; message: string };

export const TAILSCALE_OFF_MESSAGE =
  "Relish couldn't confirm it's you. Turn on Tailscale on this device, then try again.";
export const TAILSCALE_UNREACHABLE_MESSAGE =
  "Can't reach Relish. Turn on Tailscale on this device, then try again.";

/** True when any of the given URLs points at a Tailscale MagicDNS host (*.ts.net). */
export function isTailnetHost(...urls: Array<string | null | undefined>): boolean {
  return urls.some((url) => {
    if (!url) {
      return false;
    }
    try {
      return new URL(url).hostname.toLowerCase().endsWith('.ts.net');
    } catch {
      return false;
    }
  });
}

/**
 * Decides what the launch screen shows.
 *
 * - The server already knows the owner (Tailscale identity or dev auto-login): open the app.
 * - The server runs in Tailscale mode, or cannot be reached from a *.ts.net address: show the
 *   "Connect Tailscale" card, never the local email sign-in (which does not exist there).
 * - Otherwise (local development): show the local sign-in screen.
 */
export function resolveOwnerAccess(input: {
  healthReachable: boolean;
  healthAuthMode?: 'local' | 'tailscale' | null;
  ownerSessionFound: boolean;
  ownerError?: string | null;
  tailnetHint: boolean;
}): OwnerAccessDecision {
  if (input.ownerSessionFound) {
    return { access: 'owner', message: null };
  }
  if (!input.healthReachable) {
    return input.tailnetHint
      ? { access: 'blocked', message: TAILSCALE_UNREACHABLE_MESSAGE }
      : { access: 'signin', message: null };
  }
  const tailscaleMode = input.healthAuthMode === 'tailscale' || (!input.healthAuthMode && input.tailnetHint);
  if (tailscaleMode) {
    return { access: 'blocked', message: input.ownerError?.trim() || TAILSCALE_OFF_MESSAGE };
  }
  return { access: 'signin', message: null };
}
