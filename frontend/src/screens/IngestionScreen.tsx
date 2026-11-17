import type { Dispatch, ReactElement, SetStateAction } from 'react';

import { IngestionReviewPanel } from '../components/IngestionReviewPanel';
import { fetchTodaysFoodLog } from '../lib/api';
import type { FoodLogSummary } from '../types';

export interface IngestionScreenProps {
  foodSessionToken: string | null;
  scanAutoStart: boolean;
  setScanAutoStart: Dispatch<SetStateAction<boolean>>;
  setFoodLog: Dispatch<SetStateAction<FoodLogSummary>>;
}

export function IngestionScreen({
  foodSessionToken,
  scanAutoStart,
  setScanAutoStart,
  setFoodLog
}: IngestionScreenProps): ReactElement {
  return (
    <IngestionReviewPanel
      accessToken={foodSessionToken}
      autoStartScan={scanAutoStart}
      onAutoStartHandled={() => setScanAutoStart(false)}
      onFoodLogged={() => {
        const token = foodSessionToken;
        if (token) {
          void fetchTodaysFoodLog(token)
            .then(setFoodLog)
            .catch(() => undefined);
        }
      }}
    />
  );
}
