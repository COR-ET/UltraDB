const UltraDB = require('./main.js');
const crypto = require('crypto');

/* Useful help testing script (v2) for huge data samples :> */

// --- Helpers ---
function now() { return Date.now(); }
function hrNow() {
    const [s, ns] = process.hrtime();
    return s * 1000 + ns / 1e6; // ms
}
function bytesOf(obj) {
    try { return Buffer.byteLength(JSON.stringify(obj), 'utf8'); }
    catch { return 0; }
}
function statsFromLatencies(arr) {
    if (!arr.length) return null;
    arr.sort((a,b)=>a-a);
    const sum = arr.reduce((a,b)=>a+b,0);
    const mean = sum/arr.length;
    const median = arr[Math.floor(arr.length/2)];
    const p = (p)=> {
        const idx = Math.floor((p/100)*(arr.length-1));
        return arr[idx];
    };
    return {
        count: arr.length,
        min: arr[0],
        max: arr[arr.length-1],
        mean,
        median,
        p95: p(95),
        p99: p(99)
    };
}
function formatMs(ms) {
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    return `${(ms/1000).toFixed(3)} s`;
}
function formatMB(bytes) {
    return `${(bytes / (1024*1024)).toFixed(3)} MB`;
}
function cpuDiffPercent(startCpu, endCpu, wallMs) {
    // startCpu/endCpu from process.cpuUsage() in microseconds
    const user = endCpu.user - startCpu.user; // microseconds
    const system = endCpu.system - startCpu.system;
    const totalCpuUseMicro = user + system;
    const wallMicro = wallMs * 1000; // ms->micro
    // Approximate CPU% used by the process over wall time:
    // (cpu_used / (wall_time * 1)) * 100
    // Note: We use single thread performance - result >100% unlikely here but keep formula general.
    const percent = (totalCpuUseMicro / wallMicro) * 100;
    return { user, system, percent };
}

// --- Main test ---
async function testUltraDBAdvanced() {
    console.log("[TEST] UltraDB Advanced Performance Test — starting");

    const db = new UltraDB("__test", "AnyRandomSecurityKeyHere");
    const globalStart = hrNow();
    const globalWallStartMs = now();

    // pre-snapshot
    if (global.gc) try { global.gc(); } catch (_) {}
    const memBefore = process.memoryUsage();
    const cpuBefore = process.cpuUsage();

    await db.load();

    // -------------------------------
    // TEST 1: Single large object (1K logs) stored at one key
    // -------------------------------
    console.log("\n[TEST 1] Preparing single HUGE_LOGS object (10K logs)...");
    const t1_prepStart = hrNow();
    const bigLogs = {};
    for (let i = 0; i < 10000; i++) {
        bigLogs[`log_${i}`] = {
            id: i,
            timestamp: new Date().toISOString(),
            event: `Event_${Math.floor(Math.random() * 100000)}`,
            message: `Random message ${crypto.randomBytes(10).toString('hex')}`,
            level: ["info","warn","error","debug"][Math.floor(Math.random()*4)],
            source: `module_${Math.floor(Math.random()*100)}`
        };
    }
    const t1_prepEnd = hrNow();
    const bigLogsBytes = bytesOf(bigLogs);
    console.log(`[TEST 1] Prepared. Size ≈ ${formatMB(bigLogsBytes)} (${bigLogsBytes} bytes). Preparation time: ${formatMs(t1_prepEnd - t1_prepStart)}`);

    console.log("[TEST 1] Writing HUGE_LOGS to DB (single set)...");
    const t1_setStart = hrNow();
    const t1_setCpuStart = process.cpuUsage();
    const t1_setStartWall = now();
    const t1_setLatencies = [];
    // single op
    const opStart = hrNow();
    await db.set("HUGE_LOGS", bigLogs);
    const opEnd = hrNow();
    t1_setLatencies.push(opEnd - opStart);
    const t1_setEnd = hrNow();
    const t1_setCpuEnd = process.cpuUsage();
    const t1_setEndWall = now();

    const t1_setWallMs = t1_setEnd - t1_setStart;
    const t1_setCpu = cpuDiffPercent(t1_setCpuStart, t1_setCpuEnd, t1_setWallMs);
    const t1_setStats = statsFromLatencies(t1_setLatencies);

    // Read it back (single get)
    console.log("[TEST 1] Reading HUGE_LOGS back (single get)...");
    const t1_getStart = hrNow();
    const t1_getCpuStart = process.cpuUsage();
    const t1_getStartWall = now();
    const gStart = hrNow();
    const retrieved = await db.get("HUGE_LOGS");
    const gEnd = hrNow();
    const t1_getEnd = hrNow();
    const t1_getCpuEnd = process.cpuUsage();
    const t1_getEndWall = now();

    const retrievedBytes = bytesOf(retrieved);
    const t1_getWallMs = t1_getEnd - t1_getStart;
    const t1_getCpu = cpuDiffPercent(t1_getCpuStart, t1_getCpuEnd, t1_getWallMs);
    const t1_getStats = statsFromLatencies([gEnd - gStart]);

    console.log(`[TEST 1] Retrieved size ≈ ${formatMB(retrievedBytes)} (${retrievedBytes} bytes). Read time: ${formatMs(t1_getStats.mean)}`);

    // -------------------------------
    // TEST 2: 1K individual small logs (strings), each on its own key
    // -------------------------------
    console.log("\n[TEST 2] Storing 10K individual logs (strings), sequentially...");
    const t2_prepStart = hrNow();
    const t2_setLatencies = [];
    let t2_totalBytesWritten = 0;
    const t2_setStartWall = now();
    const t2_setCpuStart = process.cpuUsage();
    const t2_setHrStart = hrNow();

    for (let i = 0; i < 10000; i++) {
        const key = `log_key_${i}`;
        const value = `Log #${i} - ${new Date().toISOString()} - rnd:${crypto.randomBytes(6).toString('hex')}`;
        const opS = hrNow();
        await db.set(key, value);
        const opE = hrNow();
        t2_setLatencies.push(opE - opS);
        t2_totalBytesWritten += bytesOf(value);
    }

    const t2_setHrEnd = hrNow();
    const t2_setWallEnd = now();
    const t2_setCpuEnd = process.cpuUsage();
    const t2_prepEnd = hrNow();

    const t2_setWallMs = t2_setHrEnd - t2_setHrStart;
    const t2_setCpu = cpuDiffPercent(t2_setCpuStart, t2_setCpuEnd, t2_setWallMs);
    const t2_setStats = statsFromLatencies(t2_setLatencies);

    // Read a random sample back
    const sampleIdx = Math.floor(Math.random() * 1000);
    const sampleKey = `log_key_${sampleIdx}`;
    console.log(`[TEST 2] Reading back a random sample: ${sampleKey}`);
    const t2_getStart = hrNow();
    const t2_getCpuStart = process.cpuUsage();
    const sample = await db.get(sampleKey);
    const t2_getEnd = hrNow();
    const t2_getCpuEnd = process.cpuUsage();
    const t2_getWallMs = t2_getEnd - t2_getStart;
    const t2_getCpu = cpuDiffPercent(t2_getCpuStart, t2_getCpuEnd, t2_getWallMs);

    // -------------------------------
    // Final snapshots and calculations
    // -------------------------------
    if (global.gc) try { global.gc(); } catch (_) {}
    const memAfter = process.memoryUsage();
    const cpuAfter = process.cpuUsage();
	
    const globalEnd = hrNow();
    const globalWallEndMs = now();
    const globalWallMs = globalEnd - globalStart;
	
    // memory diffs
    const memDiff = {};
    Object.keys(memAfter).forEach(k => {
        memDiff[k] = memAfter[k] - (memBefore[k] || 0);
    });
	
    // CPU diff overall
    const cpuOverall = cpuDiffPercent(cpuBefore, cpuAfter, globalEnd - globalStart);
	
    // Throughput and MB/s calculations (approx)
    const t1_bytes = bigLogsBytes + 0; // approx written bytes for single set
    const t1_writeMBs = t1_setWallMs > 0 ? (t1_bytes / (1024*1024)) / (t1_setWallMs/1000) : 0;
    const t1_readMBs = t1_getWallMs > 0 ? (retrievedBytes / (1024*1024)) / (t1_getWallMs/1000) : 0;
	
    const t2_writeMBs = t2_setWallMs > 0 ? (t2_totalBytesWritten / (1024*1024)) / (t2_setWallMs/1000) : 0;
	
    // Print Summary
    console.log("\n\n===== UltraDB Advanced Test SUMMARY =====");
    console.log(`Total wall time: ${formatMs(globalWallMs)}`);
    console.log("\n-- Memory (bytes) --");
    console.log("Before:", memBefore);
    console.log("After: ", memAfter);
    console.log("Diff:  ", memDiff);
	
    console.log("\n-- CPU (approx) --");
    console.log(`Process CPU user+system (microseconds): user=${cpuOverall.user}µs system=${cpuOverall.system}µs`);
    console.log(`Approx CPU% over total test wall time: ${cpuOverall.percent.toFixed(2)}%`);
	
    console.log("\n-- TEST 1 (Single HUGE_LOGS) --");
    console.log(`Prepared size: ${bigLogsBytes} bytes (${formatMB(bigLogsBytes)})`);
    console.log(`Set: ${formatMs(t1_setWallMs)} (single op). CPU user+system: ${t1_setCpu.user}µs+${t1_setCpu.system}µs -> CPU% ${t1_setCpu.percent.toFixed(3)}%`);
    console.log(`Set latency stats (ms):`, t1_setStats);
    console.log(`Write throughput (approx): ${formatMB(t1_bytes)} written in ${formatMs(t1_setWallMs)} => ${t1_writeMBs.toFixed(3)} MB/s`);
    console.log(`Get: ${formatMs(t1_getWallMs)}. Read bytes: ${retrievedBytes} -> Read throughput: ${t1_readMBs.toFixed(3)} MB/s`);
    console.log(`Get latency stats (ms):`, t1_getStats);

    console.log("\n-- TEST 2 (10K individual string logs) --");
    console.log(`Total bytes written (sum of serialized values): ${t2_totalBytesWritten} bytes (${formatMB(t2_totalBytesWritten)})`);
    console.log(`Total set time: ${formatMs(t2_setWallMs)}. Ops: ${t2_setStats.count}. Ops/sec: ${(t2_setStats.count / (t2_setWallMs/1000)).toFixed(2)}`);
    console.log(`Set latency stats (ms):`, t2_setStats);
    console.log(`Approx write throughput: ${t2_writeMBs.toFixed(3)} MB/s`);
    console.log(`Random sample (${sampleKey}) -> value length: ${bytesOf(sample)} bytes; read time: ${formatMs(t2_getWallMs)}; CPU%: ${t2_getCpu.percent.toFixed(3)}%`);

    console.log("\n-- Helpful derived numbers --");
    console.log(`Average set latency (single huge write): ${t1_setStats.mean.toFixed(3)} ms`);
    console.log(`Average set latency (per small log): ${t2_setStats.mean.toFixed(3)} ms`);
    console.log(`Median small-set latency: ${t2_setStats.median.toFixed(3)} ms, p95: ${t2_setStats.p95.toFixed(3)} ms, p99: ${t2_setStats.p99.toFixed(3)} ms`);

    console.log("\n===== END OF SUMMARY =====\n");

    console.log("[✅] Advanced UltraDB performance test finished.");
}

// Run
testUltraDBAdvanced().catch(err => {
    console.error("[UltraDB Advanced Test] Unexpected error:", err);
    process.exitCode = 1;
});

