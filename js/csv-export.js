/**
 * CSV exporter — real-time file writing via File System Access API.
 * Falls back to in-memory accumulation + Blob download when the API is unavailable.
 * Port of data_export.py (thread + queue + f.flush() per row).
 */

const HEADER = ['Date', 'Time', 'Relative_Time_s', 'Frequency_1_Hz', 'Frequency_2_Hz', 'Delta_Frequency_Hz'];

function pad2(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

function formatRow(timestamp, relativeTime, freq1, freq2, diff) {
  const d = timestamp;
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(Math.floor(d.getMilliseconds()))}`;
  return [date, time, relativeTime.toFixed(3), freq1.toFixed(1), freq2.toFixed(1), diff.toFixed(1)];
}

function csvLine(fields) {
  return fields.join(',') + '\n';
}

const _hasFileSystemAccess = typeof window.showSaveFilePicker === 'function';

export class CSVExporter {
  constructor() {
    this._active = false;
    this._rowCount = 0;
    // File System Access API
    this._writable = null;
    // Fallback: in-memory
    this._rows = [];
    this._useStream = false;
  }

  get isActive() { return this._active; }
  get rowCount() { return this._rowCount; }

  /**
   * Open file picker and start logging.
   * Returns true if logging started, false if user cancelled the dialog.
   */
  async start() {
    this._rowCount = 0;
    this._rows = [];
    this._writable = null;
    this._useStream = false;

    if (_hasFileSystemAccess) {
      try {
        const now = new Date();
        const suggestedName = `openQCM_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;

        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'CSV Files',
            accept: { 'text/csv': ['.csv'] },
          }],
        });

        this._writable = await handle.createWritable();
        // Write header immediately
        await this._writable.write(csvLine(HEADER));
        this._useStream = true;
        this._active = true;
        return true;
      } catch (err) {
        // User cancelled the dialog (AbortError) or other error
        if (err.name === 'AbortError') return false;
        // Fall through to fallback
        console.warn('File System Access API failed, falling back to Blob:', err);
      }
    }

    // Fallback: in-memory accumulation
    this._useStream = false;
    this._active = true;
    return true;
  }

  addRow(timestamp, relativeTime, freq1, freq2, diff) {
    if (!this._active) return;
    const fields = formatRow(timestamp, relativeTime, freq1, freq2, diff);
    this._rowCount++;

    if (this._useStream && this._writable) {
      // Write to disk immediately (real-time, like Python's f.flush())
      this._writable.write(csvLine(fields)).catch(() => {});
    } else {
      // Fallback: accumulate in memory
      this._rows.push(fields);
    }
  }

  /**
   * Stop logging and close the file stream.
   * For fallback mode, triggers a Blob download.
   */
  async stop() {
    this._active = false;

    if (this._useStream && this._writable) {
      try {
        await this._writable.close();
      } catch { /* already closed */ }
      this._writable = null;
      return;
    }

    // Fallback: Blob download
    if (this._rows.length > 0) {
      const lines = [csvLine(HEADER)];
      for (const row of this._rows) {
        lines.push(csvLine(row));
      }
      const blob = new Blob(lines, { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const name = `openQCM_${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.csv`;

      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    this._rows = [];
  }
}
