/** Plotly.js chart setup and update — replaces pyqtgraph PlotWidget logic. */

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
  datarevision: 0,
};

const CONFIG = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: true,
};

/* ─── QCM: 3 subplots sharing x-axis ─── */

let qcmDiv = null;

export function initQCMCharts() {
  qcmDiv = document.getElementById('chart-freq1');
  // We use 3 separate divs for simpler layout, but link x-axes manually.
  const ids = ['chart-freq1', 'chart-freq2', 'chart-diff'];
  const labels = ['Frequency #1 (Hz)', 'Frequency #2 (Hz)', 'ΔF (Hz)'];

  ids.forEach((id, i) => {
    const div = document.getElementById(id);
    const traces = [
      // Trace 0: raw scatter (hidden by default)
      {
        x: [], y: [],
        mode: 'markers',
        marker: { color: COLORS.YELLOW, size: 3 },
        visible: false,
        name: 'Raw',
        hoverinfo: 'skip',
      },
      // Trace 1: averaged line
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
        title: { text: labels[i], font: { size: 11, color: COLORS.TEXT_DIM } },
        tickformat: 'd',
        exponentformat: 'none',
      },
    };

    Plotly.newPlot(div, traces, layout, CONFIG);
  });
}

let _revision = 0;

export function updateQCMCharts(time, raw, avg) {
  const keys = ['freq1', 'freq2', 'diff'];
  const ids = ['chart-freq1', 'chart-freq2', 'chart-diff'];
  const labels = ['Frequency #1 (Hz)', 'Frequency #2 (Hz)', 'ΔF (Hz)'];
  _revision++;

  ids.forEach((id, i) => {
    const div = document.getElementById(id);
    const key = keys[i];
    const traces = [
      {
        x: time, y: raw[key],
        mode: 'markers',
        marker: { color: COLORS.YELLOW, size: 3 },
        visible: div.data?.[0]?.visible ?? false,
        name: 'Raw',
        hoverinfo: 'skip',
      },
      {
        x: time, y: avg[key],
        mode: 'lines',
        line: { color: COLORS.ACCENT, width: 2 },
        name: 'Avg',
      },
    ];
    const layout = {
      ...LAYOUT_BASE,
      datarevision: _revision,
      xaxis: {
        ...AXIS_STYLE,
        title: i === 2 ? { text: 'Time (s)', font: { size: 11, color: COLORS.TEXT_DIM } } : undefined,
      },
      yaxis: {
        ...AXIS_STYLE,
        title: { text: labels[i], font: { size: 11, color: COLORS.TEXT_DIM } },
        tickformat: 'd',
        exponentformat: 'none',
      },
    };
    Plotly.react(div, traces, layout, CONFIG);
  });
}

export function setRawVisible(visible) {
  const ids = ['chart-freq1', 'chart-freq2', 'chart-diff'];
  ids.forEach(id => {
    Plotly.restyle(document.getElementById(id), { visible: visible }, [0]);
  });
}

export function autoscaleQCM() {
  const ids = ['chart-freq1', 'chart-freq2', 'chart-diff'];
  ids.forEach(id => {
    Plotly.relayout(document.getElementById(id), {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    });
  });
}

export function clearQCM() {
  const ids = ['chart-freq1', 'chart-freq2', 'chart-diff'];
  ids.forEach(id => {
    const div = document.getElementById(id);
    div.data[0].x = []; div.data[0].y = [];
    div.data[1].x = []; div.data[1].y = [];
    Plotly.react(div, div.data, div.layout);
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

// TEC data arrays (managed here since they have their own time axis)
let tecTime = [];
let tecData = [];
let onboardTime = [];
let onboardData = [];

export function updateTECTemp(time, temp) {
  tecTime.push(time);
  tecData.push(temp);
  const div = document.getElementById('chart-temp');
  div.data[0].x = tecTime;
  div.data[0].y = tecData;
  div.layout.datarevision = ++_revision;
  Plotly.react(div, div.data, div.layout);
}

export function updateOnboardTemp(time, temp) {
  onboardTime.push(time);
  onboardData.push(temp);
  const div = document.getElementById('chart-temp');
  div.data[1].x = onboardTime;
  div.data[1].y = onboardData;
  div.layout.datarevision = ++_revision;
  Plotly.react(div, div.data, div.layout);
}

export function autoscaleTEC() {
  Plotly.relayout(document.getElementById('chart-temp'), {
    'xaxis.autorange': true,
    'yaxis.autorange': true,
  });
}

export function clearTEC() {
  tecTime = []; tecData = [];
  onboardTime = []; onboardData = [];
  const div = document.getElementById('chart-temp');
  div.data[0].x = []; div.data[0].y = [];
  div.data[1].x = []; div.data[1].y = [];
  Plotly.react(div, div.data, div.layout);
}

/* ─── Resize visible charts (needed after tab switch) ─── */

export function resizeCharts(tab) {
  if (tab === 'qcm') {
    ['chart-freq1', 'chart-freq2', 'chart-diff'].forEach(id =>
      Plotly.Plots.resize(document.getElementById(id))
    );
  } else {
    Plotly.Plots.resize(document.getElementById('chart-temp'));
  }
}

/* ─── Custom context menu ─── */

export function installContextMenu() {
  const allChartIds = ['chart-freq1', 'chart-freq2', 'chart-diff', 'chart-temp'];
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.display = 'none';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="autoscale">Auto-scale</div>
    <div class="context-menu-item" data-action="reset">Reset Zoom</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item" data-action="pan">Pan Mode</div>
    <div class="context-menu-item" data-action="select">Select Mode</div>
  `;
  document.body.appendChild(menu);

  let targetDiv = null;

  allChartIds.forEach(id => {
    const div = document.getElementById(id);
    if (!div) return;
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      targetDiv = div;
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.style.display = 'block';
    });
  });

  document.addEventListener('click', () => { menu.style.display = 'none'; });

  menu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action || !targetDiv) return;
    if (action === 'autoscale' || action === 'reset') {
      Plotly.relayout(targetDiv, { 'xaxis.autorange': true, 'yaxis.autorange': true });
    } else if (action === 'pan') {
      Plotly.relayout(targetDiv, { dragmode: 'pan' });
    } else if (action === 'select') {
      Plotly.relayout(targetDiv, { dragmode: 'select' });
    }
    menu.style.display = 'none';
  });
}
