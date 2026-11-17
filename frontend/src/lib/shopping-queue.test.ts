import { beforeEach, describe, expect, it } from 'vitest';

import { dropList, flushTicks, pendingCount, queueTick, withPendingTicks } from './shopping-queue';

describe('shopping tick queue', () => {
  beforeEach(() => {
    dropList('a');
    dropList('b');
  });

  it('keeps the newest tick per item and overlays it on server data', () => {
    queueTick('i1', { listId: 'a', checked: true });
    queueTick('i1', { listId: 'a', checked: false });
    queueTick('i2', { listId: 'a', checked: true });
    expect(pendingCount('a')).toBe(2);
    expect(withPendingTicks([{ id: 'i1', checked: true }, { id: 'i2', checked: false }, { id: 'i3', checked: false }])).toEqual([
      { id: 'i1', checked: false },
      { id: 'i2', checked: true },
      { id: 'i3', checked: false }
    ]);
  });

  it('sends ticks, stops when offline, and drops gone items', async () => {
    queueTick('i1', { listId: 'a', checked: true });
    queueTick('i2', { listId: 'b', checked: true });
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    await flushTicks('token', offline as never);
    expect(pendingCount()).toBe(2);
    const sent: string[] = [];
    const save = async (_list: string, item: string) => {
      sent.push(item);
      if (item === 'i2') {
        throw new Error('That item is gone.');
      }
      return {} as never;
    };
    await flushTicks('token', save as never);
    expect(sent).toEqual(['i1', 'i2']);
    expect(pendingCount()).toBe(0);
  });
});
