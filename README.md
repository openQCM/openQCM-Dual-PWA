# openQCM Dual PWA

Progressive Web App for **openQCM Dual** — real-time monitoring of dual quartz crystal microbalance sensors via USB serial.

**Live App:** [https://openqcm.github.io/openQCM-Dual-PWA/](https://openqcm.github.io/openQCM-Dual-PWA/)

## Features

- **Real-time frequency monitoring** — 3 synchronized charts (Frequency #1, Frequency #2, ΔF) with linked X-axis zoom/pan
- **Temperature monitoring** — TEC and onboard temperature on dedicated tab
- **Web Serial API** — direct USB connection to Teensy 4.0 from the browser (Chrome/Edge)
- **Real-time CSV export** — data written to disk sample-by-sample via File System Access API
- **Moving average** — configurable circular buffer smoothing (default: 10 samples)
- **Raw data overlay** — toggle raw scatter points over averaged lines
- **Offline capable** — service worker caches all assets for offline use
- **Installable** — PWA manifest allows "Add to Home Screen" on supported devices

## Requirements

- **Chrome** or **Edge** (Web Serial API is not supported in Firefox/Safari)
- **openQCM Dual** hardware connected via USB

## Quick Start

### Option 1: GitHub Pages (recommended)
Open [https://openqcm.github.io/openQCM-Dual-PWA/](https://openqcm.github.io/openQCM-Dual-PWA/) in Chrome/Edge, click **Connect**, and select your device.

### Option 2: Local development
```bash
git clone https://github.com/openQCM/openQCM-Dual-PWA.git
cd openQCM-Dual-PWA
python3 -m http.server 8080
```
Open `http://localhost:8080` in Chrome/Edge.

### Demo mode
Append `?mock` to the URL to run with simulated data (no hardware required):
- [https://openqcm.github.io/openQCM-Dual-PWA/?mock](https://openqcm.github.io/openQCM-Dual-PWA/?mock)

## Serial Protocol

The app communicates with Teensy 4.0 at **9600 baud** using a simple text protocol:

| Prefix | Format | Description |
|--------|--------|-------------|
| `F` | `F<freq1>,<freq2>,<diff>` | QCM frequency data (Hz) |
| `T` | `T<temp_milli>` | TEC temperature (millidegrees C) |
| `C` | `C<temp>` | Onboard temperature (degrees C) |

## Project Structure

```
openqcm-dual-pwa/
├── index.html          # Single-page app shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache-first)
├── css/
│   └── style.css       # Dark theme with CSS variables
├── js/
│   ├── config.js       # Constants (baud rate, colors, buffer size)
│   ├── data-model.js   # QCMData: circular buffer moving average
│   ├── serial-comm.js  # Web Serial API wrapper (EventTarget)
│   ├── csv-export.js   # Real-time CSV via File System Access API
│   ├── charts.js       # Plotly.js chart setup and streaming updates
│   └── app.js          # Main controller (wires everything together)
└── icons/
    ├── openqcm.svg     # Logo
    ├── icon-192.png    # PWA icon 192x192
    └── icon-512.png    # PWA icon 512x512
```

## Technology Stack

- **Vanilla JavaScript** (ES modules, no framework)
- **Plotly.js** for real-time charting
- **Web Serial API** for USB communication
- **File System Access API** for real-time CSV writing
- **CSS Grid** layout with resizable splitter

## Related

- [openQCM Dual Desktop App](https://github.com/openQCM/openQCM_Dual_Quartz_Sensors) — Python/PyQt5 desktop version
- [openqcm.com](https://openqcm.com) — Official website

## License

This project is part of the openQCM ecosystem. See [openqcm.com](https://openqcm.com) for details.
