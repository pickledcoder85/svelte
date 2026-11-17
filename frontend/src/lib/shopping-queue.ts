/**
 * Ticks on a shopping list that couldn't be saved yet (no signal in the store). They're kept on
 * the phone (localStorage, so they survive closing the list or the app) and retried by the app
 * until they go through. The newest tick for an item wins.
 */
import { setShoppingItemChecked } from './api';

const KEY = 'relish.shopping.pending.v1';

export interface PendingTick {
  listId: string;
  checked: boolean;
}

function read(): Record<string, PendingTick> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as Record<string, PendingTick>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(queue: Record<string, PendingTick>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (Object.keys(queue).length) {
        localStorage.setItem(KEY, JSON.stringify(queue));
      } else {
        localStorage.removeItem(KEY);
      }
    }
  } catch {
    // storage blocked: the tick still tries to save while the app is open
  }
}

// In memory too, for when storage is unavailable.
let memory: Record<string, PendingTick> = read();
const listeners = new Set<() => void>();

function changed(next: Record<string, PendingTick>): void {
  memory = next;
  write(next);
  listeners.forEach((listener) => listener());
}

export function pendingTicks(): Record<string, PendingTick> {
  return memory;
}

export function pendingCount(listId?: string): number {
  return Object.values(memory).filter((tick) => !listId || tick.listId === listId).length;
}

export function queueTick(itemId: string, tick: PendingTick): void {
  changed({ ...memory, [itemId]: tick });
}

export function dropList(listId: string): void {
  changed(Object.fromEntries(Object.entries(memory).filter(([, tick]) => tick.listId !== listId)));
}

export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Apply waiting ticks over what the server says (so an unsaved tick never looks undone). */
export function withPendingTicks<T extends { id: string; checked: boolean }>(items: T[]): T[] {
  return items.map((item) => (memory[item.id] ? { ...item, checked: memory[item.id].checked } : item));
}

let flushing: Promise<void> | null = null;

/** Send waiting ticks, oldest first. A gone list or item (404) is dropped; other failures stop
 * the run until the next try. One run at a time. */
export function flushTicks(accessToken: string, save: typeof setShoppingItemChecked = setShoppingItemChecked): Promise<void> {
  if (flushing) {
    return flushing;
  }
  flushing = (async () => {
    for (const [itemId, tick] of Object.entries(memory)) {
      try {
        await save(tick.listId, itemId, tick.checked, accessToken);
      } catch (error) {
        const gone = error instanceof Error && /gone/i.test(error.message);
        if (!gone) {
          break;
        }
      }
      if (memory[itemId]?.checked === tick.checked && memory[itemId]?.listId === tick.listId) {
        const { [itemId]: _done, ...rest } = memory;
        changed(rest);
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
