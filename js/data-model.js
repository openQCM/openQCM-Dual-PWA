/** QCM data model with circular-buffer averaging — port of data_model.py. */

import { BUFFER_SIZE, GATE_TIME } from './config.js';

export class QCMData {
  constructor(bufferSize = BUFFER_SIZE, gateTime = GATE_TIME) {
    this.bufferSize = bufferSize;
    this.gateTime = gateTime;
    this.reset();
  }

  reset() {
    this.time = [];
    this.timestamps = [];
    this.raw = { freq1: [], freq2: [], diff: [] };
    this.avg = { freq1: [], freq2: [], diff: [] };

    this._buffer = {
      freq1: new Array(this.bufferSize).fill(0),
      freq2: new Array(this.bufferSize).fill(0),
      diff:  new Array(this.bufferSize).fill(0),
    };
    this._bufIdx = 0;
    this._counter = 0;
    this._initialised = false;
  }

  addSample(freq1, freq2, diff) {
    if (!this._initialised) {
      this._buffer.freq1.fill(freq1);
      this._buffer.freq2.fill(freq2);
      this._buffer.diff.fill(diff);
      this._initialised = true;
      this._bufIdx = 0;
    } else {
      this._buffer.freq1[this._bufIdx] = freq1;
      this._buffer.freq2[this._bufIdx] = freq2;
      this._buffer.diff[this._bufIdx] = diff;
      this._bufIdx = (this._bufIdx + 1) % this.bufferSize;
    }

    // Timestamp
    this.timestamps.push(new Date());

    // Raw data
    this.raw.freq1.push(freq1);
    this.raw.freq2.push(freq2);
    this.raw.diff.push(diff);

    // Averaged data
    const avg1 = this._buffer.freq1.reduce((a, b) => a + b, 0) / this.bufferSize;
    const avg2 = this._buffer.freq2.reduce((a, b) => a + b, 0) / this.bufferSize;
    const avgD = this._buffer.diff.reduce((a, b) => a + b, 0) / this.bufferSize;
    this.avg.freq1.push(avg1);
    this.avg.freq2.push(avg2);
    this.avg.diff.push(avgD);

    // Time axis
    const t = this._counter * this.gateTime;
    this.time.push(t);
    this._counter++;

    return { freq1, freq2, diff, avg1, avg2, avgD };
  }
}
