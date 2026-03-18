/** Web Serial API handler — port of serial_comm.py. */

import { BAUDRATE } from './config.js';

export function isWebSerialSupported() {
  return 'serial' in navigator;
}

export class SerialComm extends EventTarget {
  constructor() {
    super();
    this._port = null;
    this._reader = null;
    this._running = false;
  }

  get connected() { return this._running; }

  async connect(existingPort) {
    try {
      this._port = existingPort || await navigator.serial.requestPort();
      await this._port.open({ baudRate: BAUDRATE });
      this._running = true;
      this._readLoop();
    } catch (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: err.message }));
      throw err;
    }
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    const inputDone = this._port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    this._reader = reader;

    let buffer = '';
    try {
      while (this._running) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.dispatchEvent(new CustomEvent('data', { detail: trimmed }));
          }
        }
      }
    } catch (err) {
      if (this._running) {
        this.dispatchEvent(new CustomEvent('error', { detail: err.message }));
      }
    } finally {
      reader.releaseLock();
      await inputDone.catch(() => {});
    }
  }

  async write(data) {
    if (!this._port?.writable) return;
    const encoder = new TextEncoder();
    const writer = this._port.writable.getWriter();
    try {
      await writer.write(encoder.encode(data + '\n'));
    } finally {
      writer.releaseLock();
    }
  }

  async disconnect() {
    this._running = false;
    try {
      if (this._reader) {
        await this._reader.cancel();
        this._reader = null;
      }
      if (this._port) {
        await this._port.close();
        this._port = null;
      }
    } catch (err) {
      // Ignore close errors
    }
  }
}

/** Return previously-granted ports (no user gesture needed). */
export async function getGrantedPorts() {
  if (!isWebSerialSupported()) return [];
  return navigator.serial.getPorts();
}
