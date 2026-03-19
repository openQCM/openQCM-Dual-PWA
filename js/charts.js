/** Plotly.js chart setup and update — basic streaming configuration. */

import { COLORS } from './config.js';

/* ─── Shared layout defaults ─── */
const AXIS_STYLE = {
  color: COLORS.TEXT_DIM,
  gridcolor: 'rgba(127,132,156,0.15)',
  showgrid: true,
  zeroline: false,
  linecolor: COLORS.BORDER,
  autorange: true,
};

const LAYOUT_BASE = {
  paper_bgcolor: COLORS.SURFACE,
  plot_bgcolor: COLORS.SURFACE,
  font: { color: COLORS.TEXT_DIM, family: '"SF Pro Text","Segoe UI","Roboto",sans-serif', size: 11 },
  margin: { l: 60, r: 16, t: 8, b: 32 },
  showlegend: false,
};

const CONFIG = {
  responsive: true,
  displayModeBar: true,
  scrollZoom: false,
};

/* ─── QCM: 3 independent charts ─── */

const QCM_IDS = ['chart-freq1', 'chart-freq2', 'chart-diff'];
const QCM_LABELS = ['Frequency #1 (Hz)', 'Frequency #2 (Hz)', 'ΔF (Hz)'];

let _lastIndex = 0;

export function initQCMCharts() {
  QCM_IDS.forEach((id, i) => {
    const div = document.getElementById(id);
    const traces = [
      {
        x: [], y: [],
        mode: 'markers',
        marker: { color: COLORS.YELLOW, size: 3 },
        visible: false,
        name: 'Raw',
        hoverinfo: 'skip',
      },
      {
        x: [], y: [],
        mode: 'lines',
        line: { color: COLORS.ACCENT, width: 2 },
        name: 'Avg',
      },
    ];

    const layout = {
      ...LAYOUT_BASE,
      xaxis: {
        ...AXIS_STYLE,
        title: i === 2 ? { text: 'Time (s)', font: { size: 11, color: COLORS.TEXT_DIM } } : undefined,
      },
      yaxis: {
        ...AXIS_STYLE,
        title: { text: QCM_LABELS[i], font: { size: 11, color: COLORS.TEXT_DIM } },
        tickformat: 'd',
        exponentformat: 'none',
      },
    };

    Plotly.newPlot(div, traces, layout, CONFIG);
  });
}

export function updateQCMCharts(time, raw, avg) {
  const newCount = time.length - _lastIndex;
  if (newCount <= 0) return;

  const keys = ['freq1', 'freq2', 'diff'];
  const newTime = time.slice(_lastIndex);

  QCM_IDS.forEach((id, i) => {
    const div = document.getElementById(id);
    const key = keys[i];
    Plotly.extendTraces(div, {
      x: [newTime, newTime],
      y: [raw[key].slice(_lastIndex), avg[key].slice(_lastIndex)],
    }, [0, 1]);
  });

  _lastIndex = time.length;
}

export function setRawVisible(visible) {
  QCM_IDS.forEach(id => {
    Plotly.restyle(document.getElementById(id), { visible: visible }, [0]);
  });
}

export function autoscaleQCM() {
  // Plotly modebar has its own autoscale button
}

export function clearQCM() {
  _lastIndex = 0;
  QCM_IDS.forEach(id => {
    const div = document.getElementById(id);
    div.data[0].x = []; div.data[0].y = [];
    div.data[1].x = []; div.data[1].y = [];
    Plotly.redraw(div);
  });
}

/* ─── TEC: single chart with 2 traces ─── */

export function initTECChart() {
  const div = document.getElementById('chart-temp');
  const traces = [
    {
      x: [], y: [],
      mode: 'lines',
      line: { color: COLORS.RED, width: 2 },
      name: 'TEC',
    },
    {
      x: [], y: [],
      mode: 'lines',
      line: { color: COLORS.GREEN, width: 1.5 },
      name: 'Onboard',
    },
  ];

  const layout = {
    ...LAYOUT_BASE,
    showlegend: true,
    legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0)', font: { color: COLORS.TEXT_DIM, size: 11 } },
    xaxis: {
      ...AXIS_STYLE,
      title: { text: 'Time (s)', font: { size: 11, color: COLORS.TEXT_DIM } },
    },
    yaxis: {
      ...AXIS_STYLE,
      title: { text: 'Temperature (°C)', font: { size: 11, color: COLORS.TEXT_DIM } },
      tickformat: '.1f',
    },
  };

  Plotly.newPlot(div, traces, layout, CONFIG);
}

export function updateTECTemp(time, temp) {
  const div = document.getElementById('chart-temp');
  Plotly.extendTraces(div, { x: [[time]], y: [[temp]] }, [0]);
}

export function updateOnboardTemp(time, temp) {
  const div = document.getElementById('chart-temp');
  Plotly.extendTraces(div, { x: [[time]], y: [[temp]] }, [1]);
}

export function autoscaleTEC() {
  // Plotly modebar has its own autoscale button
}

export function clearTEC() {
  const div = document.getElementById('chart-temp');
  div.data[0].x = []; div.data[0].y = [];
  div.data[1].x = []; div.data[1].y = [];
  Plotly.redraw(div);
}

/* ─── Resize visible charts (needed after tab switch) ─── */

export function resizeCharts(tab) {
  if (tab === 'qcm') {
    QCM_IDS.forEach(id => Plotly.Plots.resize(document.getElementById(id)));
  } else {
    Plotly.Plots.resize(document.getElementById('chart-temp'));
  }
}

/* ─── No custom context menu — using Plotly's native modebar ─── */

export function installContextMenu() {
  // Disabled — Plotly's built-in modebar handles zoom/pan/autoscale
}
