import { describe, expect, it } from 'vitest';

import {
  TAILSCALE_OFF_MESSAGE,
  TAILSCALE_UNREACHABLE_MESSAGE,
  isTailnetHost,
  resolveOwnerAccess
} from './owner-access';

describe('owner access', () => {
  it('detects tailnet hosts', () => {
    expect(isTailnetHost('https://relish.tail1234.ts.net/api')).toBe(true);
    expect(isTailnetHost('http://localhost:8000/api', 'https://relish.tail1234.ts.net/')).toBe(true);
    expect(isTailnetHost('http://192.168.1.10:8000/api')).toBe(false);
    expect(isTailnetHost('not a url', null, undefined)).toBe(false);
  });

  it('opens the app when the server already knows the owner', () => {
    expect(
      resolveOwnerAccess({ healthReachable: true, healthAuthMode: 'tailscale', ownerSessionFound: true, tailnetHint: true })
    ).toEqual({ access: 'owner', message: null });
    expect(
      resolveOwnerAccess({ healthReachable: true, healthAuthMode: 'local', ownerSessionFound: true, tailnetHint: false })
    ).toEqual({ access: 'owner', message: null });
  });

  it('blocks with a Tailscale hint when tailscale mode has no identity', () => {
    expect(
      resolveOwnerAccess({ healthReachable: true, healthAuthMode: 'tailscale', ownerSessionFound: false, tailnetHint: true })
    ).toEqual({ access: 'blocked', message: TAILSCALE_OFF_MESSAGE });
  });

  it('shows the server reason when tailscale mode rejects this identity', () => {
    expect(
      resolveOwnerAccess({
        healthReachable: true,
        healthAuthMode: 'tailscale',
        ownerSessionFound: false,
        ownerError: 'Request failed with status 403: This Relish server belongs to someone else.',
        tailnetHint: true
      })
    ).toEqual({
      access: 'blocked',
      message: 'Request failed with status 403: This Relish server belongs to someone else.'
    });
  });

  it('blocks instead of offering email sign-in when a tailnet server is unreachable', () => {
    expect(
      resolveOwnerAccess({ healthReachable: false, ownerSessionFound: false, tailnetHint: true })
    ).toEqual({ access: 'blocked', message: TAILSCALE_UNREACHABLE_MESSAGE });
  });

  it('keeps the local sign-in screen for local development', () => {
    expect(
      resolveOwnerAccess({ healthReachable: true, healthAuthMode: 'local', ownerSessionFound: false, tailnetHint: false })
    ).toEqual({ access: 'signin', message: null });
    expect(
      resolveOwnerAccess({ healthReachable: false, ownerSessionFound: false, tailnetHint: false })
    ).toEqual({ access: 'signin', message: null });
  });
});
