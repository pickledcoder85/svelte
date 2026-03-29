import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { acceptIngestionOutput, fetchIngestionQueue, rejectIngestionOutput } from '../lib/api';
import { demoIngestionOutputs } from '../mock-data';
import type { IngestionOutput } from '../types';
import {
  describeOutput,
  formatCreatedAt,
  formatStructuredJson,
  pendingOutputs
} from './ingestionReviewHelpers';

interface IngestionReviewPanelProps {
  accessToken: string | null;
}

type SyncTone = 'checking' | 'live' | 'demo';

export function IngestionReviewPanel({ accessToken }: IngestionReviewPanelProps) {
  const [outputs, setOutputs] = useState<IngestionOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<IngestionOutput | null>(null);
  const [tone, setTone] = useState<SyncTone>('checking');
  const [statusLabel, setStatusLabel] = useState('Loading pending outputs');
  const [statusDetail, setStatusDetail] = useState('Fetching the ingestion review queue.');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setQueueLoading(true);
      setQueueError(null);
      setTone('checking');
      setStatusLabel('Loading pending outputs');
      setStatusDetail('Fetching the ingestion review queue.');

      if (!accessToken) {
        if (cancelled) {
          return;
        }

        const pending = pendingOutputs(demoIngestionOutputs);
        setOutputs(pending);
        setSelectedOutputId(pending[0]?.id ?? null);
        setSelectedOutput(pending[0] ?? null);
        setTone('demo');
        setStatusLabel('Previewing seeded ingestion outputs');
        setStatusDetail('Connect the backend session to review and save live ingestion decisions.');
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

        const pending = pendingOutputs(demoIngestionOutputs);
        setOutputs(pending);
        setSelectedOutputId(pending[0]?.id ?? null);
        setSelectedOutput(pending[0] ?? null);
        setTone('demo');
        setStatusLabel('Previewing seeded ingestion outputs');
        setStatusDetail('The backend queue is unavailable right now, so preview data is shown instead.');
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

  async function reviewOutput(outputId: string, action: 'accept' | 'reject') {
    if (!accessToken || actioningId === outputId) {
      return;
    }

    setActioningId(outputId);
    setQueueError(null);
    setTone('checking');
    setStatusLabel(action === 'accept' ? 'Accepting output' : 'Rejecting output');
    setStatusDetail('Saving the review decision.');

    try {
      const reviewed =
        action === 'accept'
          ? await acceptIngestionOutput(outputId, accessToken)
          : await rejectIngestionOutput(outputId, accessToken);

      setOutputs((current) => current.filter((item) => item.id !== reviewed.id));
      setSelectedOutputId((current) => (current === reviewed.id ? null : current));
      setSelectedOutput((current) => (current?.id === reviewed.id ? null : current));
      setTone('live');
      setStatusLabel(action === 'accept' ? 'Output accepted' : 'Output rejected');
      setStatusDetail(describeOutput(reviewed));
    } catch (error) {
      setTone('checking');
      setStatusLabel('Review action failed');
      setStatusDetail('The selected output could not be updated.');
      setQueueError(error instanceof Error ? error.message : 'Unable to update ingestion review.');
    } finally {
      setActioningId(null);
    }
  }

  const displayOutput = selectedOutput;
  const pendingCount = outputs.length;

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Ingestion</Text>
      <Text style={styles.title}>Pending review queue</Text>
      <Text style={styles.detail}>
        Review queued outputs from a mobile-friendly list and open the selected item placeholder below.
      </Text>

      <View style={[styles.statusBanner, { borderColor: toneColor(tone) }]}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.statusDetail}>{statusDetail}</Text>
        {queueError ? <Text style={styles.errorText}>{queueError}</Text> : null}
      </View>

      <View style={styles.metricRow}>
        <MetricTile label="Pending" value={`${outputs.length}`} />
        <MetricTile label="Session" value={accessToken ? 'Live' : 'Preview'} />
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
        {displayOutput ? (
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
              <Text style={styles.detailBlockLabel}>Selected item</Text>
              <Text style={styles.detailText}>
                This placeholder panel will expand later into a detail review view. For now, it keeps the selected
                queue item visible and ready for the next backend-enabled step.
              </Text>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Structured JSON</Text>
              <Text style={styles.codeBlock}>{formatStructuredJson(displayOutput.structured_json)}</Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => void reviewOutput(displayOutput.id, 'accept')}
                disabled={actioningId === displayOutput.id}
              >
                <Text style={styles.actionButtonLabel}>
                  {actioningId === displayOutput.id ? 'Saving...' : 'Accept'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => void reviewOutput(displayOutput.id, 'reject')}
                disabled={actioningId === displayOutput.id}
              >
                <Text style={[styles.actionButtonLabel, styles.rejectButtonLabel]}>
                  {actioningId === displayOutput.id ? 'Saving...' : 'Reject'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Select a review item</Text>
            <Text style={styles.detailText}>The selected item placeholder will appear here.</Text>
          </View>
        )}
      </View>
    </View>
  );
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
  detailNote: {
    color: '#7a4e16',
    fontSize: 12,
    lineHeight: 18
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1
  },
  acceptButton: {
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  rejectButton: {
    backgroundColor: '#fff4f0',
    borderColor: '#f2c8be'
  },
  actionButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  rejectButtonLabel: {
    color: '#8a3328'
  }
});
