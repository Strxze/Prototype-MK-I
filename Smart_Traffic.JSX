import { useState, useEffect, useRef, useCallback } from "react";

const PHASES = ["NS_GREEN", "NS_YELLOW", "EW_GREEN", "EW_YELLOW"];
const BASE_TIMING = { NS_GREEN: 30, NS_YELLOW: 4, EW_GREEN: 30, EW_YELLOW: 4 };

function calcAdaptiveTiming(vehicles) {
  const nsTotal = vehicles.N + vehicles.S;
  const ewTotal = vehicles.E + vehicles.W;
  const total = nsTotal + ewTotal || 1;
  const nsRatio = nsTotal / total;
  const ewRatio = ewTotal / total;
  return {
    NS_GREEN: Math.max(10, Math.min(60, Math.round(nsRatio * 80))),
    NS_YELLOW: 4,
    EW_GREEN: Math.max(10, Math.min(60, Math.round(ewRatio * 80))),
    EW_YELLOW: 4,
  };
}

const SIGNAL_COLORS = {
  NS_GREEN: { N: "green", S: "green", E: "red", W: "red" },
  NS_YELLOW: { N: "yellow", S: "yellow", E: "red", W: "red" },
  EW_GREEN: { N: "red", S: "red", E: "green", W: "green" },
  EW_YELLOW: { N: "red", S: "red", E: "yellow", W: "yellow" },
};

const DIR_LABEL = { N: "NORTH", S: "SOUTH", E: "EAST", W: "WEST" };
const DIR_COLORS = { N: "#00e5ff", S: "#69ff47", E: "#ff6d00", W: "#e040fb" };

function TrafficLight({ color, dir }) {
  const isGreen = color === "green";
  const isYellow = color === "yellow";
  const isRed = color === "red";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: isRed ? "#ff2244" : "#3a0010",
        boxShadow: isRed ? "0 0 10px #ff2244, 0 0 20px #ff224488" : "none",
        transition: "all 0.3s"
      }} />
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: isYellow ? "#ffcc00" : "#2a2200",
        boxShadow: isYellow ? "0 0 10px #ffcc00, 0 0 20px #ffcc0088" : "none",
        transition: "all 0.3s"
      }} />
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: isGreen ? "#00ff88" : "#002a1a",
        boxShadow: isGreen ? "0 0 10px #00ff88, 0 0 20px #00ff8888" : "none",
        transition: "all 0.3s"
      }} />
    </div>
  );
}

function VehicleDot({ x, y, color, size = 6 }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: 1,
      background: color, opacity: 0.9,
      boxShadow: `0 0 4px ${color}`,
      transition: "left 0.5s linear, top 0.5s linear"
    }} />
  );
}

function StatCard({ label, value, unit, color, icon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color}33`,
      borderRadius: 8,
      padding: "12px 16px",
      display: "flex", flexDirection: "column", gap: 4
    }}>
      <div style={{ color: "#666", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{icon} {label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1, fontFamily: "'Courier New', monospace" }}>
        {value}<span style={{ fontSize: 12, color: "#666", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

export default function TrafficSystem() {
  const [phase, setPhase] = useState(0);
  const [timer, setTimer] = useState(0);
  const [vehicles, setVehicles] = useState({ N: 8, S: 12, E: 5, W: 15 });
  const [timing, setTiming] = useState(BASE_TIMING);
  const [emergency, setEmergency] = useState(false);
  const [emergencyDir, setEmergencyDir] = useState("N");
  const [emergencyProgress, setEmergencyProgress] = useState(0);
  const [log, setLog] = useState([
    { t: "08:00:01", msg: "System initialized. AI monitoring active.", type: "info" },
    { t: "08:00:03", msg: "4 intersections online. Signal control engaged.", type: "info" },
  ]);
  const [totalCleared, setTotalCleared] = useState(247);
  const [avgWait, setAvgWait] = useState(18);
  const [efficiency, setEfficiency] = useState(87);
  const [vehicleDots, setVehicleDots] = useState([]);
  const [dotId, setDotId] = useState(0);
  const timerRef = useRef(null);
  const dotRef = useRef(null);

  const addLog = useCallback((msg, type = "info") => {
    const now = new Date();
    const t = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
    setLog(prev => [...prev.slice(-8), { t, msg, type }]);
  }, []);

  // Simulate vehicles changing
  useEffect(() => {
    const iv = setInterval(() => {
      setVehicles(v => ({
        N: Math.max(0, Math.min(25, v.N + Math.floor(Math.random() * 5) - 2)),
        S: Math.max(0, Math.min(25, v.S + Math.floor(Math.random() * 5) - 2)),
        E: Math.max(0, Math.min(25, v.E + Math.floor(Math.random() * 5) - 2)),
        W: Math.max(0, Math.min(25, v.W + Math.floor(Math.random() * 5) - 2)),
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // Update adaptive timing when vehicles change
  useEffect(() => {
    if (!emergency) {
      const newTiming = calcAdaptiveTiming(vehicles);
      setTiming(newTiming);
    }
  }, [vehicles, emergency]);

  // Phase cycling
  useEffect(() => {
    clearInterval(timerRef.current);
    if (emergency) return;

    const currentPhase = PHASES[phase];
    const duration = timing[currentPhase];
    let elapsed = timer;

    timerRef.current = setInterval(() => {
      elapsed++;
      setTimer(elapsed);
      if (elapsed >= duration) {
        setTimer(0);
        setPhase(p => {
          const next = (p + 1) % PHASES.length;
          const nextPhase = PHASES[next];
          if (nextPhase === "NS_GREEN" || nextPhase === "EW_GREEN") {
            const t = calcAdaptiveTiming(vehicles);
            addLog(`AI adjusted: ${nextPhase === "NS_GREEN" ? "N/S" : "E/W"} green for ${t[nextPhase]}s based on density`, "ai");
            setTotalCleared(c => c + Math.floor(Math.random() * 8) + 3);
            setAvgWait(w => Math.max(8, Math.min(45, w + Math.floor(Math.random() * 6) - 3)));
            setEfficiency(e => Math.max(70, Math.min(98, e + Math.floor(Math.random() * 4) - 1)));
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timing, emergency, addLog]);

  // Emergency vehicle handler
  useEffect(() => {
    if (!emergency) return;
    addLog(`🚨 EMERGENCY: Ambulance detected on ${DIR_LABEL[emergencyDir]} approach`, "emergency");
    addLog(`AI computing fastest corridor route...`, "ai");
    setTimeout(() => addLog(`Green corridor ACTIVATED on ${DIR_LABEL[emergencyDir]} → intersection cleared`, "emergency"), 1200);

    let prog = 0;
    const iv = setInterval(() => {
      prog += 2;
      setEmergencyProgress(prog);
      if (prog >= 100) {
        clearInterval(iv);
        setEmergency(false);
        setEmergencyProgress(0);
        addLog(`✅ Emergency vehicle cleared. Normal operation resumed.`, "info");
      }
    }, 80);
    return () => clearInterval(iv);
  }, [emergency]);

  // Moving vehicle dots on the intersection canvas
  useEffect(() => {
    clearInterval(dotRef.current);
    const cx = 150, cy = 150;

    dotRef.current = setInterval(() => {
      const dirs = ["N", "S", "E", "W"];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const currentSignal = emergency
        ? (dir === emergencyDir ? "green" : "red")
        : SIGNAL_COLORS[PHASES[phase]][dir];

      if (currentSignal !== "green") return;

      const id = Date.now() + Math.random();
      const colors = ["#00e5ff", "#69ff47", "#ff6d00", "#e040fb", "#fff"];
      const color = colors[Math.floor(Math.random() * colors.length)];

      let startX, startY, endX, endY;
      if (dir === "N") { startX = cx - 8; startY = 300; endX = cx - 8; endY = cy - 20; }
      else if (dir === "S") { startX = cx + 8; startY = 0; endX = cx + 8; endY = cy + 20 + 150; }
      else if (dir === "E") { startX = 0; startY = cy - 8; endX = cx + 20 + 150; endY = cy - 8; }
      else { startX = 300; startY = cy + 8; endX = -10; endY = cy + 8; }

      setVehicleDots(prev => [...prev.slice(-30), { id, x: startX, y: startY, endX, endY, color }]);
      setTimeout(() => {
        setVehicleDots(prev => prev.map(d => d.id === id ? { ...d, x: endX, y: endY } : d));
        setTimeout(() => setVehicleDots(prev => prev.filter(d => d.id !== id)), 1500);
      }, 100);
    }, 600);
    return () => clearInterval(dotRef.current);
  }, [phase, emergency, emergencyDir]);

  const currentSignals = emergency
    ? { N: emergencyDir === "N" || emergencyDir === "S" ? "green" : "red", S: emergencyDir === "N" || emergencyDir === "S" ? "green" : "red", E: emergencyDir === "E" || emergencyDir === "W" ? "green" : "red", W: emergencyDir === "E" || emergencyDir === "W" ? "green" : "red" }
    : SIGNAL_COLORS[PHASES[phase]];

  const currentPhase = PHASES[phase];
  const duration = emergency ? 8 : timing[currentPhase];
  const progress = emergency ? emergencyProgress : Math.round((timer / duration) * 100);

  return (
    <div style={{
      background: "#050810",
      minHeight: "100vh",
      color: "#e0e8ff",
      fontFamily: "'Courier New', Courier, monospace",
      padding: "16px",
      userSelect: "none"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #ffffff11", paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#00e5ff", letterSpacing: 4, marginBottom: 2 }}>ALGOMASTERS // INDIA INNOVATES 2026</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>
            ◈ SMART TRAFFIC MANAGEMENT SYSTEM
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: emergency ? "#ff4444" : "#00ff88", boxShadow: emergency ? "0 0 8px #ff4444" : "0 0 8px #00ff88", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 10, color: emergency ? "#ff4444" : "#00ff88", letterSpacing: 2 }}>{emergency ? "EMERGENCY MODE" : "SYSTEM ACTIVE"}</span>
          </div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 1 }}>INTERSECTION: KOLHAPUR-01</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 260px", gap: 16 }}>

        {/* Left: Intersection Visual */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 4 }}>INTERSECTION VIEW</div>

          {/* Intersection canvas */}
          <div style={{ position: "relative", width: 300, height: 300, background: "#0a0f1a", borderRadius: 8, border: `1px solid ${emergency ? "#ff444444" : "#ffffff11"}`, overflow: "hidden" }}>
            {/* Roads */}
            {/* Vertical road */}
            <div style={{ position: "absolute", left: 120, top: 0, width: 60, height: 300, background: "#141820" }} />
            {/* Horizontal road */}
            <div style={{ position: "absolute", left: 0, top: 120, width: 300, height: 60, background: "#141820" }} />
            {/* Road markings */}
            {[30, 70, 110, 190, 230, 270].map(y => (
              <div key={y} style={{ position: "absolute", left: 148, top: y, width: 4, height: 14, background: "#ffffff22" }} />
            ))}
            {[30, 70, 110, 190, 230, 270].map(x => (
              <div key={x} style={{ position: "absolute", left: x, top: 148, width: 14, height: 4, background: "#ffffff22" }} />
            ))}
            {/* Intersection center */}
            <div style={{ position: "absolute", left: 120, top: 120, width: 60, height: 60, background: "#1a2030", border: "1px solid #ffffff08" }} />
            {/* Emergency overlay */}
            {emergency && (
              <div style={{ position: "absolute", inset: 0, background: "#ff440008", animation: "flash 0.5s infinite alternate", zIndex: 10, pointerEvents: "none" }} />
            )}

            {/* Vehicle dots */}
            {vehicleDots.map(d => (
              <VehicleDot key={d.id} x={d.x} y={d.y} color={d.color} />
            ))}

            {/* Traffic lights - positioned at each corner approach */}
            {/* North */}
            <div style={{ position: "absolute", left: 96, top: 88, zIndex: 20 }}>
              <TrafficLight color={currentSignals.N} dir="N" />
            </div>
            {/* South */}
            <div style={{ position: "absolute", left: 182, top: 195, zIndex: 20 }}>
              <TrafficLight color={currentSignals.S} dir="S" />
            </div>
            {/* East */}
            <div style={{ position: "absolute", left: 195, top: 96, zIndex: 20 }}>
              <TrafficLight color={currentSignals.E} dir="E" />
            </div>
            {/* West */}
            <div style={{ position: "absolute", left: 88, top: 182, zIndex: 20 }}>
              <TrafficLight color={currentSignals.W} dir="W" />
            </div>

            {/* Direction labels */}
            <div style={{ position: "absolute", left: 135, top: 6, fontSize: 9, color: DIR_COLORS.N, letterSpacing: 2 }}>N</div>
            <div style={{ position: "absolute", left: 135, top: 282, fontSize: 9, color: DIR_COLORS.S, letterSpacing: 2 }}>S</div>
            <div style={{ position: "absolute", right: 6, top: 145, fontSize: 9, color: DIR_COLORS.E, letterSpacing: 2 }}>E</div>
            <div style={{ position: "absolute", left: 6, top: 145, fontSize: 9, color: DIR_COLORS.W, letterSpacing: 2 }}>W</div>

            {/* Emergency vehicle icon */}
            {emergency && (
              <div style={{
                position: "absolute",
                left: emergencyDir === "E" || emergencyDir === "W" ? (emergencyDir === "E" ? 8 + emergencyProgress * 2.4 : 300 - 20 - emergencyProgress * 2.4) : 132,
                top: emergencyDir === "N" || emergencyDir === "S" ? (emergencyDir === "N" ? 8 + emergencyProgress * 2.4 : 300 - 20 - emergencyProgress * 2.4) : 132,
                fontSize: 16, zIndex: 30,
                filter: "drop-shadow(0 0 8px #ff4444)",
                transition: "left 0.08s linear, top 0.08s linear"
              }}>🚑</div>
            )}
          </div>

          {/* Phase indicator */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #ffffff11", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, marginBottom: 8 }}>CURRENT PHASE</div>
            <div style={{ fontSize: 14, color: emergency ? "#ff4444" : "#00e5ff", letterSpacing: 2, marginBottom: 8 }}>
              {emergency ? `🚨 EMERGENCY CORRIDOR` : currentPhase.replace("_", " ")}
            </div>
            <div style={{ background: "#0a0f1a", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${progress}%`,
                background: emergency ? "linear-gradient(90deg, #ff4444, #ff8800)" : currentPhase.includes("YELLOW") ? "#ffcc00" : currentPhase.includes("GREEN") ? "#00ff88" : "#ff2244",
                transition: "width 0.9s linear",
                boxShadow: emergency ? "0 0 8px #ff4444" : "0 0 8px #00ff8888"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 9, color: "#444" }}>{emergency ? "PROGRESS" : "ELAPSED"}</span>
              <span style={{ fontSize: 9, color: "#666" }}>{progress}% {!emergency && `/ ${duration}s`}</span>
            </div>
          </div>
        </div>

        {/* Center: Vehicle counts + controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 4 }}>LANE DENSITY MONITOR</div>

          {/* 4 direction bars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["N", "S", "E", "W"].map(dir => {
              const count = vehicles[dir];
              const pct = (count / 25) * 100;
              const sig = currentSignals[dir];
              return (
                <div key={dir} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${DIR_COLORS[dir]}22`,
                  borderRadius: 8, padding: "12px 14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: DIR_COLORS[dir], boxShadow: `0 0 6px ${DIR_COLORS[dir]}` }} />
                      <span style={{ fontSize: 11, color: DIR_COLORS[dir], letterSpacing: 2 }}>{DIR_LABEL[dir]}</span>
                    </div>
                    <div style={{
                      fontSize: 9, padding: "2px 7px", borderRadius: 10,
                      background: sig === "green" ? "#00ff8822" : sig === "yellow" ? "#ffcc0022" : "#ff224422",
                      color: sig === "green" ? "#00ff88" : sig === "yellow" ? "#ffcc00" : "#ff2244",
                      border: `1px solid ${sig === "green" ? "#00ff8844" : sig === "yellow" ? "#ffcc0044" : "#ff224444"}`,
                    }}>{sig?.toUpperCase()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{count}</span>
                    <span style={{ fontSize: 10, color: "#444" }}>vehicles</span>
                  </div>
                  <div style={{ background: "#0a0f1a", borderRadius: 3, height: 4 }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: `${pct}%`,
                      background: pct > 70 ? "#ff4444" : pct > 40 ? "#ffcc00" : "#00ff88",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <div style={{ marginTop: 5, fontSize: 9, color: "#444" }}>
                    DENSITY: {pct < 30 ? "LOW" : pct < 60 ? "MEDIUM" : "HIGH"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Timing display */}
          <div style={{ background: "rgba(0, 229, 255, 0.04)", border: "1px solid #00e5ff22", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: 3, marginBottom: 10 }}>⚡ AI-COMPUTED SIGNAL TIMING</div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["N/S GREEN", timing.NS_GREEN, "#00ff88"], ["N/S YELLOW", "4", "#ffcc00"], ["E/W GREEN", timing.EW_GREEN, "#00e5ff"], ["E/W YELLOW", "4", "#ffcc00"]].map(([label, val, color]) => (
                <div key={label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}s</div>
                  <div style={{ fontSize: 8, color: "#444", letterSpacing: 1, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: "#666", borderTop: "1px solid #ffffff08", paddingTop: 8 }}>
              ↻ Recalculated every cycle based on real-time vehicle density ratios
            </div>
          </div>

          {/* Emergency controls */}
          <div style={{ background: "rgba(255, 68, 68, 0.04)", border: "1px solid #ff444422", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: "#ff4444", letterSpacing: 3, marginBottom: 10 }}>🚨 EMERGENCY VEHICLE CONTROL</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["N", "S", "E", "W"].map(dir => (
                <button key={dir} onClick={() => setEmergencyDir(dir)} style={{
                  flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${emergencyDir === dir ? DIR_COLORS[dir] : "#333"}`,
                  background: emergencyDir === dir ? `${DIR_COLORS[dir]}22` : "transparent",
                  color: emergencyDir === dir ? DIR_COLORS[dir] : "#666",
                  cursor: "pointer", fontSize: 11, fontFamily: "inherit", letterSpacing: 1
                }}>{dir}</button>
              ))}
            </div>
            <button
              onClick={() => { if (!emergency) setEmergency(true); }}
              disabled={emergency}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                border: `1px solid ${emergency ? "#666" : "#ff4444"}`,
                background: emergency ? "#333" : "linear-gradient(135deg, #ff444422, #ff880022)",
                color: emergency ? "#666" : "#ff4444",
                cursor: emergency ? "not-allowed" : "pointer",
                fontSize: 11, fontFamily: "inherit", letterSpacing: 3,
                fontWeight: 700, transition: "all 0.2s"
              }}
            >
              {emergency ? `▶ CORRIDOR ACTIVE — ${Math.round(emergencyProgress)}%` : `◈ ACTIVATE GREEN CORRIDOR (${DIR_LABEL[emergencyDir]})`}
            </button>
          </div>
        </div>

        {/* Right: Stats + Log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 4 }}>PERFORMANCE METRICS</div>

          <StatCard label="Vehicles Cleared" value={totalCleared} unit="today" color="#00ff88" icon="◈" />
          <StatCard label="Avg Wait Time" value={avgWait} unit="seconds" color="#00e5ff" icon="⏱" />
          <StatCard label="Efficiency Score" value={efficiency} unit="%" color={efficiency > 85 ? "#69ff47" : efficiency > 70 ? "#ffcc00" : "#ff4444"} icon="⚡" />
          <StatCard label="Active Signals" value={4} unit="nodes" color="#e040fb" icon="◉" />

          {/* System log */}
          <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px solid #ffffff0a", borderRadius: 8, padding: 12, overflow: "hidden" }}>
            <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: 3, marginBottom: 8 }}>SYSTEM LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {log.slice().reverse().map((entry, i) => (
                <div key={i} style={{ fontSize: 9, lineHeight: 1.4, opacity: i > 5 ? 0.3 : 1 - i * 0.1 }}>
                  <span style={{ color: "#333" }}>{entry.t} </span>
                  <span style={{ color: entry.type === "emergency" ? "#ff4444" : entry.type === "ai" ? "#00e5ff" : "#666" }}>
                    {entry.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #ffffff08", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#333" }}>
        <span>ALGOMASTERS • KITCOEK • INDIA INNOVATES 2026</span>
        <span>AI ENGINE: ADAPTIVE SIGNAL CONTROL v1.0 • OPENCV + PYTHON BACKEND</span>
        <span style={{ color: "#00ff8844" }}>● LIVE SIMULATION</span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes flash { 0% { opacity:0; } 100% { opacity:1; } }
      `}</style>
    </div>
  );
}
