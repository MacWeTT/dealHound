import type { PriceHistorySummary, StepChartGeometry } from '@/domain/types';
import { formatInr, VERDICT_META } from '@/lib/inr';

import './price-step-chart.css';

interface PriceStepChartProps {
  history: PriceHistorySummary;
  chart: StepChartGeometry;
}

export const PriceStepChart = (props: PriceStepChartProps) => {
  const { history, chart } = props;
  const {
    currentPaise,
    allTimeLowPaise,
    allTimeHighPaise,
    median90dPaise,
    preSaleHikeDetected,
    verdict,
    verdictReason,
  } = history;
  const { width, height, stepPath, areaPath, allTimeLowY, medianY, minLabelPaise, maxLabelPaise } = chart;

  const verdictInfo = VERDICT_META[verdict];
  const { label: verdictLabel, tone: verdictTone } = verdictInfo;
  const verdictClass = `price-step-chart__verdict price-step-chart__verdict--${verdictTone}`;

  return (
    <section className="price-step-chart">
      <div className="price-step-chart__header">
        <div>
          <h2 className="price-step-chart__title">90-Day Verified Price Span History</h2>
          <p className="price-step-chart__reason">{verdictReason}</p>
        </div>
        <span className={verdictClass}>{verdictLabel}</span>
      </div>

      {preSaleHikeDetected ? (
        <div className="price-step-chart__hike-alert">
          Pre-sale hike detected: price spiked &gt;8% above its 90-day median shortly before dropping back to normal.
        </div>
      ) : null}

      <div className="price-step-chart__stats">
        <div className="price-step-chart__stat">
          <span className="price-step-chart__stat-label">Current Lowest</span>
          <span className="price-step-chart__stat-value">{formatInr(currentPaise)}</span>
        </div>
        <div className="price-step-chart__stat">
          <span className="price-step-chart__stat-label">90d Median</span>
          <span className="price-step-chart__stat-value">{formatInr(median90dPaise)}</span>
        </div>
        <div className="price-step-chart__stat">
          <span className="price-step-chart__stat-label">All-Time Low</span>
          <span className="price-step-chart__stat-value">{formatInr(allTimeLowPaise)}</span>
        </div>
        <div className="price-step-chart__stat">
          <span className="price-step-chart__stat-label">90d Peak</span>
          <span className="price-step-chart__stat-value">{formatInr(allTimeHighPaise)}</span>
        </div>
      </div>

      <div className="price-step-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="price-step-chart__svg"
          role="img"
          aria-label="90-day step price history chart"
        >
          <path d={areaPath} fill="#ffedd5" fillOpacity="0.55" />
          <line
            x1="16"
            x2={width - 16}
            y1={medianY}
            y2={medianY}
            stroke="#78716c"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1="16"
            x2={width - 16}
            y1={allTimeLowY}
            y2={allTimeLowY}
            stroke="#15803d"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <path d={stepPath} fill="none" stroke="#c2410c" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="price-step-chart__legend">
        <span>
          Range: {formatInr(minLabelPaise)} – {formatInr(maxLabelPaise)}
        </span>
        <span>Solid orange: verified step price · Dashed grey: 90d median · Dashed green: ATL</span>
      </div>
    </section>
  );
};
