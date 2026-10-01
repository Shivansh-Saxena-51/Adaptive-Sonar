/* =============================================
   TARANG — Shared Dashboard JavaScript
   Charts, animations, sidebar, real-time data
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCharts();
  initRealTimeUpdates();
});

// ========================================
// SIDEBAR
// ========================================
function initSidebar() {
  const toggle = document.querySelector('.mobile-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.querySelector('.main-content')?.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }
}

// ========================================
// CANVAS CHART UTILITIES
// ========================================
function getCanvasCtx(id, height) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const h = height || 180;
  canvas.width = rect.width * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h };
}

// Draw a line chart
function drawLineChart(canvasId, data, options = {}) {
  const result = getCanvasCtx(canvasId, options.height);
  if (!result) return;
  const { ctx, w, h } = result;
  const {
    color = '#38bdf8',
    fillColor = 'rgba(56, 189, 248, 0.08)',
    lineWidth = 2,
    showGrid = true,
    showDots = false,
    yMin = null,
    yMax = null,
    padding = { top: 20, right: 10, bottom: 20, left: 10 }
  } = options;

  const pTop = padding.top, pBot = padding.bottom, pLeft = padding.left, pRight = padding.right;
  const plotW = w - pLeft - pRight;
  const plotH = h - pTop - pBot;

  ctx.clearRect(0, 0, w, h);

  // Grid
  if (showGrid) {
    ctx.strokeStyle = 'rgba(39, 39, 42, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pTop + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pLeft, y);
      ctx.lineTo(w - pRight, y);
      ctx.stroke();
    }
  }

  if (data.length < 2) return;

  const minVal = yMin !== null ? yMin : Math.min(...data) * 0.9;
  const maxVal = yMax !== null ? yMax : Math.max(...data) * 1.1;
  const range = maxVal - minVal || 1;

  function getX(i) { return pLeft + (i / (data.length - 1)) * plotW; }
  function getY(v) { return pTop + plotH - ((v - minVal) / range) * plotH; }

  // Fill
  ctx.beginPath();
  ctx.moveTo(getX(0), h - pBot);
  data.forEach((v, i) => ctx.lineTo(getX(i), getY(v)));
  ctx.lineTo(getX(data.length - 1), h - pBot);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, pTop, 0, h - pBot);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((v, i) => {
    if (i === 0) ctx.moveTo(getX(i), getY(v));
    else ctx.lineTo(getX(i), getY(v));
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Dots
  if (showDots) {
    data.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(getX(i), getY(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }
}

// Draw a bar chart
function drawBarChart(canvasId, data, options = {}) {
  const result = getCanvasCtx(canvasId, options.height);
  if (!result) return;
  const { ctx, w, h } = result;
  const {
    colors = ['#38bdf8', '#4ade80'],
    barWidth = 0.6,
    grouped = false,
    labels = [],
    padding = { top: 20, right: 10, bottom: 30, left: 10 }
  } = options;

  const pTop = padding.top, pBot = padding.bottom, pLeft = padding.left, pRight = padding.right;
  const plotW = w - pLeft - pRight;
  const plotH = h - pTop - pBot;

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(39, 39, 42, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pTop + (i / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(pLeft, y);
    ctx.lineTo(w - pRight, y);
    ctx.stroke();
  }

  if (!grouped) {
    const maxVal = Math.max(...data) * 1.1 || 1;
    const slotW = plotW / data.length;
    const bw = slotW * barWidth;

    data.forEach((v, i) => {
      const x = pLeft + i * slotW + (slotW - bw) / 2;
      const barH = (v / maxVal) * plotH;
      const color = typeof colors === 'string' ? colors : colors[i % colors.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, pTop + plotH - barH, bw, barH, [3, 3, 0, 0]);
      ctx.fill();
    });
  } else {
    // Grouped bars: data = [[g1a, g1b], [g2a, g2b], ...]
    const allVals = data.flat();
    const maxVal = Math.max(...allVals) * 1.1 || 1;
    const groupCount = data.length;
    const barsPerGroup = data[0]?.length || 1;
    const slotW = plotW / groupCount;
    const totalBarW = slotW * barWidth;
    const singleBarW = totalBarW / barsPerGroup;

    data.forEach((group, gi) => {
      group.forEach((v, bi) => {
        const x = pLeft + gi * slotW + (slotW - totalBarW) / 2 + bi * singleBarW;
        const barH = (v / maxVal) * plotH;
        ctx.fillStyle = colors[bi % colors.length];
        ctx.beginPath();
        ctx.roundRect(x + 1, pTop + plotH - barH, singleBarW - 2, barH, [3, 3, 0, 0]);
        ctx.fill();
      });
    });

    // Labels
    if (labels.length) {
      ctx.fillStyle = '#71717a';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      labels.forEach((l, i) => {
        const x = pLeft + i * slotW + slotW / 2;
        ctx.fillText(l, x, h - 5);
      });
    }
  }
}

// Draw echogram (heatmap-like)
function drawEchogram(canvasId, options = {}) {
  const result = getCanvasCtx(canvasId, options.height || 200);
  if (!result) return;
  const { ctx, w, h } = result;
  const cols = options.cols || 80;
  const rows = options.rows || 40;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const noise = Math.random();
      const depth = r / rows;
      const signal = Math.exp(-((c - cols * 0.5) ** 2) / (2 * (cols * 0.15) ** 2));
      const val = signal * (1 - depth * 0.6) + noise * 0.15;

      const hue = 200 + val * 40;
      const sat = 70 + val * 30;
      const light = val * 50;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
    }
  }
}

// Draw waveform
function drawWaveform(canvasId, type, options = {}) {
  const result = getCanvasCtx(canvasId, options.height || 120);
  if (!result) return;
  const { ctx, w, h } = result;
  const { color = '#38bdf8', samples = 512, freq = 5, bandwidth = 3 } = options;

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(39, 39, 42, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const data = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const win = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (samples - 1));

    switch (type) {
      case 'pulse':
        data[i] = win * Math.sin(2 * Math.PI * freq * t * 8);
        break;
      case 'lfm': {
        const f0 = freq - bandwidth / 2;
        const f1 = freq + bandwidth / 2;
        const phase = 2 * Math.PI * (f0 * t + 0.5 * (f1 - f0) * t * t) * 8;
        data[i] = win * Math.sin(phase);
        break;
      }
      case 'sweep': {
        const fStart = freq * 0.5;
        const fEnd = freq * 3;
        const ratio = fEnd / Math.max(fStart, 0.01);
        const phase = 2 * Math.PI * fStart * (Math.pow(ratio, t) - 1) / Math.log(ratio);
        data[i] = win * Math.sin(phase);
        break;
      }
      case 'phase': {
        const barker = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
        const ci = Math.floor(t * barker.length) % barker.length;
        data[i] = win * barker[ci] * Math.sin(2 * Math.PI * freq * t * 8);
        break;
      }
    }
  }

  // Draw
  ctx.beginPath();
  for (let i = 0; i < samples; i++) {
    const x = (i / samples) * w;
    const y = h / 2 - data[i] * (h / 2 - 8);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.strokeStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < samples; i++) {
    const x = (i / samples) * w;
    const y = h / 2 - data[i] * (h / 2 - 8);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  return data;
}

// Donut / Pie chart
function drawDonut(canvasId, segments, options = {}) {
  const result = getCanvasCtx(canvasId, options.height || 180);
  if (!result) return;
  const { ctx, w, h } = result;
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) / 2 - 20;
  const inner = radius * 0.6;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let angle = -Math.PI / 2;

  segments.forEach(seg => {
    const sweep = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle, angle + sweep);
    ctx.arc(cx, cy, inner, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep;
  });

  // Center text
  if (options.centerText) {
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.centerText, cx, cy - 6);
    if (options.centerSub) {
      ctx.fillStyle = '#71717a';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(options.centerSub, cx, cy + 12);
    }
  }
}

// ========================================
// INIT CHARTS (page-specific)
// ========================================
function initCharts() {
  // Each page will call its own chart init in inline scripts
  // This function handles resizing
  window.addEventListener('resize', () => {
    if (typeof initPageCharts === 'function') {
      initPageCharts();
    }
  });

  if (typeof initPageCharts === 'function') {
    initPageCharts();
  }
}

// ========================================
// REAL-TIME SIMULATION
// ========================================
function initRealTimeUpdates() {
  // Update stat values with slight randomness for live feel
  setInterval(() => {
    document.querySelectorAll('[data-live]').forEach(el => {
      const base = parseFloat(el.dataset.live);
      const variance = parseFloat(el.dataset.variance || '0.05');
      const decimals = parseInt(el.dataset.decimals || '1');
      const val = base + (Math.random() - 0.5) * 2 * base * variance;
      el.textContent = val.toFixed(decimals);
    });
  }, 2000);
}

// ========================================
// HELPERS
// ========================================
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function generateTimeSeries(count, base, variance) {
  const data = [];
  let val = base;
  for (let i = 0; i < count; i++) {
    val += (Math.random() - 0.5) * variance;
    val = Math.max(base * 0.5, Math.min(base * 1.5, val));
    data.push(val);
  }
  return data;
}
