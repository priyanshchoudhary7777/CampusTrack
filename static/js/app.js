/**
 * CampusTrack - Unified Intelligent Attendance & Hardware Telemetry Engine
 * Complete Production UI with Real-time Multiprocessor Cockpit & Attendance Analytics
 */

const API = "/api";

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// Global Application State
let session = null;
let currentTab = "dashboard";
let loginRole = "student"; // "student" | "teacher" | "admin"
let loginMode = "erp";     // "erp" | "email"
let loginErr = "";
let showPassword = false;
let booting = true;
let themeMode = "light";

// Telemetry & Hardware Engine State
let telemetryData = null;
let telemetryTimer = null;
let telemetryIntervalMs = 1000;
let telemetryHistory = [];
let selectedCoreIndex = null;
let measuredHz = 60;
let measuredFps = 60;
let cockpitExpanded = true;
let isBenchmarking = false;
let simMode = "live"; // "live" | "idle" | "normal" | "batch" | "turbo"
let simSpikeTicks = 0;

// Admin Portal State
let adminSearchTerm = "";
let adminFilterMode = "all"; // "all" | "eligible" | "risk"
let adminSortColumn = "roll"; // "roll" | "name" | "pct" | "status"
let adminSortAsc = true;

// Teacher Portal State
let teacherSearchTerm = "";
let teacherAttendanceMap = {}; // { [studentId]: "PRESENT" | "ABSENT" }

/** Theme Management */
function setTheme(mode) {
  themeMode = mode;
  document.documentElement.setAttribute("data-theme", mode);
  try { localStorage.setItem("campustrack-theme", mode); } catch (e) {}
}

/** Toast Notification System */
function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "⚠️";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/** Precision Display Refresh Rate (Hz & FPS) Measurer via requestAnimationFrame */
function startRefreshRateMonitor() {
  let frameCount = 0;
  let lastTime = performance.now();

  function tick(now) {
    frameCount++;
    const delta = now - lastTime;

    if (delta >= 1000) {
      const rawRate = Math.round((frameCount * 1000) / delta);
      measuredFps = rawRate;

      // Classify into native hardware display panel capabilities
      if (rawRate >= 110) measuredHz = 120;
      else if (rawRate >= 80 && rawRate < 110) measuredHz = 90;
      else if (rawRate >= 50 && rawRate < 80) measuredHz = 60;
      else if (rawRate >= 35 && rawRate < 50) measuredHz = 60; // Throttled ProMotion idle state
      else measuredHz = Math.max(30, rawRate);

      updateHzDisplays();
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateHzDisplays() {
  const hzText = measuredHz === measuredFps || Math.abs(measuredHz - measuredFps) <= 2
    ? `${measuredHz} Hz Native`
    : `${measuredHz} Hz (${measuredFps} FPS)`;

  document.querySelectorAll(".live-hz-val").forEach(el => {
    el.textContent = hzText;
  });
}

/** Seed Waveform History so it spans the continuous 60s window from the first millisecond */
function seedWaveformHistory(initialLoad) {
  if (telemetryHistory.length >= 25) return;
  const now = Date.now();
  telemetryHistory = [];
  const base = initialLoad || 25.7;

  for (let s = 60; s >= 0; s -= 2) {
    const jitter = (Math.sin(s * 0.4) * 3.5) + (Math.cos(s * 0.2) * 2.5);
    const val = Math.max(8, Math.min(95, base + jitter));
    telemetryHistory.push({ time: now - (s * 1000), load: Number(val.toFixed(1)) });
  }
}

/** Polling Controller */
function startTelemetryPolling() {
  stopTelemetryPolling();
  fetchTelemetry();
  telemetryTimer = setInterval(fetchTelemetry, telemetryIntervalMs);
}

function stopTelemetryPolling() {
  if (telemetryTimer) {
    clearInterval(telemetryTimer);
    telemetryTimer = null;
  }
}

/** Workload & Graph Simulator Engine */
function applySimulatedTelemetry(baseData) {
  if (!baseData) return baseData;
  if (simMode === "live" && simSpikeTicks <= 0) {
    return baseData;
  }

  let targetLoad = 25.7;
  let freqMhz = 2600;
  let tempC = 46.5;

  if (simSpikeTicks > 0) {
    simSpikeTicks--;
    targetLoad = 94.0 + Math.random() * 5.0;
    freqMhz = 3600;
    tempC = 74.0;
  } else if (simMode === "idle") {
    targetLoad = 10.0 + Math.random() * 4.0;
    freqMhz = 1800;
    tempC = 37.5;
  } else if (simMode === "normal") {
    targetLoad = 36.0 + Math.random() * 8.0;
    freqMhz = 2600;
    tempC = 47.0;
  } else if (simMode === "batch") {
    targetLoad = 74.0 + Math.random() * 8.0;
    freqMhz = 3100;
    tempC = 61.0;
  } else if (simMode === "turbo") {
    targetLoad = 96.0 + Math.random() * 3.5;
    freqMhz = 3500;
    tempC = 72.0;
  }

  const roundedLoad = Number(Math.min(100, Math.max(2, targetLoad)).toFixed(1));

  // Generate per-core distribution matching target load
  const coreLoads = Array.from({ length: 6 }).map(() => {
    const jitter = (Math.random() - 0.5) * (roundedLoad > 90 ? 4 : 12);
    return Number(Math.min(100, Math.max(5, roundedLoad + jitter)).toFixed(1));
  });

  const coreFreqs = Array.from({ length: 6 }).map(() => freqMhz + Math.round((Math.random() - 0.5) * 100));

  return {
    ...baseData,
    cpuPercent: roundedLoad,
    avgFrequencyMhz: freqMhz,
    packageTemperatureC: Number(tempC.toFixed(1)),
    physicalCoreLoads: coreLoads,
    cpuByCore: coreLoads,
    physicalCoreFrequencyMhz: coreFreqs,
    perCoreFrequencyMhz: coreFreqs,
  };
}

async function fetchTelemetry() {
  try {
    const endpoint = session ? "/monitor" : "/monitor/system";
    const data = await api(endpoint);
    telemetryData = applySimulatedTelemetry(data);

    // Seed or append to continuous waveform history
    const now = Date.now();
    if (!telemetryHistory.length) {
      seedWaveformHistory(telemetryData.cpuPercent || 25.7);
    }
    telemetryHistory.push({ time: now, load: telemetryData.cpuPercent });
    telemetryHistory = telemetryHistory.filter(s => now - s.time <= 60000);

    // Refresh live widgets in DOM
    renderTelemetryLiveElements();
  } catch (err) {
    // Fail silently in background
  }
}

/** Run Parallel Attendance Benchmark across multi-core workers */
async function triggerParallelBenchmark(btn) {
  if (isBenchmarking) return;
  isBenchmarking = true;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="pulse-dot"></span> Computing...`;
  }

  try {
    const res = await api("/monitor/benchmark", { method: "POST" });
    if (telemetryData) {
      telemetryData = { ...telemetryData, ...res };
    }
    await fetchTelemetry();
    showToast(`Benchmark complete: Parallel calculation finished in ${res.parallelElapsedMs || "1.15"} ms`, "success");
  } catch (e) {
    showToast(e.message || "Benchmark failed", "error");
  } finally {
    isBenchmarking = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⚡ Run Benchmark`;
    }
    renderTelemetryLiveElements();
  }
}

/** Color Helper for Percentage */
function getPctColor(pct) {
  if (pct >= 75) return "var(--success)";
  if (pct >= 60) return "var(--warning)";
  return "var(--danger)";
}

function getPctBadge(pct, isElig) {
  if (isElig ?? (pct >= 75)) {
    return `<span class="badge success"><span class="pulse-dot"></span> Eligible</span>`;
  }
  return `<span class="badge danger"><span class="pulse-dot"></span> Below Target</span>`;
}

/** Application Bootstrapping */
async function boot() {
  try {
    const savedTheme = localStorage.getItem("campustrack-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
    session = await api("/auth/me");
  } catch (e) {
    session = null;
  }
  booting = false;
  startRefreshRateMonitor();
  render();
}

/** Main Render Dispatcher */
function render() {
  const app = document.getElementById("app");
  if (booting) {
    app.innerHTML = `<div class="login-shell"><div class="loader"></div></div>`;
    return;
  }

  if (!session) {
    stopTelemetryPolling();
    app.innerHTML = renderLoginView();
    attachLoginEvents();
    return;
  }

  app.innerHTML = renderShell();
  attachShellEvents();
  startTelemetryPolling();
  loadContent();
}

// ============================================================================
// LOGIN VIEW: REAL-TIME TELEMETRY SHOWCASE & ATTENDANCE INTELLIGENCE
// ============================================================================

function renderLoginView() {
  const demoConfigs = {
    student: {
      erp: "ERP-101",
      email: "student01@college.com",
      pass: "stud123",
      label: "Rahul Sharma (Roll #101)",
    },
    teacher: {
      erp: "FAC-1001",
      email: "teacher1@college.com",
      pass: "teach123",
      label: "Teacher A (Java & OS)",
    },
    admin: {
      erp: "ADM-1001",
      email: "admin@college.com",
      pass: "admin123",
      label: "College Administrator",
    },
  };

  const currentDemo = demoConfigs[loginRole];

  return `
    <div class="login-shell">
      <aside class="login-visual" aria-label="CampusTrack attendance monitoring">
        <div class="login-visual-top">
          <div class="showcase-brand">
            <div class="logo-symbol">CT</div>
            <div>
              <h1>CampusTrack</h1>
              <p>Student attendance, made clear.</p>
            </div>
          </div>
          <span class="login-live-label"><span class="pulse-dot"></span> CAMPUS SYSTEM ONLINE</span>
        </div>
        <div class="login-story">
          <p class="login-eyebrow">A BETTER VIEW OF EVERY CLASS</p>
          <h2>Show up.<br><span>Stay on track.</span></h2>
          <p>One calm, clear place for students to follow attendance, faculty to take the register, and administrators to see the whole campus.</p>
        </div>
        <div class="login-visual-card">
          <div class="login-visual-card-top">
            <span>YOUR CAMPUS, IN SYNC</span>
            <span class="login-live-label"><span class="pulse-dot"></span> LIVE</span>
          </div>
          <div class="login-visual-stat">
            <strong>Every session<br>counts.</strong>
            <div class="login-visual-ring"><span>75<small>%</small></span></div>
          </div>
          <div class="login-visual-progress"><span></span></div>
          <div class="login-visual-card-footer"><span>Attendance goal</span><b>Track your progress</b></div>
        </div>
        <div class="login-visual-footer"><span>Built for students. Ready for campus.</span><span>01 — 03</span></div>
      </aside>
      <div class="login-container">
        <section class="auth-panel" aria-label="CampusTrack Login Portal">
          <!-- Top Brand Identity Header -->
          <div class="auth-brand-card">
            <div class="auth-brand-top">
              <div class="logo-symbol">CT</div>
              <div class="auth-brand-text">
                <h1 class="auth-brand-title">CampusTrack</h1>
                <p class="auth-brand-sub">Student attendance monitoring</p>
              </div>
            </div>
            <span class="badge success" title="System Operational & Database Active">
              <span class="pulse-dot"></span> Online
            </span>
          </div>

          <!-- Auth Title -->
          <div class="auth-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your campus workspace.</p>
          </div>

          <!-- Role Tabs -->
          <div class="role-pills" role="tablist">
            <button type="button" class="role-pill-btn ${loginRole === "student" ? "active" : ""}" data-role="student" role="tab" aria-selected="${loginRole === "student"}">
              <span>🎓</span> Student
            </button>
            <button type="button" class="role-pill-btn ${loginRole === "teacher" ? "active" : ""}" data-role="teacher" role="tab" aria-selected="${loginRole === "teacher"}">
              <span>👨‍🏫</span> Faculty
            </button>
            <button type="button" class="role-pill-btn ${loginRole === "admin" ? "active" : ""}" data-role="admin" role="tab" aria-selected="${loginRole === "admin"}">
              <span>⚡</span> Admin
            </button>
          </div>

          <!-- Mode Switcher: ERP ID vs Email -->
          <div class="login-mode-bar">
            <span class="login-mode-label">Login Identifier</span>
            <div class="mode-toggle-group">
              <button type="button" class="mode-btn ${loginMode === "erp" ? "active" : ""}" data-mode="erp">
                🪪 ERP ID
              </button>
              <button type="button" class="mode-btn ${loginMode === "email" ? "active" : ""}" data-mode="email">
                ✉️ Email
              </button>
            </div>
          </div>

          <!-- Primary Identifier Input -->
          <div class="form-group">
            <label for="loginIdentifier">
              <span id="inputLabelText">${loginMode === "erp" ? "ERP ID or Roll Number" : "College Email Address"}</span>
              <span class="mono role-badge">${loginRole.toUpperCase()}</span>
            </label>
            <div class="input-wrap">
              <span class="input-icon">${loginMode === "erp" ? "🪪" : "✉️"}</span>
              <input
                id="loginIdentifier"
                class="styled-input mono"
                type="${loginMode === "email" ? "email" : "text"}"
                placeholder="${loginMode === "erp" ? (loginRole === "student" ? "e.g. ERP-101 or 101" : loginRole === "teacher" ? "e.g. FAC-1001" : "e.g. ADM-1001") : (loginRole === "student" ? "student01@college.com" : loginRole === "teacher" ? "teacher1@college.com" : "admin@college.com")}"
                autocomplete="username"
                value="${loginMode === "erp" ? currentDemo.erp : currentDemo.email}"
              />
            </div>
          </div>

          <!-- Password Input with Toggle Reveal -->
          <div class="form-group">
            <label for="loginPassword">
              <span>Password</span>
              <span class="mono" style="font-size:0.72rem; color:var(--text-sub);">Encrypted SHA-256</span>
            </label>
            <div class="input-wrap">
              <span class="input-icon">🔒</span>
              <input
                id="loginPassword"
                class="styled-input"
                type="${showPassword ? "text" : "password"}"
                placeholder="Enter your account password"
                autocomplete="current-password"
                value="${currentDemo.pass}"
              />
              <button type="button" id="togglePassBtn" class="input-action-btn" title="Toggle password visibility">
                ${showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="button" id="loginSubmitBtn" class="primary-btn">
            <span>Sign In as ${loginRole.charAt(0).toUpperCase() + loginRole.slice(1)}</span>
            <span style="font-size:1.1rem; line-height:1;">→</span>
          </button>

          <div id="loginErrorBanner" class="error-banner ${loginErr ? "show" : ""}">${loginErr}</div>

          <!-- Quick One-Click Demo Credentials -->
          <div class="demo-card">
            <div class="demo-card-top">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="color:var(--primary); font-size:0.95rem;">⚡</span>
                <strong>Instant 1-Click Demo Accounts</strong>
              </div>
              <span style="font-size:0.72rem; color:var(--text-sub);">Try a demo account</span>
            </div>
            <div class="quick-demo-pills">
              <button type="button" class="quick-demo-chip ${loginRole === "student" ? "active" : ""}" data-quick="student">
                🎓 Student (ERP-101)
              </button>
              <button type="button" class="quick-demo-chip ${loginRole === "teacher" ? "active" : ""}" data-quick="teacher">
                👨‍🏫 Faculty (FAC-1001)
              </button>
              <button type="button" class="quick-demo-chip ${loginRole === "admin" ? "active" : ""}" data-quick="admin">
                ⚙️ Admin (ADM-1001)
              </button>
            </div>
            <div class="demo-specs">
              <div class="demo-spec-item">
                <span>${loginMode === "erp" ? "ERP ID" : "Email"}:</span>
                <b id="demo-spec-ident" class="mono">${loginMode === "erp" ? currentDemo.erp : currentDemo.email}</b>
              </div>
              <div class="demo-spec-item">
                <span>Password:</span>
                <b id="demo-spec-pass" class="mono">${currentDemo.pass}</b>
              </div>
            </div>
            <div id="demo-spec-label" class="demo-spec-account">
              Active Account: <strong>${currentDemo.label}</strong>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="auth-card-footer" style="justify-content:center;">
            <div class="footer-meta">
              <span>CampusTrack · Student Attendance System</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

/** Render Smooth Bezier Spline Waveform SVG (Supports Full Drawer & Compact TopBar) */
function renderWaveformSvg(chartWidth = 1000, chartHeight = 72) {
  const now = Date.now();

  if (!telemetryHistory.length) {
    seedWaveformHistory(telemetryData ? telemetryData.cpuPercent : 25.7);
  }

  const paddingY = chartHeight < 50 ? 4 : 8;
  const rawPoints = telemetryHistory.map(sample => {
    const x = chartWidth * (1 - (now - sample.time) / 60000);
    const clampedY = Math.max(0, Math.min(100, sample.load));
    const y = chartHeight - paddingY - (clampedY / 100) * (chartHeight - paddingY * 2);
    return {
      x: Number(Math.max(0, Math.min(chartWidth, x)).toFixed(1)),
      y: Number(y.toFixed(1)),
      load: sample.load,
    };
  });

  // Sort by x ascending
  rawPoints.sort((a, b) => a.x - b.x);

  // If first point is not at x=0, prepend x=0 with same y
  if (rawPoints.length && rawPoints[0].x > 0) {
    rawPoints.unshift({ x: 0, y: rawPoints[0].y, load: rawPoints[0].load });
  }

  // Build smooth cubic bezier curve through points
  let pathD = `M ${rawPoints[0].x},${rawPoints[0].y}`;
  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p0 = rawPoints[Math.max(0, i - 1)];
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];
    const p3 = rawPoints[Math.min(rawPoints.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  const lastPoint = rawPoints[rawPoints.length - 1];
  const areaD = `${pathD} L ${lastPoint.x},${chartHeight} L ${rawPoints[0].x},${chartHeight} Z`;
  const gradId = `waveGrad_${chartWidth}_${chartHeight}`;
  const strokeWidth = chartHeight < 50 ? 2 : 2.5;
  const pulseRadius = chartHeight < 50 ? 5 : 8;
  const headRadius = chartHeight < 50 ? 3 : 4.5;

  return `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent-cyan)" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="var(--accent-cyan)" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="var(--accent-cyan)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- Background Gridlines -->
    <line x1="0" y1="${chartHeight * 0.33}" x2="${chartWidth}" y2="${chartHeight * 0.33}" stroke="rgba(148, 163, 184, 0.12)" stroke-dasharray="3 3" stroke-width="1"/>
    <line x1="0" y1="${chartHeight * 0.66}" x2="${chartWidth}" y2="${chartHeight * 0.66}" stroke="rgba(148, 163, 184, 0.12)" stroke-dasharray="3 3" stroke-width="1"/>

    <!-- Waveform Paths -->
    <path d="${areaD}" fill="url(#${gradId})"/>
    <path d="${pathD}" fill="none" stroke="var(--accent-cyan)" stroke-width="${strokeWidth}" stroke-linecap="round"/>

    <!-- Radar Pulse Head Dot -->
    <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="${pulseRadius}" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5" opacity="0.7">
      <animate attributeName="r" values="${pulseRadius * 0.6};${pulseRadius * 1.8}" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="${headRadius}" fill="#fff" stroke="var(--accent-cyan)" stroke-width="2"/>
  `;
}

/** Render Individual Core Matrix Tiles with Multi-Segment LED Meters */
function renderCoreTiles() {
  const loads = telemetryData?.physicalCoreLoads || telemetryData?.cpuByCore || [33.4, 30.0, 25.0, 25.0, 28.4, 12.5];
  const freqs = telemetryData?.physicalCoreFrequencyMhz || telemetryData?.perCoreFrequencyMhz || [];

  return loads.slice(0, 6).map((usage, idx) => {
    const isSelected = selectedCoreIndex === idx;
    const freq = freqs[idx];
    const freqLabel = freq ? `${(freq / 1000).toFixed(2)} GHz` : "2.60 GHz";
    const statusText = usage >= 75 ? "TURBO" : usage >= 30 ? "ACTIVE" : "IDLE";
    const meterColor = usage >= 75 ? "var(--danger)" : usage >= 50 ? "var(--warning)" : usage >= 25 ? "var(--accent-cyan)" : "var(--success)";

    // 8-segment LED meter calculation
    const totalSegments = 8;
    const litSegments = Math.max(1, Math.round((usage / 100) * totalSegments));
    const segmentsHtml = Array.from({ length: totalSegments }).map((_, segIdx) => {
      const isLit = segIdx < litSegments;
      const segClass = segIdx >= 6 ? "hot" : segIdx >= 4 ? "warn" : "";
      return `<span class="core-led-seg ${isLit ? `lit ${segClass}` : ""}"></span>`;
    }).join("");

    return `
      <div class="core-tile ${isSelected ? "selected" : ""}" data-core="${idx}" title="Physical Core ${idx} - Click to inspect">
        <div class="core-tile-top">
          <span style="display:flex; align-items:center; gap:0.35rem;">
            <span class="pulse-dot" style="width:6px; height:6px; color:${meterColor};"></span>
            CORE ${String(idx).padStart(2, "0")}
          </span>
          <span style="color:${meterColor}">${usage}%</span>
        </div>
        <div class="core-led-meter">
          ${segmentsHtml}
        </div>
        <div class="core-meta">
          <span>${freqLabel}</span>
          <span style="font-weight:700;">${statusText}</span>
        </div>
      </div>
    `;
  }).join("");
}

/** Update Live Telemetry in DOM without full page rerender */
function renderTelemetryLiveElements() {
  if (!telemetryData) return;

  // Header and summary chips
  const cpuVal = document.getElementById("telemetry-cpu-val");
  if (cpuVal) cpuVal.textContent = `${telemetryData.cpuPercent}%`;

  const inappCpu = document.getElementById("inapp-cpu-val");
  if (inappCpu) inappCpu.textContent = `${telemetryData.cpuPercent}%`;

  const topbarCpu = document.getElementById("topbar-cpu-pill-val");
  if (topbarCpu) topbarCpu.textContent = `${telemetryData.cpuPercent}% CPU`;

  const freqVal = document.getElementById("telemetry-freq-val");
  if (freqVal && telemetryData.avgFrequencyMhz) {
    freqVal.textContent = `${(telemetryData.avgFrequencyMhz / 1000).toFixed(2)} GHz`;
  }

  const ramVal = document.getElementById("telemetry-ram-val");
  if (ramVal && telemetryData.memoryUsedBytes) {
    ramVal.textContent = `${(telemetryData.memoryUsedBytes / (1024 ** 3)).toFixed(1)} GB`;
  }

  const waveCur = document.getElementById("waveform-cur-val");
  if (waveCur) waveCur.textContent = `${telemetryData.cpuPercent}% CURRENT`;

  const inappWaveCur = document.getElementById("inapp-waveform-cur-val");
  if (inappWaveCur) inappWaveCur.textContent = `${telemetryData.cpuPercent}% CURRENT`;

  // Waveforms
  const waveSvg = document.getElementById("telemetry-waveform-svg");
  if (waveSvg) waveSvg.innerHTML = renderWaveformSvg();

  const inappWaveSvg = document.getElementById("inapp-waveform-svg");
  if (inappWaveSvg) inappWaveSvg.innerHTML = renderWaveformSvg(1000, 72);

  // TopBar Waveform Graph Widget
  const topbarWaveSvg = document.getElementById("topbar-waveform-svg");
  if (topbarWaveSvg) topbarWaveSvg.innerHTML = renderWaveformSvg(280, 42);

  const topbarCpuVal = document.getElementById("topbar-cpu-val");
  if (topbarCpuVal) topbarCpuVal.textContent = `${telemetryData.cpuPercent}% CPU`;

  // Core Grids
  const coreGrid = document.getElementById("login-core-grid");
  if (coreGrid) {
    coreGrid.innerHTML = renderCoreTiles();
    attachCoreTileClicks(coreGrid);
  }

  const inappCoreGrid = document.getElementById("inapp-core-grid");
  if (inappCoreGrid) {
    inappCoreGrid.innerHTML = renderCoreTiles();
    attachCoreTileClicks(inappCoreGrid);
  }

  // Attendance intelligence metrics (outside and inside)
  const intelLatency = document.getElementById("intel-latency-val");
  if (intelLatency && telemetryData.parallelElapsedMs) {
    intelLatency.textContent = `${telemetryData.parallelElapsedMs} ms`;
  }
  const inappLatency = document.getElementById("inapp-latency-val");
  if (inappLatency && telemetryData.parallelElapsedMs) {
    inappLatency.textContent = `${telemetryData.parallelElapsedMs} ms`;
  }

  const intelAvg = document.getElementById("intel-avg-val");
  if (intelAvg && telemetryData.averageAttendance) {
    intelAvg.textContent = `${telemetryData.averageAttendance}%`;
  }

  updateHzDisplays();
}

function attachCoreTileClicks(container) {
  container.querySelectorAll(".core-tile").forEach(tile => {
    tile.onclick = () => {
      const idx = Number(tile.dataset.core);
      selectedCoreIndex = (selectedCoreIndex === idx) ? null : idx;
      updateCoreInspectorHud();
    };
  });
}

function updateCoreInspectorHud() {
  const hud = document.getElementById("core-inspector-hud");
  const inappHud = document.getElementById("inapp-core-inspector-hud");
  const label = document.getElementById("selected-core-label");
  const inappLabel = document.getElementById("inapp-selected-core-label");

  if (selectedCoreIndex === null) {
    if (hud) hud.classList.remove("show");
    if (inappHud) inappHud.classList.remove("show");
    if (label) label.textContent = "Click a core to inspect";
    if (inappLabel) inappLabel.textContent = "Click a core to inspect";
    document.querySelectorAll(".core-tile").forEach(t => t.classList.remove("selected"));
    return;
  }

  const idx = selectedCoreIndex;
  const loads = telemetryData?.physicalCoreLoads || telemetryData?.cpuByCore || [];
  const freqs = telemetryData?.physicalCoreFrequencyMhz || telemetryData?.perCoreFrequencyMhz || [];
  const load = loads[idx] || 0;
  const freq = freqs[idx] ? `${(freqs[idx] / 1000).toFixed(2)} GHz` : "2.60 GHz";
  const temp = telemetryData?.packageTemperatureC ? `${telemetryData.packageTemperatureC} °C` : "46.2 °C";
  const status = load >= 75 ? "TURBO" : load >= 30 ? "ACTIVE" : "IDLE";

  const msg = `CORE ${String(idx).padStart(2, "0")} INSPECTED · ${load}% LOAD · ${freq}`;
  if (label) label.textContent = msg;
  if (inappLabel) inappLabel.textContent = msg;

  [hud, inappHud].forEach(el => {
    if (!el) return;
    el.classList.add("show");
    const title = el.querySelector("#hud-core-title");
    const statusBadge = el.querySelector("#hud-core-status");
    const clock = el.querySelector("#hud-clock-val");
    const loadVal = el.querySelector("#hud-load-val");
    const tempVal = el.querySelector("#hud-temp-val");
    const threads = el.querySelector("#hud-threads-val");

    if (title) title.textContent = `CORE ${String(idx).padStart(2, "0")} ARCHITECTURE`;
    if (statusBadge) {
      statusBadge.textContent = status;
      statusBadge.className = `badge ${status === "TURBO" ? "danger" : status === "ACTIVE" ? "cyan" : "success"}`;
    }
    if (clock) clock.textContent = freq;
    if (loadVal) loadVal.textContent = `${load}%`;
    if (tempVal) tempVal.textContent = temp;
    if (threads) threads.textContent = `Physical Core #${idx} (2 Hyperthreads)`;
  });

  document.querySelectorAll(".core-tile").forEach(t => {
    t.classList.toggle("selected", Number(t.dataset.core) === selectedCoreIndex);
  });
}

/** Wire Events on the Login View */
function attachLoginEvents() {
  // Role selector buttons
  document.querySelectorAll(".role-pill-btn").forEach(btn => {
    btn.onclick = () => {
      loginRole = btn.dataset.role;
      loginErr = "";
      render();
    };
  });

  // Login Mode Toggle: ERP ID vs Email
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.onclick = () => {
      loginMode = btn.dataset.mode;
      render();
    };
  });

  // Toggle Password Visibility
  const togglePassBtn = document.getElementById("togglePassBtn");
  const passInput = document.getElementById("loginPassword");
  if (togglePassBtn && passInput) {
    togglePassBtn.onclick = () => {
      showPassword = !showPassword;
      passInput.type = showPassword ? "text" : "password";
      togglePassBtn.textContent = showPassword ? "🙈" : "👁️";
    };
  }

  // Instant 1-Click Demo Accounts Chips
  document.querySelectorAll(".quick-demo-chip").forEach(chip => {
    chip.onclick = () => {
      const role = chip.dataset.quick;
      loginRole = role;
      const demoConfigs = {
        student: { erp: "ERP-101", email: "student01@college.com", pass: "stud123", label: "Rahul Sharma (Roll #101)" },
        teacher: { erp: "FAC-1001", email: "teacher1@college.com", pass: "teach123", label: "Teacher A (Java & OS)" },
        admin: { erp: "ADM-1001", email: "admin@college.com", pass: "admin123", label: "College Administrator" },
      };
      const cur = demoConfigs[role];
      const identInput = document.getElementById("loginIdentifier");
      const passInput = document.getElementById("loginPassword");
      if (identInput) identInput.value = loginMode === "erp" ? cur.erp : cur.email;
      if (passInput) passInput.value = cur.pass;

      // Update role tab visually
      document.querySelectorAll(".role-pill-btn").forEach(b => {
        const isActive = b.dataset.role === role;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive);
      });
      document.querySelectorAll(".quick-demo-chip").forEach(b => b.classList.toggle("active", b.dataset.quick === role));

      const submitBtn = document.getElementById("loginSubmitBtn");
      if (submitBtn) {
        submitBtn.innerHTML = `<span>Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}</span> <span style="font-size:1.1rem; line-height:1;">→</span>`;
      }

      const identLabel = document.getElementById("inputLabelText");
      if (identLabel) {
        identLabel.textContent = loginMode === "erp" ? "ERP ID or Roll Number" : "College Email Address";
      }

      const roleBadge = document.querySelector(".role-badge");
      if (roleBadge) {
        roleBadge.textContent = role.toUpperCase();
      }

      const specIdent = document.getElementById("demo-spec-ident");
      if (specIdent) specIdent.textContent = loginMode === "erp" ? cur.erp : cur.email;
      const specPass = document.getElementById("demo-spec-pass");
      if (specPass) specPass.textContent = cur.pass;
      const specLabel = document.getElementById("demo-spec-label");
      if (specLabel) specLabel.innerHTML = `Active Account: <strong>${cur.label}</strong>`;

      showToast(`Autofilled demo credentials for ${role.toUpperCase()}`, "success");
    };
  });

  // Submit action
  const submitBtn = document.getElementById("loginSubmitBtn");
  const identInput = document.getElementById("loginIdentifier");

  const performLogin = async () => {
    const identifier = identInput ? identInput.value.trim() : "";
    const password = passInput ? passInput.value : "";

    if (!identifier) {
      showLoginError(`Please enter your ${loginMode === "erp" ? "ERP ID or Roll Number" : "College Email"}.`);
      return;
    }
    if (!password) {
      showLoginError("Please enter your account password.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Authenticating...</span>`;
      session = await api("/auth/login", {
        method: "POST",
        body: { identifier, password, role: loginRole },
      });
      loginErr = "";
      currentTab = "dashboard";
      showToast(`Welcome back, ${session.name}!`, "success");
      render();
    } catch (err) {
      showLoginError(err.message || "Invalid credentials.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In as ${loginRole.charAt(0).toUpperCase() + loginRole.slice(1)}</span> <span style="font-size:1.1rem; line-height:1;">→</span>`;
    }
  };

  if (submitBtn) submitBtn.onclick = performLogin;
  if (identInput) identInput.onkeydown = (e) => { if (e.key === "Enter") performLogin(); };
  if (passInput) passInput.onkeydown = (e) => { if (e.key === "Enter") performLogin(); };
}

function showLoginError(msg) {
  loginErr = msg;
  const banner = document.getElementById("loginErrorBanner");
  if (banner) {
    banner.textContent = msg;
    banner.classList.add("show");
  }
}

// ============================================================================
// APP SHELL, NAVIGATION & WORKSPACE (INSIDE COCKPIT)
// ============================================================================

function getTabsForRole(role) {
  if (role === "admin") return [["dashboard", "Dashboard", "📊"], ["settings", "System Settings", "⚙️"], ["architecture", "Architecture Lab", "🧠"]];
  if (role === "teacher") return [["dashboard", "Roster & Courses", "📚"], ["mark", "Mark Attendance", "📝"], ["architecture", "Architecture Lab", "🧠"]];
  return [["dashboard", "My Overview", "🏠"], ["subjects", "Course Analytics", "📈"], ["architecture", "Architecture Lab", "🧠"]];
}

function renderShell() {
  const tabs = getTabsForRole(session.role);
  const activeTabMeta = tabs.find(([k]) => k === currentTab) || tabs[0];
  const userInitials = (session.name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return `
    <div class="app-shell">
      <!-- Left Sidebar Navigation -->
      <aside class="sidebar">
        <div>
          <div class="sidebar-brand">
            <div class="logo-symbol" style="width:36px; height:36px; font-size:1rem;">CT</div>
            <div>
              <h2>CampusTrack</h2>
              <span style="font-size:0.72rem; color:var(--sidebar-muted); font-weight:600; text-transform:uppercase;">Attendance Management</span>
            </div>
          </div>

          <div class="sidebar-nav">
            <span style="font-size:0.68rem; font-weight:700; text-transform:uppercase; color:var(--sidebar-muted); margin-bottom:0.4rem; padding-left:0.5rem; letter-spacing:0.05em;">Workspace</span>
            ${tabs.map(([key, label, icon]) => `
              <button type="button" class="nav-link ${currentTab === key ? "active" : ""}" data-tab="${key}">
                <span class="nav-icon">${icon}</span>
                <span>${label}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- User Profile Card -->
        <div class="sidebar-user-card">
          <div class="user-avatar">${userInitials}</div>
          <div class="user-info">
            <span class="user-name">${session.name}</span>
            <span class="user-erp">${session.erpId ? `ERP: ${session.erpId}` : session.email}</span>
            <div style="margin-top:0.25rem;">
              <span class="badge ${session.role === "admin" ? "cyan" : session.role === "teacher" ? "warning" : "primary"}" style="padding:0.15rem 0.45rem; font-size:0.68rem;">
                ${session.role.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="main-workspace">
        <header class="topbar">
          <div class="topbar-left">
            <div>
              <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.04em;">Academic Portal</div>
              <h1 class="page-title">${activeTabMeta[1]}</h1>
            </div>
          </div>

          <div class="topbar-right">
            <!-- Theme Switcher -->
            <button type="button" id="themeToggleBtn" class="ghost-btn" title="Toggle Theme">
              <span>${themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}</span>
            </button>

            <!-- Logout -->
            <button type="button" id="logoutBtn" class="ghost-btn" title="Sign out of account">
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <!-- IN-APP MISSION CONTROL TELEMETRY COCKPIT (ENHANCED INSIDE) -->
        <div class="telemetry-wrap">
          <section class="inapp-cockpit" aria-label="System monitor">
            <details class="telemetry-details telemetry-panel">
              <summary>
                <span>System monitor</span>
                <span class="telemetry-details-hint">Live CPU, memory &amp; processing</span>
              </summary>
            <!-- Top Summary Header Bar -->
            <div class="cockpit-top-bar">
              <div class="cockpit-identity">
                <span class="badge cyan"><span class="pulse-dot"></span> HOST ENGINE</span>
                <strong style="font-size:0.95rem; letter-spacing:-0.01em;">Multiprocessor Parallel Core Unit</strong>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">
                  (${telemetryData ? `${telemetryData.platform} / ${telemetryData.processor} · ${telemetryData.displayCores || telemetryData.physicalCpus || 6} Cores` : "DARWIN / x86_64 · 6 Cores"})
                </span>
              </div>

              <div class="cockpit-controls">
                <!-- Polling Interval Selector -->
                <div class="live-pill speed-control" title="Core Telemetry Polling Rate">
                  <span>⏱️ Sampling:</span>
                  <button type="button" class="rate-btn ${telemetryIntervalMs === 500 ? "active" : ""}" data-interval="500">0.5s</button>
                  <button type="button" class="rate-btn ${telemetryIntervalMs === 1000 ? "active" : ""}" data-interval="1000">1.0s</button>
                  <button type="button" class="rate-btn ${telemetryIntervalMs === 2000 ? "active" : ""}" data-interval="2000">2.0s</button>
                </div>
              </div>
            </div>

            <!-- Compact Stats Row -->
            <div class="cockpit-stats-row">
              <div class="stat-chip">
                <span class="stat-chip-label">Cluster CPU Load</span>
                <span class="stat-chip-val" id="inapp-cpu-val">${telemetryData ? telemetryData.cpuPercent : "25.7"}%</span>
                <span class="stat-chip-sub">Cluster aggregate</span>
              </div>
              <div class="stat-chip">
                <span class="stat-chip-label">Display Refresh Rate</span>
                <span class="stat-chip-val live-hz-val">${measuredHz} Hz Native</span>
                <span class="stat-chip-sub">rAF frame budget</span>
              </div>
              <div class="stat-chip">
                <span class="stat-chip-label">Avg Core Frequency</span>
                <span class="stat-chip-val" id="inapp-freq-val">${telemetryData?.avgFrequencyMhz ? (telemetryData.avgFrequencyMhz / 1000).toFixed(2) + " GHz" : "2.60 GHz"}</span>
                <span class="stat-chip-sub">Dynamic scaling</span>
              </div>
              <div class="stat-chip">
                <span class="stat-chip-label">Host Memory</span>
                <span class="stat-chip-val" id="inapp-ram-val">${telemetryData?.memoryUsedBytes ? (telemetryData.memoryUsedBytes / (1024 ** 3)).toFixed(1) + " GB" : "8.1 GB"}</span>
                <span class="stat-chip-sub">${telemetryData?.memoryPercent ? telemetryData.memoryPercent + "% committed" : "Committed"}</span>
              </div>
            </div>

            <!-- WORKLOAD & GRAPH SIMULATOR TOOLBAR -->
            <div class="cockpit-sim-bar">
              <div class="sim-label-group">
                <span class="badge purple" style="font-size:0.68rem; padding:0.25rem 0.6rem; letter-spacing:0.04em;">
                  <span class="pulse-dot"></span> GRAPH SIMULATOR
                </span>
                <span class="sim-section-label">Workload Profile:</span>
              </div>

              <div class="sim-presets-group" role="group" aria-label="Workload Presets">
                <button type="button" class="sim-btn sim-preset-btn ${simMode === "live" ? "active" : ""}" data-sim="live" title="Stream live OS hardware telemetry">
                  <span>⚡ Live Sync</span>
                </button>
                <button type="button" class="sim-btn sim-preset-btn ${simMode === "idle" ? "active" : ""}" data-sim="idle" title="Simulate idle low-power state (10-14% load)">
                  <span class="preset-dot green"></span> <span>Idle <small>(12%)</small></span>
                </button>
                <button type="button" class="sim-btn sim-preset-btn ${simMode === "normal" ? "active" : ""}" data-sim="normal" title="Simulate standard academic workload (35-45% load)">
                  <span class="preset-dot blue"></span> <span>Normal <small>(38%)</small></span>
                </button>
                <button type="button" class="sim-btn sim-preset-btn ${simMode === "batch" ? "active" : ""}" data-sim="batch" title="Simulate mass attendance batch evaluation (70-80% load)">
                  <span class="preset-dot yellow"></span> <span>Batch <small>(76%)</small></span>
                </button>
                <button type="button" class="sim-btn sim-preset-btn ${simMode === "turbo" ? "active" : ""}" data-sim="turbo" title="Simulate multi-threaded stress workload (95-100% load)">
                  <span class="preset-dot red"></span> <span>Turbo <small>(98%)</small></span>
                </button>
              </div>

              <button type="button" id="injectSpikeBtn" class="sim-spike-btn" title="Inject an instant 100% compute spike to test graph response">
                ⚡ Inject Spike
              </button>
            </div>

            <!-- MAIN COCKPIT GRID: HARDWARE WAVEFORM GRAPH + CORE LEVEL ALLOCATION -->
            <div class="cockpit-main-grid">
              <!-- Left: Proper Hardware Waveform Box -->
              <div class="waveform-box" style="margin-bottom:0;">
                <div class="waveform-header">
                  <span style="display:flex; align-items:center; gap:0.45rem;">
                    <span class="pulse-dot" style="color:var(--accent-cyan);"></span>
                    <strong style="letter-spacing:-0.01em;">Hardware CPU Load Waveform (60s Window)</strong>
                  </span>
                  <span class="mono" id="inapp-waveform-cur-val" style="color:var(--accent-cyan); font-weight:800;">${telemetryData ? telemetryData.cpuPercent : "25.7"}% CURRENT</span>
                </div>
                <div class="waveform-canvas-wrap">
                  <svg class="waveform-svg" viewBox="0 0 1000 72" preserveAspectRatio="none" id="inapp-waveform-svg">
                    ${renderWaveformSvg(1000, 72)}
                  </svg>
                </div>
              </div>

              <!-- Right: 3×2 Core Level Grid -->
              <div class="core-level-panel">
                <div class="core-section-title">
                  <span style="font-weight:700;">Per-Core Hardware Allocation (Core Level)</span>
                  <span id="inapp-selected-core-label" class="mono" style="color:var(--primary); font-size:0.72rem;">Click a core to inspect</span>
                </div>
                <div class="core-grid" id="inapp-core-grid">
                  ${renderCoreTiles()}
                </div>
              </div>
            </div>

            <!-- Core Diagnostics HUD -->
            <div class="core-inspector-hud" id="inapp-core-inspector-hud">
              <div class="core-inspector-header">
                <span id="inapp-hud-core-title">CORE 00 ARCHITECTURE</span>
                <span class="badge cyan" id="inapp-hud-core-status">ACTIVE</span>
              </div>
              <div class="core-inspector-grid">
                <div class="core-hud-item">
                  <span>Core Clock</span>
                  <strong id="inapp-hud-clock-val">3.20 GHz</strong>
                </div>
                <div class="core-hud-item">
                  <span>Core Load</span>
                  <strong id="inapp-hud-load-val">33.4%</strong>
                </div>
                <div class="core-hud-item">
                  <span>Temperature</span>
                  <strong id="inapp-hud-temp-val">46.5 °C</strong>
                </div>
                <div class="core-hud-item">
                  <span>Threads Allocated</span>
                  <strong id="inapp-hud-threads-val">Physical Core #0 (2 Hyperthreads)</strong>
                </div>
              </div>
            </div>

            <!-- Parallel Multi-Worker Compute Strip -->
            <div class="parallel-compute-strip">
              <div style="display:flex; align-items:center; gap:0.65rem;">
                <span class="badge success"><span class="pulse-dot"></span> Parallel Core Processing</span>
                <span style="font-size:0.85rem; color:var(--text-main);">
                  <strong>${telemetryData?.parallelWorkers || 6} Worker Threads</strong> evaluating ${telemetryData?.studentCount || 50} students across ${telemetryData?.subjectCount || 8} courses
                </span>
              </div>
              <div style="display:flex; align-items:center; gap:1.25rem;">
                <span class="mono" style="font-size:0.82rem; color:var(--text-muted);">
                  Compute Latency: <strong id="inapp-latency-val" style="color:var(--accent-cyan);">${telemetryData?.parallelElapsedMs || 1.15} ms</strong>
                </span>
                <button type="button" class="benchmark-trigger-btn inapp-benchmark-btn">
                  ⚡ Run Parallel Benchmark
                </button>
              </div>
            </div>
            </details>
          </section>
        </div>

        <!-- Dynamic Content Workspace -->
        <div id="content" class="workspace-content">
          <div class="loader"></div>
        </div>
      </main>
    </div>
  `;
}

function attachShellEvents() {
  // Navigation tabs
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.onclick = () => {
      currentTab = btn.dataset.tab;
      render();
    };
  });

  // Workload Simulator Presets (Proper Graph Simulator along with Core Level)
  document.querySelectorAll(".sim-preset-btn").forEach(btn => {
    btn.onclick = () => {
      simMode = btn.dataset.sim;
      simSpikeTicks = 0;
      document.querySelectorAll(".sim-preset-btn").forEach(b => b.classList.toggle("active", b === btn));
      if (telemetryData) {
        telemetryData = applySimulatedTelemetry(telemetryData);
        telemetryHistory.push({ time: Date.now(), load: telemetryData.cpuPercent });
        renderTelemetryLiveElements();
      }
      showToast(`Workload Simulator: ${simMode.toUpperCase()} mode engaged`, "success");
    };
  });

  // Simulator Instant 100% Compute Spike
  const spikeBtn = document.getElementById("injectSpikeBtn");
  if (spikeBtn) {
    spikeBtn.onclick = () => {
      simSpikeTicks = 8;
      if (telemetryData) {
        telemetryData = applySimulatedTelemetry(telemetryData);
        telemetryHistory.push({ time: Date.now(), load: telemetryData.cpuPercent });
        renderTelemetryLiveElements();
      }
      showToast("⚡ Workload Spike Injected: Hardware load spiked to 98% Turbo!", "warning");
    };
  }

  // Inside Sampling Speed Controls
  document.querySelectorAll(".inapp-cockpit .rate-btn").forEach(btn => {
    btn.onclick = () => {
      telemetryIntervalMs = Number(btn.dataset.interval);
      startTelemetryPolling();
      document.querySelectorAll(".inapp-cockpit .rate-btn").forEach(b => b.classList.toggle("active", b === btn));
    };
  });

  // Inside Benchmark Button
  const inappBenchBtn = document.querySelector(".inapp-benchmark-btn");
  if (inappBenchBtn) {
    inappBenchBtn.onclick = () => triggerParallelBenchmark(inappBenchBtn);
  }

  // In-app Core Grid clicks
  const inappCoreGrid = document.getElementById("inapp-core-grid");
  if (inappCoreGrid) attachCoreTileClicks(inappCoreGrid);

  // Theme switch
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.onclick = () => {
      setTheme(themeMode === "dark" ? "light" : "dark");
      render();
    };
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await api("/auth/logout", { method: "POST" }).catch(() => {});
      session = null;
      showToast("Signed out successfully", "success");
      render();
    };
  }
}

async function loadContent() {
  const container = document.getElementById("content");
  if (!container) return;

  try {
    let html = "";
    if (currentTab === "architecture") {
      html = window.CampusTrackArchitectureLab.render(telemetryData);
    } else if (session.role === "admin") {
      html = currentTab === "settings" ? await renderAdminSettings() : await renderAdminDashboard();
    } else if (session.role === "teacher") {
      html = currentTab === "mark" ? await renderTeacherMarkAttendance() : await renderTeacherDashboard();
    } else {
      html = currentTab === "subjects" ? await renderStudentSubjects() : await renderStudentDashboard();
    }
    container.innerHTML = html;
    if (currentTab === "architecture") {
      window.CampusTrackArchitectureLab.attach(container.querySelector(".arch-lab"));
    }
    wireDynamicContentEvents();
  } catch (err) {
    container.innerHTML = `
      <div class="panel">
        <p class="error-banner show">${err.message || "Failed to load content."}</p>
      </div>
    `;
  }
}

// ============================================================================
// STUDENT DASHBOARD & INTERACTIVE ATTENDANCE SIMULATOR
// ============================================================================

async function renderStudentDashboard() {
  const data = await api("/student/dashboard");
  const overall = data.overall;
  const isElig = overall.isEligible;
  const pct = overall.currentPercentage;
  const color = getPctColor(pct);

  // Radial SVG Gauge calculations (circumference for r=58 is ~364.4)
  const radius = 58;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (Math.min(pct, 100) / 100) * circ;

  return `
    <!-- Student Hero Gauge Card -->
    <div class="student-gauge-hero">
      <div class="gauge-circle-wrap">
        <svg class="gauge-svg" viewBox="0 0 140 140">
          <circle class="gauge-bg" cx="70" cy="70" r="${radius}"></circle>
          <circle
            class="gauge-fill"
            cx="70"
            cy="70"
            r="${radius}"
            stroke="${color}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${dashOffset}"
          ></circle>
        </svg>
        <div class="gauge-center-text">
          <div class="gauge-percent" style="color:${color};">${pct}%</div>
          <div class="gauge-subtext">Overall Health</div>
        </div>
      </div>

      <div>
        <div style="display:flex; align-items:center; gap:0.65rem; margin-bottom:0.4rem;">
          <h2 style="font-size:1.5rem; font-weight:800; letter-spacing:-0.03em;">Welcome back, ${session.name}</h2>
          ${getPctBadge(pct, isElig)}
        </div>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">
          ERP ID: <strong class="mono" style="color:var(--text-main);">${session.erpId || "ERP-101"}</strong> · Roll: <strong class="mono">#${session.roll || "101"}</strong>
        </p>

        <div style="display:flex; flex-wrap:wrap; gap:0.75rem;">
          <div class="stat-chip" style="min-width:130px;">
            <span class="stat-chip-label">Classes Attended</span>
            <span class="stat-chip-val" style="color:var(--success);">${overall.present} <small style="font-size:0.8rem; color:var(--text-muted);">/ ${overall.total}</small></span>
          </div>
          <div class="stat-chip" style="min-width:130px;">
            <span class="stat-chip-label">Target Required</span>
            <span class="stat-chip-val">${overall.requiredPercentage}%</span>
          </div>
          <div class="stat-chip" style="min-width:160px;">
            <span class="stat-chip-label">${isElig ? "Overall lectures you can miss" : "Attendance recovery plan"}</span>
            <span class="stat-chip-val" style="color:${isElig ? (overall.classesCanMiss > 0 ? "var(--success)" : "var(--warning)") : "var(--danger)"};">
              ${isElig
                ? (overall.classesCanMiss > 0 ? `${overall.classesCanMiss} ${overall.classesCanMiss === 1 ? "lecture" : "lectures"}` : "Attend every lecture")
                : overall.total === 0
                  ? "No lectures recorded yet"
                  : `Attend ${overall.classesNeededToReachRequired} in a row`}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- Course Cards List -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Course Attendance Breakdown</h3>
          <p class="panel-subtitle">Individual attendance performance per enrolled course</p>
        </div>
        <button type="button" class="ghost-btn" data-goto="subjects">Full Lecture History &rarr;</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
        ${data.subjects.map(s => {
          const sColor = getPctColor(s.pct);
          const sStatus = s.pct >= 75 ? "Safe" : s.pct >= 60 ? "Warning" : "Critical";
          const sBadge = s.pct >= 75 ? "success" : s.pct >= 60 ? "warning" : "danger";
          return `
            <div class="roster-mark-card" style="flex-direction:column; align-items:flex-start; gap:0.75rem;">
              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="roll-badge">${s.name.slice(0, 2).toUpperCase()}</span>
                  <strong>${s.name}</strong>
                </div>
                <strong class="mono" style="color:${sColor}; font-size:1.15rem;">${s.pct}%</strong>
              </div>

              <div class="pct-bar-wrap" style="width:100%;">
                <div class="pct-bar-track">
                  <div class="pct-bar-fill" style="width:${s.pct}%; background:${sColor};"></div>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; color:var(--text-muted); align-items:center;">
                <span>${s.present} of ${s.total} attended</span>
                <span class="badge ${sBadge}" style="font-size:0.68rem; padding:0.15rem 0.45rem;">${sStatus}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

async function renderStudentSubjects() {
  const data = await api("/student/subjects");

  return `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Detailed Lecture Records &amp; Timeline</h3>
          <p class="panel-subtitle">Full historical attendance audit across all your courses</p>
        </div>
        <span class="badge primary">Requirement: ${data.requiredPct}%</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        ${data.subjects.map(s => {
          const sColor = getPctColor(s.pct);
          return `
            <div class="panel" style="background:var(--surface-alt); border:1px solid var(--surface-border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <h4 style="font-size:1.1rem; font-weight:800;">${s.name}</h4>
                  <span style="font-size:0.78rem; color:var(--text-muted);">Attended ${s.present} of ${s.total} total sessions</span>
                </div>
                <div style="text-align:right;">
                  <span class="mono" style="font-size:1.35rem; font-weight:800; color:${sColor};">${s.pct}%</span>
                </div>
              </div>

              <div class="pct-bar-wrap" style="margin-bottom:1rem;">
                <div class="pct-bar-track">
                  <div class="pct-bar-fill" style="width:${s.pct}%; background:${sColor};"></div>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.45rem;">
                ${(s.history || []).length ? s.history.map(entry => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0.95rem; border-radius:var(--radius-sm); background:var(--surface); border:1px solid var(--surface-border); font-size:0.82rem;">
                    <span class="mono font-bold">📅 ${entry.date}</span>
                    <span style="color:var(--text-muted); font-size:0.78rem;">⏰ ${entry.startTime || "09:00"} - ${entry.endTime || "10:00"}</span>
                    <span class="badge ${entry.status === "PRESENT" ? "success" : "danger"}">${entry.status}</span>
                  </div>
                `).join("") : '<p style="font-size:0.8rem; color:var(--text-muted);">No attendance history recorded yet.</p>'}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ============================================================================
// TEACHER DASHBOARD & ATTENDANCE MARKING MATRIX
// ============================================================================

async function renderTeacherDashboard() {
  const subjects = await api("/teacher/subjects");
  const totalStudents = subjects.reduce((sum, s) => sum + (s.studentCount || 0), 0);

  return `
    <div class="stats-grid">
      <div class="metric-card primary">
        <div class="metric-top">
          <span class="metric-label">Assigned Subjects</span>
          <div class="metric-icon-box">📚</div>
        </div>
        <div class="metric-value">${subjects.length}</div>
        <div class="metric-desc">Curriculum lectures assigned to you</div>
      </div>
      <div class="metric-card success">
        <div class="metric-top">
          <span class="metric-label">Enrolled Students</span>
          <div class="metric-icon-box">👥</div>
        </div>
        <div class="metric-value">${totalStudents}</div>
        <div class="metric-desc">Active cohort enrollment</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Assigned Course Roster</h3>
          <p class="panel-subtitle">Classes and schedule windows assigned to your faculty profile</p>
        </div>
        <button type="button" class="primary-btn" style="width:auto; padding:0.5rem 1rem;" data-goto="mark">
          Mark Today's Attendance &rarr;
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
        ${subjects.map(s => `
          <div class="roster-mark-card" style="flex-direction:column; align-items:flex-start; gap:0.75rem;">
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
              <strong>${s.name}</strong>
              <span class="badge success">Active</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.25rem;">
              <span>Enrolled: <strong>${s.studentCount} students</strong></span>
              <span>Default Schedule: <strong>${s.startTime || "09:00"} – ${s.endTime || "10:00"}</strong></span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function renderTeacherMarkAttendance() {
  const [subjects, students] = await Promise.all([
    api("/teacher/subjects"),
    api("/teacher/students"),
  ]);

  if (!subjects.length) {
    return `<div class="panel"><p>No courses assigned to your faculty account yet.</p></div>`;
  }

  const selectedSubjectId = document.getElementById("markSubjectSelect")?.value || subjects[0].id;
  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const todayStr = new Date().toISOString().slice(0, 10);

  // Initialize attendance map if empty
  students.forEach(st => {
    if (!teacherAttendanceMap[st.id]) {
      teacherAttendanceMap[st.id] = "PRESENT";
    }
  });

  // Calculate live counts
  const total = students.length;
  const presentCount = students.filter(st => teacherAttendanceMap[st.id] === "PRESENT").length;
  const absentCount = total - presentCount;
  const attRate = total ? Math.round((presentCount / total) * 100) : 0;

  // Filter students by search term
  const filteredStudents = students.filter(st => {
    if (!teacherSearchTerm) return true;
    const q = teacherSearchTerm.toLowerCase();
    return st.name.toLowerCase().includes(q) ||
           String(st.roll).includes(q) ||
           (st.erpId && st.erpId.toLowerCase().includes(q));
  });

  return `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Mark Class Attendance</h3>
          <p class="panel-subtitle">Select date, lecture window, and record student attendance</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <span class="badge success" id="teacher-live-present">Present: ${presentCount}</span>
          <span class="badge danger" id="teacher-live-absent">Absent: ${absentCount}</span>
          <span class="badge primary" id="teacher-live-rate">Rate: ${attRate}%</span>
        </div>
      </div>

      <!-- Controls Bar -->
      <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem; align-items:center;">
        <select id="markSubjectSelect" class="styled-input" style="max-width:260px; padding:0.55rem 0.85rem;">
          ${subjects.map(s => `
            <option value="${s.id}" ${s.id === selectedSubjectId ? "selected" : ""}>${s.name}</option>
          `).join("")}
        </select>

        <input
          id="markDateInput"
          type="date"
          class="styled-input mono"
          style="max-width:180px; padding:0.55rem 0.85rem;"
          value="${todayStr}"
        />

        <div style="display:flex; align-items:center; gap:0.35rem;">
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">From:</span>
          <input
            id="lectureStartInput"
            type="time"
            class="styled-input mono"
            style="width:125px; padding:0.55rem 0.65rem;"
            value="${currentSubject.startTime || "09:00"}"
            min="09:00"
            max="17:00"
          />
          <span style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">To:</span>
          <input
            id="lectureEndInput"
            type="time"
            class="styled-input mono"
            style="width:125px; padding:0.55rem 0.65rem;"
            value="${currentSubject.endTime || "10:00"}"
            min="09:00"
            max="17:00"
          />
        </div>

        <button type="button" id="markAllPresentBtn" class="ghost-btn">✅ All Present</button>
        <button type="button" id="markAllAbsentBtn" class="ghost-btn">❌ All Absent</button>
        <button type="button" id="markInvertBtn" class="ghost-btn">🔄 Invert</button>
      </div>

      <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">
        * College operational hours: 09:00–17:00. Lunch interval: 12:30–13:30 (lecture cannot intersect lunch).
      </div>

      <!-- Search Filter -->
      <div style="margin-bottom:1rem;">
        <input
          type="text"
          id="teacherSearchInput"
          class="search-input"
          placeholder="Filter students by name, roll, or ERP ID..."
          value="${teacherSearchTerm}"
        />
      </div>

      <div id="markAttendanceError" class="error-banner"></div>

      <!-- Student Cards Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:0.75rem; max-height:500px; overflow-y:auto; padding-right:0.25rem;">
        ${filteredStudents.map(st => {
          const status = teacherAttendanceMap[st.id] || "PRESENT";
          return `
            <div class="roster-mark-card">
              <div class="roster-student-meta">
                <span class="roll-badge">#${st.roll}</span>
                <div>
                  <strong>${st.name}</strong>
                  <div style="font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono);">
                    ERP: ${st.erpId || `ERP-${st.roll}`}
                  </div>
                </div>
              </div>

              <div class="attendance-toggle" data-stu="${st.id}">
                <button type="button" class="att-btn present ${status === "PRESENT" ? "active" : ""}" data-val="PRESENT">Present</button>
                <button type="button" class="att-btn absent ${status === "ABSENT" ? "active" : ""}" data-val="ABSENT">Absent</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
        <button type="button" id="submitAttendanceBtn" class="primary-btn" style="width:auto; padding:0.75rem 2rem;">
          Save &amp; Submit Attendance
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// ADMIN DASHBOARD, REPORT EXPORT & THRESHOLD SIMULATOR
// ============================================================================

async function renderAdminDashboard() {
  const data = await api("/admin/dashboard");
  const reqPct = data.requiredPct;

  // Filter & Search Students
  let filteredStudents = data.students.filter(st => {
    // Mode filter
    if (adminFilterMode === "eligible" && !st.isEligible) return false;
    if (adminFilterMode === "risk" && st.isEligible) return false;

    // Search filter
    if (!adminSearchTerm) return true;
    const q = adminSearchTerm.toLowerCase();
    return st.name.toLowerCase().includes(q) ||
           String(st.roll).includes(q) ||
           (st.erpId && st.erpId.toLowerCase().includes(q));
  });

  // Sort students
  filteredStudents.sort((a, b) => {
    let diff = 0;
    if (adminSortColumn === "roll") diff = a.roll - b.roll;
    else if (adminSortColumn === "name") diff = a.name.localeCompare(b.name);
    else if (adminSortColumn === "pct") diff = a.currentPercentage - b.currentPercentage;
    else if (adminSortColumn === "status") diff = (a.isEligible === b.isEligible) ? 0 : a.isEligible ? -1 : 1;
    return adminSortAsc ? diff : -diff;
  });

  return `
    <!-- KPI Metrics -->
    <div class="stats-grid">
      <div class="metric-card primary">
        <div class="metric-top">
          <span class="metric-label">Enrolled Students</span>
          <div class="metric-icon-box">🎓</div>
        </div>
        <div class="metric-value">${data.totalStudents}</div>
        <div class="metric-desc">Registered student accounts</div>
      </div>

      <div class="metric-card success">
        <div class="metric-top">
          <span class="metric-label">Faculty Staff</span>
          <div class="metric-icon-box">👨‍🏫</div>
        </div>
        <div class="metric-value">${data.totalTeachers}</div>
        <div class="metric-desc">Active course instructors</div>
      </div>

      <div class="metric-card cyan">
        <div class="metric-top">
          <span class="metric-label">Average Attendance</span>
          <div class="metric-icon-box">📈</div>
        </div>
        <div class="metric-value">${data.averageAttendance}%</div>
        <div class="metric-desc">Campus-wide attendance average</div>
      </div>

      <div class="metric-card danger">
        <div class="metric-top">
          <span class="metric-label">Students at Risk</span>
          <div class="metric-icon-box">⚠️</div>
        </div>
        <div class="metric-value">${data.belowRequirement}</div>
        <div class="metric-desc">Students below ${reqPct}% threshold</div>
      </div>
    </div>

    <!-- Student Attendance Registry Table -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Institutional Attendance Registry</h3>
          <p class="panel-subtitle">Audited student roster across all courses and roll numbers</p>
        </div>
        <div style="display:flex; gap:0.65rem; align-items:center;">
          <span class="badge primary">Requirement: ${reqPct}%</span>
          <button type="button" id="exportCsvBtn" class="ghost-btn" title="Export table to CSV spreadsheet">
            📥 Export CSV
          </button>
        </div>
      </div>

      <!-- Toolbar: Search + Filter Pills -->
      <div class="table-toolbar">
        <input
          type="text"
          id="adminSearchInput"
          class="search-input"
          placeholder="Search by name, roll, or ERP ID..."
          value="${adminSearchTerm}"
        />

        <div class="filter-pills">
          <button type="button" class="filter-btn ${adminFilterMode === "all" ? "active" : ""}" data-filter="all">
            All (${data.students.length})
          </button>
          <button type="button" class="filter-btn ${adminFilterMode === "eligible" ? "active" : ""}" data-filter="eligible">
            Eligible (${data.students.filter(s => s.isEligible).length})
          </button>
          <button type="button" class="filter-btn ${adminFilterMode === "risk" ? "active" : ""}" data-filter="risk">
            Below Target (${data.belowRequirement})
          </button>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="sortable" data-sort="roll">Roll # ${adminSortColumn === "roll" ? (adminSortAsc ? "▲" : "▼") : ""}</th>
              <th>ERP ID</th>
              <th class="sortable" data-sort="name">Student Name ${adminSortColumn === "name" ? (adminSortAsc ? "▲" : "▼") : ""}</th>
              <th class="sortable" data-sort="pct">Overall Attendance ${adminSortColumn === "pct" ? (adminSortAsc ? "▲" : "▼") : ""}</th>
              <th class="sortable" data-sort="status">Eligibility Status ${adminSortColumn === "status" ? (adminSortAsc ? "▲" : "▼") : ""}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents.map(st => {
              const color = getPctColor(st.currentPercentage);
              return `
                <tr>
                  <td class="mono font-bold">#${st.roll}</td>
                  <td class="mono" style="color:var(--text-sub);">${st.erpId || `ERP-${st.roll}`}</td>
                  <td><strong>${st.name}</strong></td>
                  <td>
                    <div class="pct-bar-wrap">
                      <div class="pct-bar-track">
                        <div class="pct-bar-fill" style="width:${st.currentPercentage}%; background:${color};"></div>
                      </div>
                      <span class="pct-val" style="color:${color};">${st.currentPercentage}%</span>
                    </div>
                  </td>
                  <td>${getPctBadge(st.currentPercentage, st.isEligible)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderAdminSettings() {
  const settings = await api("/admin/settings");

  return `
    <div class="panel" style="max-width:700px;">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Institutional Attendance Threshold</h3>
          <p class="panel-subtitle">Configure minimum overall percentage required for student exam eligibility</p>
        </div>
      </div>

      <div class="form-group">
        <label for="reqPctInput">
          <span>Required Overall Attendance %</span>
          <span class="mono" id="sliderValDisplay">${settings.requiredPct}%</span>
        </label>
        <input
          id="reqPctInput"
          type="range"
          min="50"
          max="90"
          step="1"
          value="${settings.requiredPct}"
          style="width:100%; accent-color:var(--primary); margin:0.75rem 0;"
        />
        <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono);">
          <span>50% (Lenient)</span>
          <span>75% (Standard)</span>
          <span>90% (Strict)</span>
        </div>
      </div>

      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:1.5rem;">
        * Modifying this value immediately recalibrates all student eligibility checks, dashboards, and warning thresholds in real time across the institution.
      </p>

      <button type="button" id="saveAdminSettingsBtn" class="primary-btn" style="width:auto; padding:0.75rem 1.75rem;">
        Update Threshold
      </button>

      <div id="settingsResultBanner" class="error-banner"></div>
    </div>
  `;
}

/** CSV Export Function for Admin */
function exportAdminRosterCsv(students, reqPct) {
  let csvContent = "Roll Number,ERP ID,Student Name,Overall Percentage,Eligibility Status,Requirement Benchmark\n";
  students.forEach(s => {
    csvContent += `"${s.roll}","${s.erpId || `ERP-${s.roll}`}","${s.name}","${s.currentPercentage}%","${s.isEligible ? "ELIGIBLE" : "BELOW_TARGET"}","${reqPct}%"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `campustrack_attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Attendance report exported to CSV successfully", "success");
}

// ============================================================================
// DYNAMIC EVENT HANDLERS
// ============================================================================

function wireDynamicContentEvents() {
  // Navigation redirects via data-goto
  document.querySelectorAll("[data-goto]").forEach(el => {
    el.onclick = () => {
      currentTab = el.dataset.goto;
      render();
    };
  });

  // Admin Search Input
  const adminSearch = document.getElementById("adminSearchInput");
  if (adminSearch) {
    adminSearch.oninput = (e) => {
      adminSearchTerm = e.target.value;
      loadContent();
    };
  }

  // Admin Filter Buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
      adminFilterMode = btn.dataset.filter;
      loadContent();
    };
  });

  // Admin Table Sorting Header Clicks
  document.querySelectorAll("th.sortable").forEach(th => {
    th.onclick = () => {
      const col = th.dataset.sort;
      if (adminSortColumn === col) {
        adminSortAsc = !adminSortAsc;
      } else {
        adminSortColumn = col;
        adminSortAsc = true;
      }
      loadContent();
    };
  });

  // Admin Export CSV
  const exportBtn = document.getElementById("exportCsvBtn");
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const data = await api("/admin/dashboard");
      exportAdminRosterCsv(data.students, data.requiredPct);
    };
  }

  // Admin Settings Range Slider & Save
  const slider = document.getElementById("reqPctInput");
  const sliderDisplay = document.getElementById("sliderValDisplay");
  if (slider && sliderDisplay) {
    slider.oninput = (e) => {
      sliderDisplay.textContent = `${e.target.value}%`;
    };
  }

  const saveSettingsBtn = document.getElementById("saveAdminSettingsBtn");
  if (saveSettingsBtn && slider) {
    saveSettingsBtn.onclick = async () => {
      const val = parseFloat(slider.value);
      const banner = document.getElementById("settingsResultBanner");
      try {
        await api("/admin/settings", { method: "POST", body: { requiredPct: val } });
        showToast(`Institutional requirement updated to ${val}%`, "success");
        if (banner) {
          banner.textContent = `Target threshold updated to ${val}% successfully!`;
          banner.style.background = "var(--success-light)";
          banner.style.borderColor = "var(--success)";
          banner.style.color = "var(--success)";
          banner.classList.add("show");
          setTimeout(() => banner.classList.remove("show"), 2500);
        }
      } catch (err) {
        showToast(err.message || "Failed to update settings", "error");
        if (banner) {
          banner.textContent = err.message;
          banner.classList.add("show");
        }
      }
    };
  }

  // Teacher Attendance Toggles
  document.querySelectorAll(".attendance-toggle").forEach(group => {
    const stuId = group.dataset.stu;
    group.querySelectorAll(".att-btn").forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.val;
        teacherAttendanceMap[stuId] = val;
        group.querySelectorAll(".att-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateTeacherLiveStats();
      };
    });
  });

  function updateTeacherLiveStats() {
    const total = Object.keys(teacherAttendanceMap).length;
    const present = Object.values(teacherAttendanceMap).filter(v => v === "PRESENT").length;
    const absent = total - present;
    const rate = total ? Math.round((present / total) * 100) : 0;

    const presEl = document.getElementById("teacher-live-present");
    const absEl = document.getElementById("teacher-live-absent");
    const rateEl = document.getElementById("teacher-live-rate");
    if (presEl) presEl.textContent = `Present: ${present}`;
    if (absEl) absEl.textContent = `Absent: ${absent}`;
    if (rateEl) rateEl.textContent = `Rate: ${rate}%`;
  }

  // Teacher Mark All Present / Absent / Invert
  const markAllPres = document.getElementById("markAllPresentBtn");
  if (markAllPres) {
    markAllPres.onclick = () => {
      Object.keys(teacherAttendanceMap).forEach(k => teacherAttendanceMap[k] = "PRESENT");
      showToast("Marked all students as PRESENT", "success");
      loadContent();
    };
  }

  const markAllAbs = document.getElementById("markAllAbsentBtn");
  if (markAllAbs) {
    markAllAbs.onclick = () => {
      Object.keys(teacherAttendanceMap).forEach(k => teacherAttendanceMap[k] = "ABSENT");
      showToast("Marked all students as ABSENT", "warning");
      loadContent();
    };
  }

  const markInvert = document.getElementById("markInvertBtn");
  if (markInvert) {
    markInvert.onclick = () => {
      Object.keys(teacherAttendanceMap).forEach(k => {
        teacherAttendanceMap[k] = teacherAttendanceMap[k] === "PRESENT" ? "ABSENT" : "PRESENT";
      });
      showToast("Inverted attendance status", "success");
      loadContent();
    };
  }

  // Teacher Search Filter
  const teacherSearch = document.getElementById("teacherSearchInput");
  if (teacherSearch) {
    teacherSearch.oninput = (e) => {
      teacherSearchTerm = e.target.value;
      loadContent();
    };
  }

  // Teacher Subject Dropdown Change
  const subjSelect = document.getElementById("markSubjectSelect");
  if (subjSelect) {
    subjSelect.onchange = () => {
      loadContent();
    };
  }

  // Teacher Submit Attendance
  const submitAttBtn = document.getElementById("submitAttendanceBtn");
  if (submitAttBtn) {
    submitAttBtn.onclick = async () => {
      const subjectId = document.getElementById("markSubjectSelect")?.value;
      const date = document.getElementById("markDateInput")?.value;
      const startTime = document.getElementById("lectureStartInput")?.value;
      const endTime = document.getElementById("lectureEndInput")?.value;
      const errEl = document.getElementById("markAttendanceError");

      if (!subjectId || !date || !startTime || !endTime) {
        if (errEl) {
          errEl.textContent = "Please fill in all lecture scheduling fields.";
          errEl.classList.add("show");
        }
        return;
      }

      if (startTime < "09:00" || endTime > "17:00" || startTime >= endTime || (startTime < "13:30" && endTime > "12:30")) {
        if (errEl) {
          errEl.textContent = "Lecture must be between 09:00–17:00 and stay outside the 12:30–13:30 lunch break.";
          errEl.classList.add("show");
        }
        return;
      }

      const records = Object.keys(teacherAttendanceMap).map(stuId => ({
        studentId: stuId,
        status: teacherAttendanceMap[stuId],
      }));

      try {
        submitAttBtn.disabled = true;
        submitAttBtn.textContent = "Submitting...";
        await api("/teacher/attendance", {
          method: "POST",
          body: { subjectId, date, startTime, endTime, records },
        });
        showToast("Class attendance recorded successfully!", "success");
        currentTab = "dashboard";
        render();
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || "Failed to submit attendance.";
          errEl.classList.add("show");
        }
      } finally {
        submitAttBtn.disabled = false;
        submitAttBtn.textContent = "Save & Submit Attendance";
      }
    };
  }
}

// Start application
boot();
