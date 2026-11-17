/**
 * Shopping lists (avatar → 🛒 Shopping lists, or straight after Create a Meal Plan): every saved
 * list with what's left, and one list to tick off in the store. Tapping a row ticks it (a line
 * through, moved to the bottom of its group) and saves at once; with no signal the tick stays on
 * screen and is saved when the connection is back. Lists are only deleted by the user.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../i18n';
import { addShoppingItem, deleteShoppingList, fetchShoppingList, fetchShoppingLists } from '../lib/api';
import { dropList, flushTicks, onQueueChange, pendingCount as queuedCount, queueTick, withPendingTicks } from '../lib/shopping-queue';
import { itemsByGroup, progressLabel, remainingCount, shareText } from '../lib/shopping';
import { tc } from '../theme/palette';
import type { ShoppingList, ShoppingListSummary } from '../types';

export function ShoppingListsSheet({
  accessToken,
  initialListId,
  onClose
}: {
  accessToken: string;
  /** Open this list straight away (after Create a Meal Plan). */
  initialListId?: string | null;
  onClose(): void;
}) {
  const t = useT();
  const [lists, setLists] = useState<ShoppingListSummary[] | null>(null);
  const [open, setOpen] = useState<ShoppingList | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialListId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  // Ticks not saved yet (no signal): kept on the phone and retried by the app (lib/shopping-queue).
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => onQueueChange(() => setPendingCount(open ? queuedCount(open.id) : 0)), [open]);
  useEffect(() => setPendingCount(open ? queuedCount(open.id) : 0), [open]);

  const loadLists = useCallback(async () => {
    try {
      setLists(await fetchShoppingLists(accessToken));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('shopping.errors.load'));
    }
  }, [accessToken, t]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!openId) {
      setOpen(null);
      return;
    }
    let cancelled = false;
    setError(null);
    fetchShoppingList(openId, accessToken)
      .then((list) => {
        if (!cancelled) {
          // Keep any ticks still waiting to be saved.
          setOpen({ ...list, items: withPendingTicks(list.items) });
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('shopping.errors.open'));
        }
      });
    return () => {
      cancelled = true;
    };
    // t only labels a failure; a language switch needn't reload the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, accessToken]);

  async function toggle(itemId: string) {
    if (!open) {
      return;
    }
    const item = open.items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    const checked = !item.checked;
    const next = { ...open, items: open.items.map((entry) => (entry.id === itemId ? { ...entry, checked } : entry)) };
    setOpen(next);
    setAskDelete(next.items.length > 0 && remainingCount(next) === 0);
    queueTick(itemId, { listId: open.id, checked });
    await flushTicks(accessToken);
  }

  async function addItem() {
    const name = draft.trim();
    if (!open || !name || adding) {
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const updated = await addShoppingItem(open.id, name, accessToken);
      setOpen({ ...updated, items: withPendingTicks(updated.items) });
      setDraft('');
      setAskDelete(false);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t('shopping.errors.add'));
    } finally {
      setAdding(false);
    }
  }

  async function removeList(listId: string) {
    setError(null);
    try {
      await deleteShoppingList(listId, accessToken);
      dropList(listId);
      setConfirmDelete(null);
      setAskDelete(false);
      if (openId === listId) {
        setOpenId(null);
      }
      setNotice(t('shopping.deleted'));
      await loadLists();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('shopping.errors.delete'));
    }
  }

  function share() {
    if (!open) {
      return;
    }
    const text = shareText(open, t);
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ title: open.title, text }).catch(() => undefined);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => setNotice(t('shopping.copied')));
    }
  }

  function back() {
    setError(null);
    setOpenId(null);
    setAskDelete(false);
    setConfirmDelete(null);
    setNotice(null);
    void loadLists();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {openId ? (
              open ? (
                <>
                  <View style={styles.headerRow}>
                    <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t('shopping.allLists')}>
                      <Text style={styles.link}>{t('shopping.lists')}</Text>
                    </Pressable>
                    <Pressable onPress={share} accessibilityRole="button">
                      <Text style={styles.link}>{t('shopping.share')}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.title}>🛒 {open.title}</Text>
                  <Text style={styles.caption}>{progressLabel(remainingCount(open), open.items.length, t)}</Text>
                  {pendingCount > 0 ? <Text style={styles.caption}>{t('shopping.notSavedYet')}</Text> : null}
                  {askDelete ? (
                    <View style={styles.done}>
                      <Text style={styles.doneTitle}>{t('shopping.allDoneAsk')}</Text>
                      <View style={styles.doneRow}>
                        <Pressable style={styles.secondary} onPress={() => setAskDelete(false)} accessibilityRole="button">
                          <Text style={styles.secondaryLabel}>{t('common.keep')}</Text>
                        </Pressable>
                        <Pressable style={styles.danger} onPress={() => void removeList(open.id)} accessibilityRole="button">
                          <Text style={styles.dangerLabel}>{t('common.delete')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {itemsByGroup(open.items, t).map((group) => (
                    <View key={group.role} style={styles.group}>
                      <Text style={styles.groupTitle}>{group.label}</Text>
                      {group.items.map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.item}
                          onPress={() => void toggle(item.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.checked }}
                          accessibilityLabel={`${item.name}${item.amount ? `, ${item.amount}` : ''}`}
                        >
                          <Text style={[styles.box, item.checked && styles.boxChecked]}>{item.checked ? '☑' : '☐'}</Text>
                          <View style={styles.itemCopy}>
                            <Text style={[styles.itemName, item.checked && styles.itemDone]}>{item.name}</Text>
                            {item.amount ? <Text style={[styles.itemAmount, item.checked && styles.itemDone]}>{item.amount}</Text> : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.input}
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={t('shopping.addPlaceholder')}
                      placeholderTextColor={tc.fg_8a97a8}
                      maxLength={80}
                      returnKeyType="done"
                      onSubmitEditing={() => void addItem()}
                      accessibilityLabel={t('shopping.addA11y')}
                    />
                    <Pressable style={[styles.addButton, (!draft.trim() || adding) && styles.disabled]} onPress={() => void addItem()} disabled={!draft.trim() || adding} accessibilityRole="button">
                      <Text style={styles.addLabel}>{t('common.add')}</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.deleteList}
                    onPress={() => (confirmDelete === open.id ? void removeList(open.id) : setConfirmDelete(open.id))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dangerText}>{confirmDelete === open.id ? t('shopping.tapAgainToDelete') : t('shopping.deleteList')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t('shopping.allLists')}>
                    <Text style={styles.link}>{t('shopping.lists')}</Text>
                  </Pressable>
                  <Text style={styles.caption}>{error ?? t('shopping.opening')}</Text>
                </>
              )
            ) : (
              <>
                <Text style={styles.title}>{t('shopping.title')}</Text>
                {lists === null ? (
                  <Text style={styles.caption}>{error ?? t('common.loading')}</Text>
                ) : lists.length === 0 ? (
                  <Text style={styles.caption}>{t('shopping.empty')}</Text>
                ) : (
                  lists.map((list) => (
                    <View key={list.id} style={styles.listRow}>
                      <Pressable style={styles.listCopy} onPress={() => setOpenId(list.id)} accessibilityRole="button">
                        <Text style={styles.itemName}>{list.title}</Text>
                        <Text style={styles.itemAmount}>{progressLabel(list.remaining, list.total, t)}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.remove, confirmDelete === list.id && styles.removeConfirm]}
                        onPress={() => (confirmDelete === list.id ? void removeList(list.id) : setConfirmDelete(list.id))}
                        accessibilityRole="button"
                        accessibilityLabel={
                          confirmDelete === list.id ? t('common.confirmDeleteItem', { name: list.title }) : t('common.deleteItem', { name: list.title })
                        }
                      >
                        <Text style={[styles.removeLabel, confirmDelete === list.id && styles.removeConfirmLabel]}>
                          {confirmDelete === list.id ? t('common.deleteConfirm') : '✕'}
                        </Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {error && (open || lists) ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
              <Text style={styles.link}>{t('common.close')}</Text>
            </Pressable>
          </ScrollView>
          <div style={{ height: 'max(12px, env(safe-area-inset-bottom))' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tc.backdrop },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '92%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  caption: { color: tc.fg_5c6d80, fontSize: 14 },
  group: { gap: 2 },
  groupTitle: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tc.line_e2e8f0 },
  box: { fontSize: 22, color: tc.fg_5c6d80, width: 26, textAlign: 'center' },
  boxChecked: { color: tc.fg_0f766e },
  itemCopy: { flex: 1, gap: 2 },
  itemName: { color: tc.fg_132536, fontSize: 16, fontWeight: '600' },
  itemAmount: { color: tc.fg_5c6d80, fontSize: 13 },
  itemDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  addButton: { paddingHorizontal: 16, height: 44, borderRadius: 12, backgroundColor: tc.brand_primary, justifyContent: 'center' },
  addLabel: { color: tc.fg_ffffff, fontSize: 15, fontWeight: '800' },
  done: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: tc.bg_f3f6fb },
  doneTitle: { color: tc.fg_132536, fontSize: 16, fontWeight: '700' },
  doneRow: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tc.line_d7dee7 },
  secondaryLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' },
  danger: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: tc.fg_b42318 },
  dangerLabel: { color: tc.fg_ffffff, fontSize: 15, fontWeight: '800' },
  deleteList: { alignItems: 'center', paddingVertical: 10 },
  dangerText: { color: tc.fg_b42318, fontSize: 15, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tc.line_e2e8f0 },
  listCopy: { flex: 1, gap: 2 },
  remove: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  removeConfirm: { backgroundColor: tc.fg_b42318 },
  removeLabel: { color: tc.fg_5c6d80, fontSize: 15, fontWeight: '700' },
  removeConfirmLabel: { color: tc.fg_ffffff },
  link: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' },
  notice: { color: tc.fg_0f766e, fontSize: 14 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  close: { alignItems: 'center', paddingVertical: 10 },
  disabled: { opacity: 0.5 }
});
