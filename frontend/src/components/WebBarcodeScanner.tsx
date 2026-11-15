/**
 * Full-screen live viewfinder for the web app. Hold a barcode inside the band and it is read
 * automatically. In smart mode it also captures one frame by itself once the package or label
 * is held steady and sharp (a ring fills as it steadies); "Take a full photo" is the fallback.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { hintText, type StabilityState } from '../lib/frame-stability';
import { startBarcodeScanner, type BarcodeScannerHandle } from '../lib/web-barcode-scanner';

type Props = {
  visible: boolean;
  onCode(code: string): void;
  onClose(): void;
  /** Called from the tap itself, so the photo camera may open (iOS requires a user gesture). */
  onTakePhoto(): void;
  /** Smart mode: also auto-capture a package front or nutrition label. */
  onCapture?(frame: Blob): void;
  /** Smart mode for a nutrition label only: barcodes are ignored. */
  labelOnly?: boolean;
};

export function WebBarcodeScanner({ visible, onCode, onClose, onTakePhoto, onCapture, labelOnly }: Props) {
  const smart = Boolean(onCapture);
  const [stability, setStability] = useState<StabilityState | null>(null);
  // A callback ref: the Modal mounts its children in a portal, so wait for the element itself.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const handleRef = useRef<BarcodeScannerHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!visible || !video) {
      return;
    }
    let cancelled = false;
    setError(null);
    setStarting(true);
    setStability(null);
    void startBarcodeScanner(video, {
      decodeBarcodes: !labelOnly,
      autoCapture: onCapture
        ? {
            onProgress: (state) => {
              if (!cancelled) {
                setStability(state);
              }
            },
            onCapture: (frame) => {
              if (!cancelled) {
                onCapture(frame);
              }
            }
          }
        : undefined,
      onCode: (code) => {
        if (!cancelled) {
          onCode(code);
        }
      },
      onError: (message) => {
        if (!cancelled) {
          setError(message);
          setStarting(false);
        }
      }
    }).then((handle) => {
      if (cancelled) {
        handle.stop();
        return;
      }
      handleRef.current = handle;
      setStarting(false);
    });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // onCode is read once per open; the parent closes the scanner after a code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, video]);

  function stopCamera() {
    handleRef.current?.stop();
    handleRef.current = null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <video ref={setVideo} style={videoStyle} playsInline muted autoPlay />
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={styles.title}>{labelOnly ? 'Scan the nutrition label' : smart ? 'Scan' : 'Scan a barcode'}</Text>
            <Text style={styles.detail}>
              {error ??
                (starting
                  ? 'Starting the camera…'
                  : smart
                    ? stability && stability.hint !== 'steady'
                      ? hintText(stability.hint)
                      : labelOnly
                        ? 'Hold the Nutrition Facts panel in the frame and keep still: it captures by itself.'
                        : 'Barcode, package front, or nutrition label. Hold it in the frame and keep still: it captures by itself.'
                    : 'Hold the barcode inside the box. It reads by itself.')}
            </Text>
          </View>
          <View style={styles.guideArea} pointerEvents="none">
            <View
              style={[
                smart ? styles.smartGuide : styles.guide,
                smart && stability && stability.progress > 0 ? { borderColor: `rgba(134,239,172,${0.4 + 0.6 * stability.progress})` } : null
              ]}
            />
            {smart ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round((stability?.progress ?? 0) * 100)}%` }]} />
              </View>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                // Free the live camera first so the photo camera can open.
                stopCamera();
                onTakePhoto();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>{smart ? 'Take a full photo' : 'Take photo instead'}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                stopCamera();
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const videoStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  backgroundColor: '#000'
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32
  },
  header: {
    gap: 6,
    backgroundColor: 'rgba(15,23,32,0.6)',
    borderRadius: 18,
    padding: 14
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800'
  },
  detail: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 21
  },
  guideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Matches guideCrop(): most of the width, a short band in the middle.
  guide: {
    width: '90%',
    aspectRatio: 2.2,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  // Smart mode: a label-sized frame (hold the phone about a hand's width away).
  smartGuide: {
    width: '86%',
    aspectRatio: 0.8,
    maxHeight: '78%',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  progressTrack: {
    width: '60%',
    height: 6,
    borderRadius: 999,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#86efac'
  },
  actions: {
    gap: 10
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff'
  },
  secondaryButton: {
    backgroundColor: 'rgba(15,23,32,0.6)',
    borderColor: 'rgba(255,255,255,0.5)'
  },
  primaryLabel: {
    color: '#17324d',
    fontSize: 16,
    fontWeight: '800'
  },
  secondaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  }
});
