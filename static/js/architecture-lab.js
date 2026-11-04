(() => {
  const tabs = [
    ["pipeline", "Pipeline"],
    ["cycle", "Task cycle"],
    ["control", "Control unit"],
    ["parallel", "Parallel"],
    ["network", "Network"],
    ["memory", "CPU & memory"],
    ["sync", "Coherence & sync"],
  ];

  const state = {
    tab: "pipeline",
    candidates: 6,
    forwarding: false,
    duplicateValidator: false,
    workers: 4,
    hitRatio: 90,
    parallelFraction: 90,
    amdahlWorkers: 8,
    threshold: 75,
    candidate: 0,
    taskExecuted: false,
    control: "microprogrammed",
    selectedBlock: "Control unit",
    networkNodes: 16,
    counterResult: "",
    barrierComplete: false,
    directory: { value: "PRESENT", state: "Uncached", holders: [] },
    consistency: "Sequential",
  };

  const samples = [
    { id: "ST-101", present: 21, total: 24 },
    { id: "ST-102", present: 16, total: 24 },
    { id: "ST-103", present: 23, total: 24 },
    { id: "ST-104", present: 18, total: 24 },
    { id: "ST-105", present: 20, total: 24 },
    { id: "ST-106", present: 13, total: 24 },
  ];

  const stages = ["Capture", "Validate", "Aggregate", "Eligibility", "Report"];
  const stageColors = ["#2a7fb8", "#7a5cc4", "#c47f17", "#c2455f", "#2f8f4e"];
  const blocks = {
    "Control unit": "Routes attendance records through validation and calculation steps, applying the institution's configurable attendance rule.",
    ALU: "Calculates attendance percentages and compares them with the required threshold.",
    Registers: "Temporarily hold a record, running totals, threshold and eligibility result while one task is processed.",
    Cache: "Represents frequently reused values such as course settings and the current reporting period.",
    "Main memory": "The persistent student, course and attendance collections stored by the application.",
    "System bus": "Carries record data, addresses and control messages between the processor, memory and input/output.",
    "Input / output": "Faculty submit attendance; students and administrators receive dashboards and reports.",
  };

  let latestMetrics = {};

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function pipelineSection() {
    const durations = [1, state.forwarding || state.duplicateValidator ? 1 : 2, 1, 1, 1];
    const starts = [];
    const ends = [];
    for (let task = 0; task < state.candidates; task++) {
      starts[task] = [];
      ends[task] = [];
      for (let stage = 0; stage < stages.length; stage++) {
        const previousTaskEnd = task ? ends[task - 1][stage] : 0;
        const previousStageEnd = stage ? ends[task][stage - 1] : 0;
        starts[task][stage] = Math.max(previousTaskEnd, previousStageEnd);
        ends[task][stage] = starts[task][stage] + durations[stage];
      }
    }

    const totalCycles = ends[state.candidates - 1][stages.length - 1];
    const sequentialCycles = state.candidates * durations.reduce((sum, item) => sum + item, 0);
    const idealSpeedup = state.candidates * stages.length / (state.candidates + stages.length - 1);
    let grid = `<div class="arch-cell arch-head">Student</div>`;
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      grid += `<div class="arch-cell arch-head">${cycle + 1}</div>`;
    }
    for (let task = 0; task < state.candidates; task++) {
      grid += `<div class="arch-cell arch-row-label">${samples[task % samples.length].id}</div>`;
      for (let cycle = 0; cycle < totalCycles; cycle++) {
        let cell = `<div class="arch-cell arch-empty"></div>`;
        for (let stage = 0; stage < stages.length; stage++) {
          if (cycle >= starts[task][stage] && cycle < ends[task][stage]) {
            cell = `<div class="arch-cell arch-stage" style="background:${stageColors[stage]}">S${stage + 1}</div>`;
            break;
          }
          const previousEnd = stage ? ends[task][stage - 1] : 0;
          if (cycle >= previousEnd && cycle < starts[task][stage]) {
            cell = `<div class="arch-cell arch-stall" title="Waiting for the previous stage">Wait</div>`;
            break;
          }
        }
        grid += cell;
      }
    }

    return `
      <h2>Attendance pipeline</h2>
      <p class="arch-note">Each stage handles a different student's record at once: capture, validate, aggregate, determine eligibility, then report. These cycle counts are an educational model, not measured application latency.</p>
      <div class="arch-legend">${stages.map((name, i) => `<span><i style="background:${stageColors[i]}"></i>S${i + 1} ${name}</span>`).join("")}<span><i class="arch-legend-wait"></i>Wait</span></div>
      <div class="arch-controls">
        <label>Students in model <input type="range" min="3" max="10" value="${state.candidates}" data-setting="candidates"><b>${state.candidates}</b></label>
        <label><input type="checkbox" data-setting="forwarding" ${state.forwarding ? "checked" : ""}> Forward validated records immediately</label>
        <label><input type="checkbox" data-setting="duplicateValidator" ${state.duplicateValidator ? "checked" : ""}> Add a parallel validation unit</label>
      </div>
      <div class="arch-scroll"><div class="arch-grid" style="grid-template-columns:58px repeat(${totalCycles}, minmax(24px, 1fr))">${grid}</div></div>
      <div class="arch-stats">
        <div><b>${sequentialCycles}</b><span>Sequential cycles</span></div>
        <div><b>${totalCycles}</b><span>Pipeline cycles</span></div>
        <div><b>${(sequentialCycles / totalCycles).toFixed(2)}×</b><span>Modeled speedup</span></div>
        <div><b>${idealSpeedup.toFixed(2)}×</b><span>Ideal pipeline speedup</span></div>
      </div>
      <p class="arch-note">${state.forwarding ? "Forwarding removes the modeled validation wait." : "Validation takes two modeled cycles; forwarding shortens that stage."} ${state.duplicateValidator ? "A parallel validation unit adds stage capacity for arriving records." : "The validator is a shared stage, so its work can hold up later records."}</p>
      <h3 class="arch-subhead">Pipeline hazards and attendance examples</h3>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>Data hazard · RAW</h3><p>Read-after-write: the eligibility stage needs the validated attendance count before validation has finished. Forwarding passes the result directly to the next stage instead of waiting for a later write-back.</p></div>
        <div class="arch-info-card"><h3>Structural hazard</h3><p>Two tasks need the same unit at once, such as a single database connection serving both report aggregation and attendance capture. Add capacity, schedule access, or queue the work.</p></div>
        <div class="arch-info-card"><h3>Control hazard</h3><p>A conditional eligibility branch changes which work runs next. A rejected record should not continue into an eligible-only report stage; resolve the decision before committing later work.</p></div>
        <div class="arch-info-card"><h3>Throughput vs. latency</h3><p>Pipeline fill adds latency for the first student. Once filled, stages overlap and can increase completed records per cycle; total speedup is limited by the slowest stage and coordination.</p></div>
      </div>`;
  }

  function taskCycleSection() {
    const student = samples[state.candidate];
    const percentage = student.present / student.total * 100;
    const eligible = percentage >= state.threshold;
    const lecturesCanMiss = eligible
      ? Math.max(0, Math.floor(student.present * 100 / state.threshold - student.total + 1e-10))
      : 0;
    const trace = state.taskExecuted ? `
      <pre class="arch-trace">FETCH    PC=${state.candidate + 1}: load attendance task for ${student.id}
DECODE   type=PROCESSING, operands=(present=${student.present}, total=${student.total})
EXECUTE  ALU: ${student.present} / ${student.total} × 100 = ${percentage.toFixed(2)}%
COMPARE  FLAG: ${percentage.toFixed(2)} ${eligible ? ">=" : "<"} required ${state.threshold}%
BRANCH   ${eligible ? "continue to eligible result" : "branch to below-target result"}
WRITE    status[${student.id}] = ${eligible ? "ELIGIBLE" : "BELOW REQUIREMENT"}</pre>` : `<pre class="arch-trace">Select a sample record and run the attendance task.</pre>`;
    return `
      <h2>Attendance task cycle</h2>
      <p class="arch-note">A dashboard calculation behaves like an instruction: fetch a record, decode the operation, calculate attendance, compare the policy threshold and write the result.</p>
      <div class="arch-controls">
        <label>Sample record <select data-setting="candidate">${samples.map((item, index) => `<option value="${index}" ${index === state.candidate ? "selected" : ""}>${item.id} · ${item.present}/${item.total} present</option>`).join("")}</select></label>
        <label>Required attendance <input type="number" min="1" max="100" value="${state.threshold}" data-setting="threshold">%</label>
        <button class="arch-button" data-action="execute-task">Run attendance task</button>
      </div>
      <div class="arch-registers">
        <div><span>PC</span><b>${state.taskExecuted ? state.candidate + 1 : "—"}</b></div>
        <div><span>IR</span><b>${state.taskExecuted ? "CALC_PCT" : "—"}</b></div>
        <div><span>R1 · Present</span><b>${state.taskExecuted ? student.present : "—"}</b></div>
        <div><span>R2 · Total</span><b>${state.taskExecuted ? student.total : "—"}</b></div>
        <div><span>FLAG</span><b>${state.taskExecuted ? (eligible ? "PASS" : "FAIL") : "—"}</b></div>
        <div><span>STATUS</span><b>${state.taskExecuted ? (eligible ? "ELIGIBLE" : "BELOW TARGET") : "—"}</b></div>
      </div>
      <div class="arch-stats">
        <div><b>${student.present}/${student.total}</b><span>Lectures attended</span></div>
        <div><b>${percentage.toFixed(2)}%</b><span>Current attendance</span></div>
        <div><b>${state.threshold}%</b><span>Required threshold</span></div>
        <div><b>${eligible ? lecturesCanMiss : "—"}</b><span>${eligible ? "More lectures you can miss" : "Below threshold: no safe misses"}</span></div>
      </div>
      <p class="arch-note">Safe misses are calculated across the total attendance record: present ÷ (total + future missed lectures) must remain at or above the required threshold. The live student dashboard uses the student's actual overall count across courses.</p>
      ${trace}
      <h3 class="arch-subhead">Instruction format, operation types and addressing modes</h3>
      <p class="arch-note">A processor instruction names the operation, its operands and how to find their data. Here is the equivalent for a simplified attendance task.</p>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Concept</th><th>Attendance example</th></tr></thead><tbody>
      <tr><td>Instruction format</td><td>Opcode: CALC_PCT · Operand 1: student record · Operand 2: attendance policy</td></tr>
      <tr><td>Data transfer</td><td>Load present and total lecture counts into registers.</td></tr>
      <tr><td>Processing</td><td>Divide attended lectures by total lectures and scale to a percentage.</td></tr>
      <tr><td>Control flow</td><td>Branch to eligible or below-threshold handling based on the comparison flag.</td></tr>
      <tr><td>Immediate addressing</td><td>A fixed threshold is encoded in the instruction itself.</td></tr>
      <tr><td>Direct addressing</td><td>The instruction contains the student record's address.</td></tr>
      <tr><td>Register addressing</td><td>Use lecture counts already held in CPU registers.</td></tr>
      <tr><td>Indirect / indexed</td><td>Follow a pointer to a course rule, or use a roster base plus the student index.</td></tr>
      </tbody></table></div>
      <p class="arch-note">Sample records are illustrative and do not read or modify student accounts or saved attendance.</p>`;
  }

  function controlSection() {
    const micro = state.control === "microprogrammed";
    return `
      <h2>Attendance control unit</h2>
      <p class="arch-note">The control unit decides which processing steps run and what happens when a record passes or fails.</p>
      <div class="arch-controls">
        <button class="arch-button ${!micro ? "secondary" : ""}" data-action="control-hardwired">Hardwired control</button>
        <button class="arch-button ${micro ? "secondary" : ""}" data-action="control-microprogrammed">Policy-table control</button>
      </div>
      <div class="arch-info-card">
        <h3>${micro ? "Policy-table control" : "Hardwired control"}</h3>
        <p>${micro ? "Attendance thresholds and processing rules are configuration data. An administrator can adjust the requirement without rebuilding the processing logic." : "The threshold is fixed into the control logic. This can be fast, but changing attendance policy requires changing the implementation."}</p>
        <p><b>Attendance workflow:</b> ${micro ? "read the current policy, calculate the percentage, then branch to the correct status." : "run a fixed compare-and-branch sequence for every record."}</p>
      </div>
      <h3 class="arch-subhead">Example micro-operation sequence</h3>
      <pre class="arch-trace">T0  MAR ← studentAddress          ; select the attendance record
T1  MDR ← M[MAR]                  ; fetch stored lecture counts
T2  R1 ← presentCount, R2 ← total ; load operands
T3  ACC ← (R1 × 100) / R2          ; calculate percentage
T4  FLAG ← compare(ACC, policy)    ; set pass/fail condition
T5  STATUS ← eligible or at-risk  ; write result for the dashboard</pre>
      <p class="arch-note">A hardwired controller generates these control signals with fixed logic. A microprogrammed controller stores a sequence of control words and is easier to adapt when the institution's policy changes.</p>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>RISC-style tasks</h3><p>Small uniform operations: load counts, calculate a percentage, compare, then store a status. These steps are easy to pipeline.</p></div>
        <div class="arch-info-card"><h3>CISC-style task</h3><p>One compound “build attendance report” operation combines several stages. It is convenient, but harder to overlap and inspect.</p></div>
        <div class="arch-info-card"><h3>Horizontal control</h3><p>More independent actions can happen in one control word; faster parallel work uses more control bits.</p></div>
        <div class="arch-info-card"><h3>Vertical control</h3><p>Compact encoded actions save control storage but need decoding before execution.</p></div>
      </div>
      <h3 class="arch-subhead">Flynn's classification for attendance</h3>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Class</th><th>Attendance example</th></tr></thead><tbody>
      <tr><td>SISD</td><td>Calculate one student's attendance record at a time.</td></tr>
      <tr><td>SIMD</td><td>Apply the same attendance rule to many students.</td></tr>
      <tr><td>MISD</td><td>Run different checks on one student's record.</td></tr>
      <tr><td>MIMD</td><td>Workers calculate results for different students and courses.</td></tr>
      </tbody></table></div>`;
  }

  function parallelSection() {
    const total = 96;
    const sequential = total * 5;
    const pipelined = total + 4;
    const parallel = Math.ceil(total / state.workers) + 4 + (state.workers > 1 ? 2 : 0);
    const workerBars = Array.from({ length: state.workers }, (_, index) =>
      `<div class="arch-worker"><span>Worker ${index + 1}</span><i style="width:${Math.max(8, 100 / state.workers)}%"></i></div>`).join("");
    return `
      <h2>Parallel attendance calculations</h2>
      <p class="arch-note">Workers can calculate attendance for separate students concurrently. Results must be collected before a campus-wide report is published.</p>
      <div class="arch-controls"><label>Workers <input type="range" min="1" max="8" value="${state.workers}" data-setting="workers"><b>${state.workers}</b></label></div>
      <div class="arch-bars">
        <div><span>SISD · one worker</span><i style="width:100%">${sequential} cycles</i></div>
        <div><span>One attendance pipeline</span><i style="width:${pipelined / sequential * 100}%">${pipelined} cycles</i></div>
        <div><span>MIMD · ${state.workers} workers + barrier</span><i style="width:${parallel / sequential * 100}%">${parallel} cycles</i></div>
      </div>
      <p class="arch-note">Modelled speedup over sequential: ${(sequential / parallel).toFixed(2)}×. These are comparison values, not benchmark results from your device.</p>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>Load balancing</h3><p>Give workers similar numbers of student records. A worker with a much larger course roster can become the straggler that delays the final report.</p></div>
        <div class="arch-info-card"><h3>Task granularity</h3><p>Small per-student tasks balance well, but creating and coordinating many tiny tasks has overhead. Batching records can reduce dispatch cost.</p></div>
        <div class="arch-info-card"><h3>Parallel fraction</h3><p>Eligibility calculations can run in parallel; reading policy, combining totals and publishing the final report still require coordinated work.</p></div>
        <div class="arch-info-card"><h3>Data partitioning</h3><p>Assign separate student ranges to workers, then combine partial attendance totals after each worker completes its batch.</p></div>
      </div>
      <h3 class="arch-subhead">Shared counter: present students</h3>
      <p class="arch-note">When several workers update one total, an unprotected read-modify-write can lose updates. Compare a deliberately overlapping update with an atomic update.</p>
      <div class="arch-controls"><button class="arch-button secondary" data-action="counter-race">Simulate unsynchronized updates</button><button class="arch-button" data-action="counter-atomic">Simulate atomic updates</button></div>
      <pre class="arch-trace" id="arch-counter-result">${state.counterResult || `Workers: ${state.workers}\\nExpected total: ${state.workers * 25}\\nRun either counter example to compare.`}</pre>
      <h3 class="arch-subhead">Barrier synchronization</h3>
      <div class="arch-controls"><button class="arch-button" data-action="barrier">Run two-phase report demo</button></div>
      <div class="arch-workers">${workerBars}</div>
      <p class="arch-note">${state.barrierComplete ? "All workers completed the first phase. The barrier released, so report aggregation can begin." : "Workers finish screening at different times; aggregation waits until all reach the barrier."}</p>`;
  }

  function networkSection() {
    const count = Number(state.networkNodes);
    const side = Math.sqrt(count);
    const log = Math.log2(count);
    const rows = [
      ["Bus", 1, 1, "1 shared", 1],
      ["Ring", count / 2, 2, count, 2],
      ["Mesh", 2 * (side - 1), 4, 2 * side * (side - 1), side],
      ["Torus", side, 4, 2 * count, 2 * side],
      ["Binary tree", 2 * log, 3, count - 1, 1],
      ["Hypercube", log, log, count * log / 2, count / 2],
      ["Crossbar", 1, count, `${count * count} switches`, count / 2],
    ];
    return `
      <h2>Attendance system interconnection</h2>
      <p class="arch-note">Topology models show how processors, storage and input/output could exchange attendance records. They explain trade-offs; the table is not a measurement of the deployed network.</p>
      <div class="arch-controls"><label>Processing nodes <select data-setting="networkNodes"><option value="16" ${count === 16 ? "selected" : ""}>16</option><option value="64" ${count === 64 ? "selected" : ""}>64</option></select></label></div>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Topology</th><th>Diameter</th><th>Node degree</th><th>Links / switches</th><th>Bisection width</th></tr></thead><tbody>
      ${rows.map(row => `<tr><td>${row[0]}</td>${row.slice(1).map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>Bus · shared broadcast</h3><p>Simple shared path for a small system. All nodes can observe a transfer, but concurrent attendance traffic competes for the same bandwidth.</p></div>
        <div class="arch-info-card"><h3>Mesh or tree · scalable paths</h3><p>Multiple links route student batches between processing workers and a report coordinator. More paths can reduce contention as the system grows.</p></div>
        <div class="arch-info-card"><h3>Routing and flow control</h3><p>Deterministic XY routing chooses a predictable path across a mesh. Store-and-forward, cut-through and wormhole flow control trade buffering against latency.</p></div>
        <div class="arch-info-card"><h3>Latency, bandwidth and congestion</h3><p>Latency is the delay to deliver a record; bandwidth is the rate of records delivered. Hot links and queues cause congestion even when some processors are idle.</p></div>
        <div class="arch-info-card"><h3>Shared memory</h3><p>Workers need a consistent view of shared totals and policies; coherence and synchronization prevent stale results.</p></div>
        <div class="arch-info-card"><h3>Directory vs. broadcast</h3><p>A broadcast coherence protocol notifies every cache. A directory tracks which workers hold a record and sends targeted messages to those workers.</p></div>
      </div>`;
  }

  function memorySection() {
    const hit = state.hitRatio / 100;
    const amat = hit * 2 + (1 - hit) * 100;
    const description = blocks[state.selectedBlock];
    return `
      <h2>CPU organization and attendance data</h2>
      <p class="arch-note">Select a component to see how its role maps to capturing, calculating and displaying attendance.</p>
      <div class="arch-blocks">${Object.keys(blocks).map(name => `<button class="arch-button ${name === state.selectedBlock ? "" : "secondary"}" data-action="select-block" data-block="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div>
      <div class="arch-info-card"><h3>${escapeHtml(state.selectedBlock)}</h3><p>${description}</p></div>
      <h3 class="arch-subhead">Register file and task format</h3>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Register</th><th>Attendance role</th></tr></thead><tbody>
      <tr><td>PC / IR</td><td>Next queued task and current attendance operation.</td></tr>
      <tr><td>MAR / MDR</td><td>Address and data for the student attendance record.</td></tr>
      <tr><td>R1 / R2</td><td>Present count and total sessions.</td></tr>
      <tr><td>ACC / FLAG</td><td>Calculated percentage and threshold comparison result.</td></tr>
      <tr><td>SP</td><td>Return state while processing a report or policy subroutine.</td></tr>
      </tbody></table></div>
      <h3 class="arch-subhead">Memory hierarchy and average access time</h3>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Level</th><th>Illustrative latency</th><th>Attendance data</th></tr></thead><tbody>
      <tr><td>Registers</td><td>1 cycle</td><td>Record currently being calculated</td></tr>
      <tr><td>Cache</td><td>2 cycles</td><td>Frequently used policy and course settings</td></tr>
      <tr><td>Main memory</td><td>100 cycles</td><td>Active student and attendance data</td></tr>
      <tr><td>Disk</td><td>1,000,000 cycles</td><td>Archived records</td></tr>
      </tbody></table></div>
      <div class="arch-controls"><label>Cache hit ratio <input type="range" min="50" max="99" value="${state.hitRatio}" data-setting="hitRatio"><b>${state.hitRatio}%</b></label></div>
      <div class="arch-stats"><div><b>${amat.toFixed(1)} cycles</b><span>Illustrative average access time</span></div><div><b>${latestMetrics.parallelWorkers || "—"}</b><span>Current compute workers reported by monitor</span></div><div><b>${latestMetrics.studentCount || "—"}</b><span>Students reported by monitor</span></div></div>
      <p class="arch-note">Average access time = hit ratio × cache latency + miss ratio × main-memory latency. Latencies are teaching examples, not measured hardware timings.</p>
      <h3 class="arch-subhead">Locality and cache policy</h3>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>Temporal locality</h3><p>A recently accessed policy or course record is likely to be used again soon. Keeping it in cache avoids a slower memory request.</p></div>
        <div class="arch-info-card"><h3>Spatial locality</h3><p>Roster records are often processed in order. Keeping nearby records together makes each cache-line fetch useful for several students.</p></div>
        <div class="arch-info-card"><h3>Write-through</h3><p>Update cache and backing memory together. The stored attendance value stays current, with more memory traffic.</p></div>
        <div class="arch-info-card"><h3>Write-back</h3><p>Update the cached copy first and write it to memory later. This reduces traffic, but needs a dirty bit and reliable flush behavior.</p></div>
      </div>
      <h3 class="arch-subhead">Input, output and DMA</h3>
      <div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>Method</th><th>Attendance-system example</th><th>Trade-off</th></tr></thead><tbody>
      <tr><td>Programmed I/O / polling</td><td>Application repeatedly checks whether attendance input or a report is ready.</td><td>Simple, but processor time is spent waiting.</td></tr>
      <tr><td>Interrupt-driven I/O</td><td>A submission or report completion signals the processor when service is needed.</td><td>Less waiting; requires interrupt handling.</td></tr>
      <tr><td>DMA</td><td>A controller transfers a large attendance export between a device and memory.</td><td>Bulk transfer proceeds without the CPU copying each item.</td></tr>
      </tbody></table></div>`;
  }

  function syncSection() {
    const directory = state.directory;
    const fraction = state.parallelFraction / 100;
    const speedup = 1 / ((1 - fraction) + fraction / state.amdahlWorkers);
    return `
      <h2>Shared attendance data: coherence and synchronization</h2>
      <p class="arch-note">Three workers read or update one sample attendance record. The directory tracks copies and invalidates stale copies when a worker writes.</p>
      <div class="arch-workers">${[0, 1, 2].map(worker => {
        const cached = directory.holders.includes(worker);
        return `<div class="arch-worker-card"><h3>Worker ${worker + 1}</h3><p>Cached copy: <b>${cached ? directory.value : "none"}</b></p><button class="arch-button secondary" data-action="read-worker" data-worker="${worker}">Read</button><button class="arch-button" data-action="write-worker" data-worker="${worker}">Toggle status</button></div>`;
      }).join("")}</div>
      <div class="arch-stats"><div><b>${directory.state}</b><span>Directory state</span></div><div><b>${directory.value}</b><span>Memory value</span></div><div><b>${directory.holders.length}</b><span>Cached copies</span></div></div>
      <pre class="arch-trace">${directory.holders.length ? `Directory: ${directory.state}\\nCached copies: ${directory.holders.map(worker => `W${worker + 1}`).join(", ")}\\nMemory: ${directory.value}` : "No worker has cached the sample record yet. Read or write from a worker."}</pre>
      <h3 class="arch-subhead">Consistency models</h3>
      <div class="arch-controls"><label>Model <select data-setting="consistency">${["Sequential", "Weak", "Release", "Eventual"].map(name => `<option ${state.consistency === name ? "selected" : ""}>${name}</option>`).join("")}</select></label></div>
      <div class="arch-info-card"><p>${{
        Sequential: "All workers observe writes in one global order. Easiest to reason about, but may constrain performance.",
        Weak: "Ordering is guaranteed at synchronization points; faster, but workers must synchronize before relying on shared results.",
        Release: "Ordering is enforced around acquire and release operations such as a lock or report barrier.",
        Eventual: "Replicas converge later; fast for some workloads, but a dashboard may briefly show stale attendance.",
      }[state.consistency]}</p></div>
      <h3 class="arch-subhead">Synchronization primitives</h3>
      <div class="arch-two-col">
        <div class="arch-info-card"><h3>Mutex / lock</h3><p>Allows one worker at a time to modify a shared attendance total. Always release the lock, including on an error path.</p></div>
        <div class="arch-info-card"><h3>Semaphore</h3><p>Counts available resources, such as a limited number of database connections, and makes other workers wait when none are free.</p></div>
        <div class="arch-info-card"><h3>Atomic operation</h3><p>Changes a shared counter as one indivisible operation, preventing two workers from overwriting each other's updates.</p></div>
        <div class="arch-info-card"><h3>Barrier · producer / consumer</h3><p>Workers produce validated partial counts. A barrier waits for all producers before the consumer aggregates the campus report.</p></div>
      </div>
      <h3 class="arch-subhead">Amdahl's law</h3>
      <p class="arch-note">The serial part of attendance report generation limits the speedup available from adding more workers.</p>
      <div class="arch-controls"><label>Parallel portion <input type="range" min="50" max="99" value="${state.parallelFraction}" data-setting="parallelFraction"><b>${state.parallelFraction}%</b></label><label>Workers <input type="range" min="1" max="64" value="${state.amdahlWorkers}" data-setting="amdahlWorkers"><b>${state.amdahlWorkers}</b></label></div>
      <div class="arch-stats"><div><b>${speedup.toFixed(2)}×</b><span>Maximum modeled speedup</span></div></div>`;
  }

  function panelMarkup() {
    switch (state.tab) {
      case "cycle": return taskCycleSection();
      case "control": return controlSection();
      case "parallel": return parallelSection();
      case "network": return networkSection();
      case "memory": return memorySection();
      case "sync": return syncSection();
      default: return pipelineSection();
    }
  }

  function refresh(root) {
    root.querySelectorAll("[data-arch-tab]").forEach(button => {
      const active = button.dataset.archTab === state.tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const panel = root.querySelector(".arch-panel");
    if (panel) panel.innerHTML = panelMarkup();
  }

  function render(metrics) {
    latestMetrics = metrics || {};
    return `
      <section class="arch-lab" aria-label="Attendance system architecture lab">
        <div class="arch-intro">
          <span class="badge cyan">Computer Architecture · CampusTrack</span>
          <h2>How attendance processing works</h2>
          <p>Explore the processor, parallel computing and synchronization concepts behind a student attendance monitoring system. Examples are educational models; attendance records and eligibility decisions remain in CampusTrack.</p>
        </div>
        <div class="arch-tabs" role="tablist" aria-label="Architecture topics">
          ${tabs.map(([key, label], index) => `<button type="button" class="arch-tab ${index === 0 ? "active" : ""}" role="tab" aria-selected="${index === 0}" data-arch-tab="${key}">${label}</button>`).join("")}
        </div>
        <section class="arch-panel" role="tabpanel">${panelMarkup()}</section>
      </section>`;
  }

  function attach(root) {
    if (!root || root.dataset.architectureAttached) return;
    root.dataset.architectureAttached = "true";

    root.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.archTab) {
        state.tab = button.dataset.archTab;
        refresh(root);
      } else if (button.dataset.action) {
        const worker = Number(button.dataset.worker);
        switch (button.dataset.action) {
          case "execute-task":
            state.taskExecuted = true;
            break;
          case "control-hardwired":
            state.control = "hardwired";
            break;
          case "control-microprogrammed":
            state.control = "microprogrammed";
            break;
          case "counter-race":
            state.counterResult = `Workers: ${state.workers}\nExpected total: ${state.workers * 25}\nUnsynchronized total: ${state.workers > 1 ? 25 : 25}\nLost updates: ${state.workers > 1 ? (state.workers - 1) * 25 : 0}\nWorst-case example: all workers read the same old value before writing.`;
            break;
          case "counter-atomic":
            state.counterResult = `Workers: ${state.workers}\nExpected total: ${state.workers * 25}\nAtomic total: ${state.workers * 25}\nLost updates: 0\nAtomic operations preserve every increment.`;
            break;
          case "barrier":
            state.barrierComplete = true;
            break;
          case "select-block":
            state.selectedBlock = button.dataset.block;
            break;
          case "read-worker":
            if (!state.directory.holders.includes(worker)) state.directory.holders.push(worker);
            state.directory.state = state.directory.holders.length > 1 ? "Shared" : "Exclusive";
            break;
          case "write-worker":
            state.directory.holders = [worker];
            state.directory.value = state.directory.value === "PRESENT" ? "ABSENT" : "PRESENT";
            state.directory.state = "Modified";
            break;
          default:
            return;
        }
        refresh(root);
      }
    });

    root.addEventListener("change", event => {
      const input = event.target;
      const setting = input.dataset.setting;
      if (!setting) return;
      if (setting === "forwarding" || setting === "duplicateValidator") {
        state[setting] = input.checked;
      } else if (setting === "candidate") {
        state.candidate = Number(input.value);
        state.taskExecuted = false;
      } else if (setting === "consistency") {
        state.consistency = input.value;
      } else if (setting === "threshold") {
        state.threshold = Math.min(100, Math.max(1, Number(input.value) || 75));
      } else {
        state[setting] = Number(input.value);
      }
      refresh(root);
    });
  }

  window.CampusTrackArchitectureLab = { render, attach };
})();
