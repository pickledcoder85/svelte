import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  acceptIngestionOutput,
  fetchIngestionOutput,
  fetchIngestionQueue,
  rejectIngestionOutput
} from '../lib/api';
import { demoIngestionOutputs } from '../mock-data';
import type { IngestionOutput, IngestionReviewState } from '../types';

interface IngestionReviewPanelProps {
  accessToken: string | null;
}

type SyncTone = 'checking' | 'live' | 'demo';

export function IngestionReviewPanel({ accessToken }: IngestionReviewPanelProps) {
  const [outputs, setOutputs] = useState<IngestionOutput[]>(() => pendingOutputs(demoIngestionOutputs));
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(
    () => pendingOutputs(demoIngestionOutputs)[0]?.id ?? null
  );
  const [selectedOutput, setSelectedOutput] = useState<IngestionOutput | null>(
    () => pendingOutputs(demoIngestionOutputs)[0] ?? null
  );
  const [tone, setTone] = useState<SyncTone>('checking');
  const [statusLabel, setStatusLabel] = useState('Loading pending outputs');
  const [statusDetail, setStatusDetail] = useState('Fetching the ingestion review queue.');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionSavingId, setActionSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setQueueLoading(true);
      setQueueError(null);
      setTone('checking');
      setStatusLabel('Loading pending outputs');
      setStatusDetail('Fetching the ingestion review queue.');

      if (!accessToken) {
        const seeded = pendingOutputs(demoIngestionOutputs);
        if (cancelled) {
          return;
        }

        setOutputs(seeded);
        setSelectedOutputId(seeded[0]?.id ?? null);
        setSelectedOutput(seeded[0] ?? null);
        setTone('demo');
        setStatusLabel('Demo ingestion review');
        setStatusDetail('Reviewing seeded outputs while the backend session is unavailable.');
        setQueueLoading(false);
        return;
      }

      try {
        const queue = await fetchIngestionQueue(accessToken);
        if (cancelled) {
          return;
        }

        const pending = pendingOutputs(queue);
        setOutputs(pending);
        setSelectedOutputId((current) =>
          current && pending.some((output) => output.id === current) ? current : pending[0]?.id ?? null
        );
        setSelectedOutput((current) => {
          if (current && pending.some((output) => output.id === current.id)) {
            return current;
          }
          return pending[0] ?? null;
        });
        setTone('live');
        setStatusLabel('Live ingestion queue');
        setStatusDetail(
          pending.length === 0
            ? 'No pending outputs right now.'
            : `${pending.length} pending output${pending.length === 1 ? '' : 's'} ready for review.`
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const seeded = pendingOutputs(demoIngestionOutputs);
        setOutputs(seeded);
        setSelectedOutputId(seeded[0]?.id ?? null);
        setSelectedOutput(seeded[0] ?? null);
        setTone('demo');
        setStatusLabel('Demo ingestion review');
        setStatusDetail('The backend queue is unavailable, so the app is showing seeded review outputs.');
        setQueueError(error instanceof Error ? error.message : 'Ingestion queue unavailable.');
      } finally {
        if (!cancelled) {
          setQueueLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedOutput() {
      if (!accessToken || !selectedOutputId) {
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);
      setDetailError(null);

      try {
        const output = await fetchIngestionOutput(selectedOutputId, accessToken);
        if (cancelled) {
          return;
        }
        setSelectedOutput(output);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallback = outputs.find((output) => output.id === selectedOutputId) ?? null;
        setSelectedOutput(fallback);
        setDetailError(error instanceof Error ? error.message : 'Could not load output detail.');
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadSelectedOutput();

    return () => {
      cancelled = true;
    };
  }, [accessToken, outputs, selectedOutputId]);

  const pendingCount = outputs.length;
  const acceptedCount = useMemo(
    () => demoIngestionOutputs.filter((output) => output.review_state === 'accepted').length,
    []
  );
  const displayOutput = selectedOutput;

  async function reviewSelectedOutput(nextState: Extract<IngestionReviewState, 'accepted' | 'rejected'>) {
    if (!displayOutput || actionSavingId === displayOutput.id) {
      return;
    }

    const current = displayOutput;
    setActionSavingId(current.id);
    setQueueError(null);
    setDetailError(null);
    setTone('checking');
    setStatusLabel(nextState === 'accepted' ? 'Accepting output' : 'Rejecting output');
    setStatusDetail(`${describeOutput(current)} will be marked ${nextState}.`);

    try {
      const updated = accessToken
        ? nextState === 'accepted'
          ? await acceptIngestionOutput(current.id, accessToken)
          : await rejectIngestionOutput(current.id, accessToken)
        : createDemoReview(current, nextState);

      setOutputs((currentOutputs) => currentOutputs.filter((output) => output.id !== updated.id));
      setSelectedOutput(updated);
      setSelectedOutputId(updated.id);
      setTone(accessToken ? 'live' : 'demo');
      setStatusLabel(nextState === 'accepted' ? 'Output accepted' : 'Output rejected');
      setStatusDetail(
        `${describeOutput(updated)} moved out of the pending queue and is ready for the next review item.`
      );
    } catch (error) {
      setTone('demo');
      setStatusLabel('Review action failed');
      setStatusDetail(`Could not update ${describeOutput(current)}.`);
      setDetailError(error instanceof Error ? error.message : 'Could not update ingestion output.');
    } finally {
      setActionSavingId(null);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Ingestion</Text>
      <Text style={styles.title}>Pending review queue</Text>
      <Text style={styles.detail}>
        Review extracted nutrition label and recipe outputs, then accept or reject them from a mobile-friendly list.
      </Text>

      <View style={[styles.statusBanner, { borderColor: toneColor(tone) }]}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.statusDetail}>{statusDetail}</Text>
        {queueError ? <Text style={styles.errorText}>{queueError}</Text> : null}
      </View>

      <View style={styles.metricRow}>
        <MetricTile label="Pending" value={`${pendingCount}`} />
        <MetricTile label="Accepted seeded" value={`${acceptedCount}`} />
        <MetricTile label="Session" value={accessToken ? 'Live' : 'Demo'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Pending outputs</Text>
        {queueLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#17324d" />
            <Text style={styles.detailText}>Loading the review queue...</Text>
          </View>
        ) : pendingCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing pending</Text>
            <Text style={styles.detailText}>New label or recipe outputs will appear here as they wait for review.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {outputs.map((output) => {
              const active = output.id === selectedOutputId;
              return (
                <Pressable
                  key={output.id}
                  style={[styles.listRow, active && styles.listRowActive]}
                  onPress={() => {
                    setSelectedOutputId(output.id);
                    setSelectedOutput(output);
                  }}
                >
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{describeOutput(output)}</Text>
                    <Text style={styles.listCaption}>
                      {formatCreatedAt(output.created_at)} · {Math.round(output.confidence * 100)}% confidence
                    </Text>
                  </View>
                  <Text style={styles.listMetric}>pending</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Selected output</Text>
        {detailLoading && selectedOutput ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#17324d" />
            <Text style={styles.detailText}>Refreshing selected output...</Text>
          </View>
        ) : displayOutput ? (
          <View style={styles.detailStack}>
            <View style={styles.detailHeadingRow}>
              <View style={styles.detailHeadingCopy}>
                <Text style={styles.detailTitle}>{describeOutput(displayOutput)}</Text>
                <Text style={styles.detailSubtitle}>
                  {displayOutput.ingestion_job_id} · {formatCreatedAt(displayOutput.created_at)} ·{' '}
                  {Math.round(displayOutput.confidence * 100)}% confidence
                </Text>
              </View>
              <View style={styles.stateChip}>
                <Text style={styles.stateChipLabel}>{displayOutput.review_state}</Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Extracted text</Text>
              <Text style={styles.detailText}>
                {displayOutput.extracted_text ?? 'No extracted text was captured for this output.'}
              </Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Structured JSON</Text>
              <Text style={styles.codeBlock}>{formatStructuredJson(displayOutput.structured_json)}</Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  (displayOutput.review_state === 'accepted' || actionSavingId === displayOutput.id) &&
                    styles.primaryButtonDisabled
                ]}
                onPress={() => void reviewSelectedOutput('accepted')}
                disabled={displayOutput.review_state === 'accepted' || actionSavingId === displayOutput.id}
              >
                <Text style={styles.primaryButtonLabel}>
                  {actionSavingId === displayOutput.id ? 'Saving...' : 'Accept'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryButton,
                  (displayOutput.review_state === 'rejected' || actionSavingId === displayOutput.id) &&
                    styles.secondaryButtonDisabled
                ]}
                onPress={() => void reviewSelectedOutput('rejected')}
                disabled={displayOutput.review_state === 'rejected' || actionSavingId === displayOutput.id}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {actionSavingId === displayOutput.id ? 'Saving...' : 'Reject'}
                </Text>
              </Pressable>
            </View>

            {detailError ? <Text style={styles.errorText}>{detailError}</Text> : null}
            {displayOutput.review_state !== 'pending' ? (
              <Text style={styles.detailNote}>
                This output is no longer pending and will not appear in the review list again.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Select a review item</Text>
            <Text style={styles.detailText}>The full extracted text and structured JSON will appear here.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function pendingOutputs(outputs: IngestionOutput[]): IngestionOutput[] {
  return outputs.filter((output) => output.review_state === 'pending');
}

function createDemoReview(
  output: IngestionOutput,
  nextState: Extract<IngestionReviewState, 'accepted' | 'rejected'>
): IngestionOutput {
  const timestamp = new Date().toISOString();
  return {
    ...output,
    review_state: nextState,
    reviewed_at: timestamp,
    accepted_at: nextState === 'accepted' ? timestamp : null,
    rejected_at: nextState === 'rejected' ? timestamp : null
  };
}

function describeOutput(output: IngestionOutput): string {
  if (typeof output.structured_json === 'object' && output.structured_json !== null) {
    const payload = output.structured_json as Record<string, unknown>;
    const title = payload.product_name || payload.title;
    if (typeof title === 'string' && title.trim().length > 0) {
      return title;
    }
  }

  if (typeof output.extracted_text === 'string' && output.extracted_text.trim().length > 0) {
    return output.extracted_text.trim().split('\n')[0].slice(0, 48);
  }

  return output.id;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatStructuredJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'No structured JSON captured.';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toneColor(tone: SyncTone): string {
  if (tone === 'live') {
    return '#0f766e';
  }
  if (tone === 'demo') {
    return '#b45309';
  }
  return '#1d4ed8';
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fffdf8',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e6dccc'
  },
  eyebrow: {
    color: '#7a4e16',
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#132536',
    fontSize: 24,
    fontWeight: '800'
  },
  detail: {
    color: '#5c6d80',
    fontSize: 14,
    lineHeight: 20
  },
  statusBanner: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: '#fffaf0'
  },
  statusLabel: {
    color: '#132536',
    fontWeight: '800'
  },
  statusDetail: {
    color: '#5c6d80',
    fontSize: 13,
    lineHeight: 18
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    lineHeight: 18
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: 100,
    backgroundColor: '#f7f4ef',
    borderRadius: 16,
    padding: 12,
    gap: 4
  },
  metricLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: '#132536',
    fontSize: 18,
    fontWeight: '800'
  },
  card: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 14,
    gap: 10
  },
  cardLabel: {
    color: '#7a4e16',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  list: {
    gap: 8
  },
  listRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  listRowActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  listCopy: {
    flex: 1,
    gap: 4
  },
  listTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '800'
  },
  listCaption: {
    color: '#6b7b90',
    fontSize: 12
  },
  listMetric: {
    color: '#17324d',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18
  },
  emptyState: {
    paddingVertical: 12,
    gap: 6
  },
  emptyTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '800'
  },
  detailStack: {
    gap: 12
  },
  detailHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  detailHeadingCopy: {
    flex: 1,
    gap: 4
  },
  detailTitle: {
    color: '#132536',
    fontSize: 18,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 18
  },
  stateChip: {
    borderRadius: 999,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  stateChipLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  detailBlock: {
    gap: 6
  },
  detailBlockLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  detailText: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  codeBlock: {
    color: '#132536',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#17324d',
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonDisabled: {
    opacity: 0.65
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    alignItems: 'center'
  },
  secondaryButtonDisabled: {
    opacity: 0.65
  },
  secondaryButtonLabel: {
    color: '#17324d',
    fontSize: 13,
    fontWeight: '800'
  },
  detailNote: {
    color: '#7a4e16',
    fontSize: 12,
    lineHeight: 18
  }
});
