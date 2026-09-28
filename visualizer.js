/**
 * ==========================================================================
 * Robotic Arm Fault Detection - Studio Signal Engine & Telemetry Controller
 * Interactive Waveform with Laser Scrubber, Synced Audio, & Chart.js Engine
 * Includes Theme Toggle (Dark/Light) and MFCC Presentation Segment Toggle
 * ==========================================================================
 */

let waveformChartInstance = null;
let fftChartInstance = null;
let contrastChartInstance = null;
let mfccChartInstance = null;

let globalAudioElement = null;
let globalWaveformData = null;
let globalDuration = 10.0;
let globalMfccData = null;
let currentMfccMode = 'formants'; // 'formants' (2-13) or 'full' (1-13)

/**
 * --------------------------------------------------------------------------
 * 1. Theme Controller (Dark / Light Studio Mode with LocalStorage)
 * --------------------------------------------------------------------------
 */
function initThemeController() {
    const savedTheme = localStorage.getItem('robotic-arm-theme') || 'dark';
    applyTheme(savedTheme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('robotic-arm-theme', newTheme);
        });
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update button icons/labels
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        if (theme === 'light') {
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Dark</span>
            `;
            btn.title = "Switch to dark theme";
        } else {
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span>Light</span>
            `;
            btn.title = "Switch to light theme";
        }
    });

    // Update active chart grid/text colors
    updateChartsTheme(theme);
}

function updateChartsTheme(theme) {
    const isLight = theme === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    const textColor = isLight ? '#475569' : '#64748b';
    const tooltipBg = isLight ? '#ffffff' : '#151c2c';
    const tooltipBorder = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)';

    const charts = [waveformChartInstance, fftChartInstance, contrastChartInstance, mfccChartInstance];
    charts.forEach(chart => {
        if (!chart) return;
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
                if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
                if (chart.options.scales.x.title) chart.options.scales.x.title.color = textColor;
            }
            if (chart.options.scales.y) {
                if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
                if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
                if (chart.options.scales.y.title) chart.options.scales.y.title.color = textColor;
            }
        }
        if (chart.options.plugins && chart.options.plugins.tooltip) {
            chart.options.plugins.tooltip.backgroundColor = tooltipBg;
            chart.options.plugins.tooltip.borderColor = tooltipBorder;
        }
        chart.update('none');
    });
}

/**
 * --------------------------------------------------------------------------
 * 2. Ambient Hero Waveform Oscilloscope (For Home Page)
 * --------------------------------------------------------------------------
 */
function initHeroAmbientWave() {
    const canvas = document.getElementById('heroWaveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let step = 0;

    function render() {
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = canvas.parentElement.clientHeight || 64;

        ctx.clearRect(0, 0, width, height);

        // Center baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Waveform 1 (Primary Cyan)
        ctx.beginPath();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
            const freq = 0.035;
            const y = height / 2 + Math.sin(x * freq + step) * 14 * Math.cos(x * 0.01 + step * 0.5);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Waveform 2 (Secondary Subtle Purple)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x++) {
            const freq = 0.055;
            const y = height / 2 + Math.sin(x * freq - step * 1.2) * 8 * Math.sin(x * 0.02);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        step += 0.04;
        requestAnimationFrame(render);
    }

    render();
}

/**
 * --------------------------------------------------------------------------
 * 3. Diagnostic Result Page Visualizations
 * --------------------------------------------------------------------------
 */
function initDiagnosticCharts(data) {
    if (!data) return;

    globalWaveformData = data.waveform;
    globalMfccData = data.mfcc;
    if (data.metadata && data.metadata.duration) {
        globalDuration = data.metadata.duration;
    }

    // 1. Time-Domain Waveform Chart
    if (data.waveform && document.getElementById('waveformCanvas')) {
        renderWaveformChart(data.waveform);
        setupWaveformClickSeek();
    }

    // 2. Frequency-Domain FFT Spectrum
    if (data.fft && document.getElementById('fftCanvas')) {
        renderFFTChart(data.fft);
    }

    // 3. Spectral Contrast Bar Chart (7 Sub-Bands)
    if (data.contrast && document.getElementById('contrastCanvas')) {
        renderContrastChart(data.contrast);
    }

    // 4. MFCC Bar Chart (Scaled 2-13 with Energy Callout & Toggle)
    if (data.mfcc && document.getElementById('mfccCanvas')) {
        renderMFCCChart(data.mfcc, 'formants');
        setupMfccSegmentToggle();
    }

    // 5. Initialize Custom Audio Player & Sync
    initCustomAudioPlayer();

    // 6. Setup Feature Table Live Filter
    setupTableSearch();

    // Synchronize initial theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateChartsTheme(currentTheme);
}

/**
 * Waveform Chart (With Dynamic Amplitude Scaling, Seconds Ticks & Click-Seek Sync)
 */
function renderWaveformChart(waveform) {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;

    // Calculate maximum absolute amplitude for symmetrical autoscaling
    let maxAbs = 0;
    if (waveform.amplitude && waveform.amplitude.length > 0) {
        for (let i = 0; i < waveform.amplitude.length; i++) {
            const val = Math.abs(waveform.amplitude[i]);
            if (val > maxAbs) maxAbs = val;
        }
    }
    const yBound = Math.min(1.0, Math.max(0.05, Math.ceil(maxAbs * 1.25 * 100) / 100));

    // Update Range Indicator in Card Footer
    const rangeEl = document.getElementById('waveformRangeText');
    if (rangeEl) {
        rangeEl.innerHTML = `Range: <strong>±${yBound.toFixed(2)}</strong>`;
    }

    // Resilient HTML5 Canvas Fallback if Chart.js CDN is unavailable
    if (typeof Chart === 'undefined') {
        renderWaveformCanvasFallback(canvas, waveform, yBound);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (waveformChartInstance) waveformChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    const textColor = isLight ? '#475569' : '#64748b';

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
    gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.05)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.25)');

    waveformChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: waveform.time,
            datasets: [{
                label: 'Amplitude',
                data: waveform.amplitude,
                borderColor: '#0ea5e9',
                borderWidth: 1.5,
                backgroundColor: gradient,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#38bdf8',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#151c2c',
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 8,
                    titleColor: textColor,
                    bodyColor: '#0284c7',
                    titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12, weight: '700' },
                    callbacks: {
                        title: (items) => `Time: ${items[0].label}s`,
                        label: (item) => `Amplitude: ${item.raw >= 0 ? '+' : ''}${item.raw.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Time (seconds)', color: textColor, font: { size: 10, family: "'Inter', sans-serif" } },
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        maxTicksLimit: 12,
                        callback: function(val, index) {
                            const timeVal = waveform.time[index];
                            return timeVal !== undefined ? timeVal.toFixed(1) + 's' : '';
                        }
                    }
                },
                y: {
                    title: { display: true, text: 'Amplitude', color: textColor, font: { size: 10, family: "'Inter', sans-serif" } },
                    grid: { color: gridColor },
                    min: -yBound,
                    max: yBound,
                    ticks: {
                        color: textColor,
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        callback: (v) => (v >= 0 ? '+' : '') + v.toFixed(2)
                    }
                }
            }
        }
    });
}

function setupWaveformClickSeek() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', (e) => {
        if (!globalAudioElement || !globalDuration) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const seekTime = ratio * globalDuration;

        globalAudioElement.currentTime = seekTime;
        updateAudioScrubber(seekTime);
    });
}

/**
 * FFT Frequency Spectrum Chart (Positioned Below Waveform)
 */
function renderFFTChart(fft) {
    const canvas = document.getElementById('fftCanvas');
    if (!canvas) return;

    // Resilient HTML5 Canvas Fallback if Chart.js CDN is unavailable
    if (typeof Chart === 'undefined') {
        renderFFTCanvasFallback(canvas, fft);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (fftChartInstance) fftChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    const textColor = isLight ? '#475569' : '#64748b';

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.30)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.00)');

    fftChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fft.freq,
            datasets: [{
                label: 'Magnitude (dB)',
                data: fft.mag_db,
                borderColor: '#a855f7',
                borderWidth: 1.5,
                backgroundColor: gradient,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#c084fc',
                tension: 0.15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#151c2c',
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 8,
                    titleColor: textColor,
                    bodyColor: '#7c3aed',
                    titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12, weight: '700' },
                    callbacks: {
                        title: (items) => `Frequency: ${items[0].label} Hz`,
                        label: (item) => `Magnitude: ${item.raw.toFixed(2)} dB`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Frequency (Hz)', color: textColor, font: { size: 10, family: "'Inter', sans-serif" } },
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        maxTicksLimit: 12,
                        callback: function(val, index) {
                            const freqVal = fft.freq[index];
                            if (freqVal === undefined) return '';
                            if (freqVal >= 1000) return (freqVal / 1000).toFixed(1) + ' kHz';
                            return Math.round(freqVal) + ' Hz';
                        }
                    }
                },
                y: {
                    title: { display: true, text: 'Magnitude (dB)', color: textColor, font: { size: 10, family: "'Inter', sans-serif" } },
                    grid: { color: gridColor },
                    min: -80,
                    max: 0,
                    ticks: {
                        color: textColor,
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        stepSize: 20,
                        callback: (v) => v + ' dB'
                    }
                }
            }
        }
    });
}

/**
 * Native HTML5 Canvas Fallbacks (Guarantees Real Charts Offline / Without CDN)
 */
function renderWaveformCanvasFallback(canvas, waveform, yBound) {
    if (!canvas || !waveform || !waveform.amplitude) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 800;
    const height = canvas.height = canvas.parentElement.clientHeight || 250;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, width, height);

    const padL = 60, padR = 20, padT = 20, padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const centerY = padT + plotH / 2;

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = isLight ? '#475569' : '#64748b';
    ctx.font = "10px 'JetBrains Mono', monospace";

    [-yBound, 0, yBound].forEach(val => {
        const y = centerY - (val / yBound) * (plotH / 2);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillText((val >= 0 ? '+' : '') + val.toFixed(2), 10, y + 3);
    });

    const duration = (waveform.time && waveform.time[waveform.time.length - 1]) || 10;
    for (let t = 0; t <= 10; t++) {
        const x = padL + (t / 10) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        ctx.fillText(((t / 10) * duration).toFixed(1) + 's', x - 10, height - 10);
    }

    const n = waveform.amplitude.length;
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
    grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.05)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.25)');

    ctx.beginPath();
    ctx.moveTo(padL, centerY);
    for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - (waveform.amplitude[i] / yBound) * (plotH / 2);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + plotW, centerY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - (waveform.amplitude[i] / yBound) * (plotH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function renderFFTCanvasFallback(canvas, fft) {
    if (!canvas || !fft || !fft.mag_db) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 800;
    const height = canvas.height = canvas.parentElement.clientHeight || 250;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, width, height);

    const padL = 60, padR = 20, padT = 20, padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = isLight ? '#475569' : '#64748b';
    ctx.font = "10px 'JetBrains Mono', monospace";

    [-80, -60, -40, -20, 0].forEach(db => {
        const y = padT + ((0 - db) / 80) * plotH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillText(db + ' dB', 10, y + 3);
    });

    const maxFreq = (fft.freq && fft.freq[fft.freq.length - 1]) || 8000;
    for (let i = 0; i <= 8; i++) {
        const x = padL + (i / 8) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        const f = Math.round((i / 8) * maxFreq);
        const fStr = f >= 1000 ? (f / 1000).toFixed(1) + 'k' : f + 'Hz';
        ctx.fillText(fStr, x - 12, height - 10);
    }

    const n = fft.mag_db.length;
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.30)');
    grad.addColorStop(1, 'rgba(168, 85, 247, 0.01)');

    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const clampedDb = Math.max(-80, Math.min(0, fft.mag_db[i]));
        const y = padT + ((0 - clampedDb) / 80) * plotH;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const clampedDb = Math.max(-80, Math.min(0, fft.mag_db[i]));
        const y = padT + ((0 - clampedDb) / 80) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

/**
 * Spectral Contrast Bar Chart
 */
function renderContrastChart(contrast) {
    const canvas = document.getElementById('contrastCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (contrastChartInstance) contrastChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    const textColor = isLight ? '#475569' : '#64748b';

    contrastChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: contrast.labels,
            datasets: [{
                label: 'Contrast (dB)',
                data: contrast.values,
                backgroundColor: 'rgba(14, 165, 233, 0.65)',
                borderColor: '#0ea5e9',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#151c2c',
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 8,
                    callbacks: {
                        label: (item) => `Contrast: ${item.raw.toFixed(3)} dB`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor,
                        font: { size: 10, family: "'JetBrains Mono', monospace" }
                    },
                    grid: { display: false }
                },
                y: {
                    title: { display: true, text: 'Contrast (dB)', color: textColor, font: { size: 10 } },
                    ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 10 } },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

/**
 * MFCC Bar Chart (Supports Toggle between Formants 2-13 and Full 1-13)
 */
function renderMFCCChart(mfcc, mode) {
    const canvas = document.getElementById('mfccCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (mfccChartInstance) mfccChartInstance.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    const textColor = isLight ? '#475569' : '#64748b';

    // Highlight MFCC 1
    const mfcc1Val = mfcc.values[0];
    const energyCallout = document.getElementById('mfccEnergyCallout');
    if (energyCallout) {
        energyCallout.textContent = `MFCC 1 (Log Energy): ${mfcc1Val.toFixed(2)}`;
    }

    let displayLabels, displayValues;
    if (mode === 'full') {
        displayLabels = mfcc.labels;
        displayValues = mfcc.values;
    } else {
        displayLabels = mfcc.labels.slice(1);
        displayValues = mfcc.values.slice(1);
    }

    const bgColors = displayValues.map(val => val >= 0 ? 'rgba(16, 185, 129, 0.65)' : 'rgba(244, 63, 94, 0.65)');
    const borderColors = displayValues.map(val => val >= 0 ? '#10b981' : '#f43f5e');

    mfccChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Coefficient',
                data: displayValues,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isLight ? '#ffffff' : '#151c2c',
                    borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 8,
                    callbacks: {
                        label: (item) => `Value: ${item.raw.toFixed(3)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor,
                        font: { size: 10, family: "'JetBrains Mono', monospace" }
                    },
                    grid: { display: false }
                },
                y: {
                    title: { display: true, text: 'Coefficient', color: textColor, font: { size: 10 } },
                    ticks: { color: textColor, font: { family: "'JetBrains Mono', monospace", size: 10 } },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function setupMfccSegmentToggle() {
    const btnFormants = document.getElementById('toggleMfccFormants');
    const btnFull = document.getElementById('toggleMfccFull');

    if (!btnFormants || !btnFull || !globalMfccData) return;

    btnFormants.addEventListener('click', () => {
        btnFormants.classList.add('active');
        btnFull.classList.remove('active');
        currentMfccMode = 'formants';
        renderMFCCChart(globalMfccData, 'formants');
    });

    btnFull.addEventListener('click', () => {
        btnFull.classList.add('active');
        btnFormants.classList.remove('active');
        currentMfccMode = 'full';
        renderMFCCChart(globalMfccData, 'full');
    });
}

/**
 * --------------------------------------------------------------------------
 * 4. Custom Synchronized Audio Player Controller
 * --------------------------------------------------------------------------
 */
function initCustomAudioPlayer() {
    const audio = document.getElementById('nativeAudioElement');
    const playBtn = document.getElementById('customPlayBtn');
    const scrubber = document.getElementById('playerScrubber');
    const needle = document.getElementById('waveformPlayheadNeedle');

    if (!audio) return;
    globalAudioElement = audio;

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                `;
            } else {
                audio.pause();
                playBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                `;
            }
        });
    }

    audio.addEventListener('timeupdate', () => {
        const current = audio.currentTime;
        const total = audio.duration || globalDuration;
        updateAudioScrubber(current, total);
    });

    audio.addEventListener('ended', () => {
        if (playBtn) {
            playBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
        }
        if (needle) needle.style.display = 'none';
    });

    if (scrubber) {
        scrubber.addEventListener('input', (e) => {
            const ratio = e.target.value / 100;
            const targetTime = ratio * (audio.duration || globalDuration);
            audio.currentTime = targetTime;
            updateAudioScrubber(targetTime);
        });
    }
}

function updateAudioScrubber(current, total) {
    const scrubber = document.getElementById('playerScrubber');
    const timeDisplay = document.getElementById('playerTimeDisplay');
    const needle = document.getElementById('waveformPlayheadNeedle');
    const duration = total || globalAudioElement?.duration || globalDuration;

    if (timeDisplay) {
        const curMin = Math.floor(current / 60);
        const curSec = Math.floor(current % 60);
        const totMin = Math.floor(duration / 60);
        const totSec = Math.floor(duration % 60);
        timeDisplay.textContent = `${String(curMin).padStart(2, '0')}:${String(curSec).padStart(2, '0')} / ${String(totMin).padStart(2, '0')}:${String(totSec).padStart(2, '0')}`;
    }

    if (scrubber && duration > 0) {
        scrubber.value = (current / duration) * 100;
    }

    if (needle && duration > 0) {
        needle.style.display = 'block';
        const percent = Math.min(100, Math.max(0, (current / duration) * 100));
        needle.style.left = `${percent}%`;
    }
}

/**
 * --------------------------------------------------------------------------
 * 5. File Upload Dropzone
 * --------------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {
    initThemeController();
    initHeroAmbientWave();

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('audioInput');
    const selectedBox = document.getElementById('fileSelectedBox');
    const fileNameEl = document.getElementById('selectedFileName');
    const fileSizeEl = document.getElementById('selectedFileSize');
    const form = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');

    if (dropzone && fileInput) {
        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files.length) {
                fileInput.files = dt.files;
                handleFileSelect(dt.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    function handleFileSelect(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.wav')) {
            alert('Please select a .wav file.');
            fileInput.value = '';
            return;
        }

        if (selectedBox) {
            selectedBox.classList.add('active');
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (fileSizeEl) {
                const sizeKb = (file.size / 1024).toFixed(1);
                fileSizeEl.textContent = `${sizeKb} KB`;
            }
        }
    }

    if (form && submitBtn) {
        form.addEventListener('submit', () => {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                Analyzing...
            `;
            submitBtn.style.opacity = '0.8';
        });
    }
});

/**
 * --------------------------------------------------------------------------
 * 6. Feature Matrix Table Search, Copy, and Print PDF
 * --------------------------------------------------------------------------
 */
function setupTableSearch() {
    const searchInput = document.getElementById('tableSearchInput');
    const table = document.getElementById('telemetryTable');
    if (!searchInput || !table) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const featureName = row.cells[1]?.textContent.toLowerCase() || '';
            const category = row.cells[2]?.textContent.toLowerCase() || '';
            if (featureName.includes(query) || category.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

function copyFeaturesJson(featuresData) {
    if (!featuresData) return;
    navigator.clipboard.writeText(JSON.stringify(featuresData, null, 2))
        .then(() => alert('Features copied to clipboard.'))
        .catch(err => console.error('Copy failed:', err));
}

function printDiagnosticReport() {
    window.print();
}
