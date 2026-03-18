/** Main application controller — port of main_window.py. */

import { TEC_TEMP_MIN, TEC_TEMP_MAX, TEC_TEMP_DEFAULT, GATE_TIME } from './config.js';
import { QCMData } from './data-model.js';
import { SerialComm, isWebSerialSupported, getGrantedPorts } from './serial-comm.js';
import { CSVExporter } from './csv-export.js';
import {
  initQCMCharts, initTECChart,
  updateQCMCharts, setRawVisible, autoscaleQCM, clearQCM,
  updateTECTemp, updateOnboardTemp, autoscaleTEC, clearTEC,
  resizeCharts, installContextMenu,
} from './charts.js';

/* ─── State ─── */
const qcmData = new QCMData();
const csvExporter = new CSVExporter();
let serial = null;
let rawVisible = false;
let tecSampleCounter = 0;
let onboardSampleCounter = 0;

/* ─── DOM refs ─── */
const $ = (id) => document.getElementById(id);
const portSelect    = $('port-select');
const refreshBtn    = $('refresh-btn');
const connectBtn    = $('connect-btn');
const autoscaleBtn  = $('autoscale-btn');
const clearBtn      = $('clear-btn');
const rawBtn        = $('raw-btn');
const saveBtn       = $('save-btn');
const setTempBtn    = $('set-temp-btn');
const tempSetpoint  = $('temp-setpoint');
const freq1Value    = $('freq1-value');
const freq2Value    = $('freq2-value');
const diffValue     = $('diff-value');
const tecTempValue  = $('tec-temp-value');
const onboardValue  = $('onboard-temp-value');
const statusLabel   = $('status-label');
const lastDataLabel = $('last-data-label');
const serialWarning = $('serial-warning');

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Check Web Serial support
  if (!isWebSerialSupported()) {
    serialWarning.hidden = false;
    connectBtn.disabled = true;
    refreshBtn.disabled = true;
  }

  // Init charts
  initQCMCharts();
  initTECChart();
  installContextMenu();

  // Populate granted ports
  refreshPorts();

  // Wire buttons
  refreshBtn.addEventListener('click', refreshPorts);
  connectBtn.addEventListener('click', toggleConnect);
  autoscaleBtn.addEventListener('click', () => { autoscaleQCM(); autoscaleTEC(); });
  clearBtn.addEventListener('click', clearAll);
  rawBtn.addEventListener('click', toggleRaw);
  saveBtn.addEventListener('click', toggleSave);
  setTempBtn.addEventListener('click', sendTemperature);

  // Tab switching
  document.querySelectorAll('.tab-bar .tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Splitter drag
  initSplitter();

  // Temperature input constraints
  tempSetpoint.min = TEC_TEMP_MIN;
  tempSetpoint.max = TEC_TEMP_MAX;
  tempSetpoint.value = TEC_TEMP_DEFAULT.toFixed(3);

  // Mock mode for testing without hardware
  if (new URLSearchParams(window.location.search).has('mock')) {
    startMock();
  }
});

/* ─── Serial connection ─── */

async function refreshPorts() {
  portSelect.innerHTML = '';
  try {
    const ports = await getGrantedPorts();
    if (ports.length === 0) {
      portSelect.innerHTML = '<option value="">No ports</option>';
    } else {
      ports.forEach((port, i) => {
        const info = port.getInfo();
        const label = info.usbVendorId
          ? `USB ${info.usbVendorId}:${info.usbProductId}`
          : `Port ${i + 1}`;
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = label;
        opt.port = port;
        portSelect.appendChild(opt);
      });
    }
  } catch {
    portSelect.innerHTML = '<option value="">No ports</option>';
  }
}

async function toggleConnect() {
  if (serial?.connected) {
    await disconnect();
  } else {
    await connect();
  }
}

async function connect() {
  try {
    serial = new SerialComm();
    serial.addEventListener('data', onSerialData);
    serial.addEventListener('error', onSerialError);

    // Use selected port or request new one
    const selected = portSelect.selectedOptions[0];
    const existingPort = selected?.port || null;
    await serial.connect(existingPort);

    setConnectedUI(true);
    setStatus('Connected');

    // Refresh port list to include newly granted port
    await refreshPorts();
  } catch (err) {
    setStatus('Connection failed');
    serial = null;
  }
}

async function disconnect() {
  if (serial) {
    await serial.disconnect();
    serial = null;
  }
  setConnectedUI(false);
  setStatus('Disconnected');
}

function setConnectedUI(connected) {
  connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
  connectBtn.dataset.connected = connected ? 'true' : 'false';
  portSelect.disabled = connected;
  refreshBtn.disabled = connected;
}

function setStatus(text) {
  statusLabel.textContent = `STATUS: ${text}`;
}

/* ─── Serial data handling (mirrors main_window._on_data) ─── */

function onSerialData(e) {
  const data = e.detail;
  if (data.startsWith('F')) {
    handleQCM(data);
  } else if (data.startsWith('T')) {
    handleTECTemp(data);
  } else if (data.startsWith('C')) {
    handleOnboardTemp(data);
  }
}

function handleQCM(data) {
  try {
    const parts = data.split(',');
    if (parts.length !== 3) return;
    const freq1 = parseFloat(parts[0].substring(1));
    const freq2 = parseFloat(parts[1]);
    const diff = parseFloat(parts[2]);
    if (isNaN(freq1) || isNaN(freq2) || isNaN(diff)) return;

    const result = qcmData.addSample(freq1, freq2, diff);

    // Update charts
    updateQCMCharts(qcmData.time, qcmData.raw, qcmData.avg);

    // Update sidebar measurements (averaged values)
    freq1Value.textContent = `${result.avg1.toFixed(1)} Hz`;
    freq2Value.textContent = `${result.avg2.toFixed(1)} Hz`;
    diffValue.textContent = `${result.avgD.toFixed(1)} Hz`;

    // Update status bar
    lastDataLabel.textContent = `F1: ${result.avg1.toFixed(1)}  F2: ${result.avg2.toFixed(1)}  ΔF: ${result.avgD.toFixed(1)} Hz`;

    // CSV logging
    if (csvExporter.isActive) {
      const ts = qcmData.timestamps[qcmData.timestamps.length - 1];
      const t = qcmData.time[qcmData.time.length - 1];
      csvExporter.addRow(ts, t, result.avg1, result.avg2, result.avgD);
    }
  } catch {
    // Ignore parse errors
  }
}

function handleTECTemp(data) {
  try {
    const temp = parseInt(data.substring(1), 10) / 1000.0;
    if (isNaN(temp)) return;
    const time = tecSampleCounter * GATE_TIME;
    tecSampleCounter++;
    updateTECTemp(time, temp);
    tecTempValue.textContent = `${temp.toFixed(3)} °C`;
  } catch {
    // Ignore parse errors
  }
}

function handleOnboardTemp(data) {
  try {
    const temp = parseFloat(data.substring(1));
    if (isNaN(temp)) return;
    const time = onboardSampleCounter * GATE_TIME;
    onboardSampleCounter++;
    updateOnboardTemp(time, temp);
    onboardValue.textContent = `${temp.toFixed(3)} °C`;
  } catch {
    // Ignore parse errors
  }
}

function onSerialError(e) {
  setStatus(`Error: ${e.detail}`);
  disconnect();
}

/* ─── Commands ─── */

function sendTemperature() {
  if (!serial?.connected) return;
  const temp = parseFloat(tempSetpoint.value);
  if (isNaN(temp)) return;
  serial.write(`T${Math.round(temp * 1000)}`);
}

function clearAll() {
  qcmData.reset();
  tecSampleCounter = 0;
  onboardSampleCounter = 0;
  clearQCM();
  clearTEC();
  freq1Value.textContent = '\u2014';
  freq2Value.textContent = '\u2014';
  diffValue.textContent = '\u2014';
  tecTempValue.textContent = '\u2014';
  onboardValue.textContent = '\u2014';
  lastDataLabel.textContent = '';
}

function toggleRaw() {
  rawVisible = !rawVisible;
  rawBtn.classList.toggle('active', rawVisible);
  setRawVisible(rawVisible);
}

function toggleSave() {
  if (csvExporter.isActive) {
    // Stop logging and download
    csvExporter.stop();
    csvExporter.download();
    saveBtn.textContent = 'Save Data';
    saveBtn.dataset.logging = 'false';
    setStatus(serial?.connected ? 'Connected' : 'Disconnected');
    lastDataLabel.textContent = '';
  } else {
    // Start logging
    csvExporter.start();
    saveBtn.textContent = 'Stop Data';
    saveBtn.dataset.logging = 'true';
    setStatus('Logging...');
  }
}

/* ─── Tab switching ─── */

function switchTab(tab) {
  document.querySelectorAll('.tab-bar .tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
  // Plotly needs resize when container becomes visible
  requestAnimationFrame(() => resizeCharts(tab));
}

/* ─── Splitter drag ─── */

function initSplitter() {
  const handle = $('splitter-handle');
  const mainArea = document.querySelector('.main-area');
  let dragging = false;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = mainArea.getBoundingClientRect();
    let sidebarWidth = e.clientX - rect.left;
    sidebarWidth = Math.max(60, Math.min(350, sidebarWidth));
    mainArea.style.gridTemplateColumns = `${sidebarWidth}px 3px 1fr`;
    // Resize charts after layout change
    requestAnimationFrame(() => {
      const activeTab = document.querySelector('.tab-bar .tab.active')?.dataset.tab || 'qcm';
      resizeCharts(activeTab);
    });
  });

  document.addEventListener('mouseup', () => { dragging = false; });
}

/* ─── Mock mode (for testing without hardware) ─── */

function startMock() {
  setStatus('Mock mode');
  setConnectedUI(true);

  let counter = 0;
  const baseFreq1 = 10013600;
  const baseFreq2 = 10020500;

  setInterval(() => {
    const f1 = baseFreq1 + (Math.random() - 0.5) * 20;
    const f2 = baseFreq2 + (Math.random() - 0.5) * 20;
    const diff = f2 - f1;
    handleQCM(`F${f1.toFixed(0)},${f2.toFixed(0)},${diff.toFixed(0)}`);

    if (counter % 2 === 0) {
      handleTECTemp(`T${Math.round((25 + (Math.random() - 0.5) * 0.1) * 1000)}`);
      handleOnboardTemp(`C${(26 + (Math.random() - 0.5) * 0.2).toFixed(1)}`);
    }
    counter++;
  }, 500);
}
