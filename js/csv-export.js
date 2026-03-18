/** CSV exporter — accumulates rows in memory, downloads as Blob. Port of data_export.py. */

const HEADER = ['Date', 'Time', 'Relative_Time_s', 'Frequency_1_Hz', 'Frequency_2_Hz', 'Delta_Frequency_Hz'];

function pad2(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

function formatRow(timestamp, relativeTime, freq1, freq2, diff) {
  const d = timestamp;
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(Math.floor(d.getMilliseconds()))}`;
  return [date, time, relativeTime.toFixed(3), freq1.toFixed(1), freq2.toFixed(1), diff.toFixed(1)];
}

export class CSVExporter {
  constructor() {
    this._rows = [];
    this._active = false;
  }

  get isActive() { return this._active; }
  get rowCount() { return this._rows.length; }

  start() {
    this._rows = [];
    this._active = true;
  }

  addRow(timestamp, relativeTime, freq1, freq2, diff) {
    if (!this._active) return;
    this._rows.push(formatRow(timestamp, relativeTime, freq1, freq2, diff));
  }

  stop() {
    this._active = false;
  }

  download() {
    const lines = [HEADER.join(',')];
    for (const row of this._rows) {
      lines.push(row.join(','));
    }
    const csv = lines.join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const name = `openQCM_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);

    this._rows = [];
  }
}
