// F1 25 Telemetry Card — Lovelace Custom Element
// Part of the f1_25_telemetry_mc HACS integration
// Repo: https://github.com/cobragt2000/f1-25-telemetry-for-home-assistant-multi-console

const CARD_VERSION = "1.5.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KMH_TO_MPH = 0.621371;
const KG_TO_GAL  = 0.264172 / 0.75; // kg → litres → US gal (F1 fuel ~0.75 kg/L)
const C_TO_F     = c => Math.round((c * 9/5) + 32);

const COMPOUND_COLORS = {
  Soft:'#e8002d',C5:'#e8002d',C6:'#e8002d',
  Medium:'#ffcc00',C3:'#ffcc00',C4:'#ffcc00',
  Hard:'#e0e0e0',C1:'#e0e0e0',C2:'#e0e0e0',C0:'#e0e0e0',
  Inter:'#39ff14',Wet:'#00d2ff',
};

function tyreColor(wear) {
  const n = parseFloat(wear) || 0;
  if (n < 30) return '#39ff14';
  if (n < 60) return '#ffcc00';
  if (n < 80) return '#ff9500';
  return '#e8002d';
}

function brakeGlow(temp) {
  const n = parseFloat(temp) || 0;
  if (n < 200) return 'transparent';
  const intensity = Math.min(1, (n - 200) / 600);
  const r = Math.round(255 * intensity);
  return `rgba(${r},${Math.round(r*0.3)},0,${intensity.toFixed(2)})`;
}

function getSensors(prefix) {
  const p = prefix;
  return {
    speed:p+"speed",gear:p+"gear",rpm:p+"engine_rpm",
    throttle:p+"throttle",brake:p+"brake",
    suggested_gear:p+"suggested_gear",engine_temp:p+"engine_temperature",
    lap:p+"lap",position:p+"position",
    current_lap:p+"current_lap_time",last_lap:p+"last_lap",
    last_lap_time:p+"last_lap_time",fastest_lap_time:p+"fastest_lap_time",
    fastest_lap_drv:p+"fastest_lap",speed_trap:p+"speed_trap",
    delta_front:p+"delta_to_car_in_front",delta_leader:p+"delta_to_race_leader",
    pit_status:p+"pit_status",pit_stops:p+"pit_stops",
    penalties:p+"penalties",warnings:p+"warnings",
    cc_warnings:p+"corner_cutting_warnings",
    dt_pens:p+"drive_through_pens",sg_pens:p+"stop_go_pens",
    grid_pos:p+"grid_position",safety_car:p+"safety_car",
    track_temp:p+"track_temperature",weather:p+"weather",
    session_status:p+"session_status",start_lights:p+"start_lights",
    flag:p+"flag",track:p+"track",
    sc_count:p+"safety_car_count",vsc_count:p+"virtual_safety_car_count",
    rf_count:p+"red_flag_count",tc:p+"traction_control",
    abs:p+"anti_lock_brakes",fuel_mix:p+"fuel_mix",
    fuel_tank:p+"fuel_in_tank",fuel_laps:p+"fuel_laps",
    pit_lim:p+"pit_limiter",max_rpm:p+"max_rpm",
    drs_state:p+"drs_state",drs_allowed:p+"drs_allowed",
    drs_dist:p+"drs_activation_distance",
    compound:p+"tyre_compound",actual_compound:p+"actual_tyre_compound",
    tyre_age:p+"tyre_age",ers_store:p+"ers_store",ers_mode:p+"ers_mode",
    ice_power:p+"engine_power_ice",mguk_power:p+"engine_power_mgu_k",
    ers_harv_h:p+"ers_harvested_mgu_h",ers_deploy:p+"ers_deployed_this_lap",
    leader:p+"leader",
    tw_rl:p+"tyre_wear_rear_left",   tt_rl:p+"tyre_temp_rear_left",
    ti_rl:p+"tyre_inner_temp_rear_left", tp_rl:p+"tyre_pressure_rear_left",
    tw_rr:p+"tyre_wear_rear_right",  tt_rr:p+"tyre_temp_rear_right",
    ti_rr:p+"tyre_inner_temp_rear_right",tp_rr:p+"tyre_pressure_rear_right",
    tw_fl:p+"tyre_wear_front_left",  tt_fl:p+"tyre_temp_front_left",
    ti_fl:p+"tyre_inner_temp_front_left",tp_fl:p+"tyre_pressure_front_left",
    tw_fr:p+"tyre_wear_front_right", tt_fr:p+"tyre_temp_front_right",
    ti_fr:p+"tyre_inner_temp_front_right",tp_fr:p+"tyre_pressure_front_right",
    tdmg_fl:p+"tyre_damage_front_left",  tdmg_fr:p+"tyre_damage_front_right",
    tdmg_rl:p+"tyre_damage_rear_left",   tdmg_rr:p+"tyre_damage_rear_right",
    tbl_fl:p+"tyre_blisters_front_left", tbl_fr:p+"tyre_blisters_front_right",
    tbl_rl:p+"tyre_blisters_rear_left",  tbl_rr:p+"tyre_blisters_rear_right",
    bt_fl:p+"brake_temp_front_left", bt_fr:p+"brake_temp_front_right",
    bt_rl:p+"brake_temp_rear_left",  bt_rr:p+"brake_temp_rear_right",
    bd_fl:p+"brake_damage_front_left",bd_fr:p+"brake_damage_front_right",
    bd_rl:p+"brake_damage_rear_left", bd_rr:p+"brake_damage_rear_right",
    dmg_flw:p+"damaged_front_left_wing",dmg_frw:p+"damaged_front_right_wing",
    dmg_rw:p+"damaged_rear_wing",dmg_floor:p+"damaged_floor",
    dmg_diff:p+"diffuser_damage",dmg_side:p+"sidepod_damage",
    drs_fault:p+"drs_fault",ers_fault:p+"ers_fault",
    gb_dmg:p+"gearbox_damage",eng_dmg:p+"engine_damage",
    eng_blown:p+"engine_blown",eng_seize:p+"engine_seized",
    we_ice:p+"engine_ice_wear",we_mguh:p+"engine_mgu_h_wear",
    we_mguk:p+"engine_mgu_k_wear",we_es:p+"engine_es_wear",
    we_ce:p+"engine_ce_wear",we_tc:p+"engine_tc_wear",
  };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CARD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  :host { display:block; font-family:'Share Tech Mono',monospace; }
  *{box-sizing:border-box;margin:0;padding:0;}
  .card{background:var(--f1-bg,#0a0a0f);border:1px solid var(--f1-border,#2a2a3a);border-radius:4px;padding:12px;user-select:none;color:var(--f1-text,#e0e0f0);}
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--f1-border,#2a2a3a);}
  .header-left{display:flex;align-items:center;gap:10px;}
  .title{font-family:'Orbitron',sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;color:var(--f1-accent,#e8002d);text-transform:uppercase;}
  .console-select{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);color:var(--f1-text,#e0e0f0);font-family:'Share Tech Mono',monospace;font-size:11px;padding:3px 8px;border-radius:3px;cursor:pointer;outline:none;}
  .status-bar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;}
  .status-pill{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:2px 8px;font-size:10px;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:5px;}
  .status-pill .dot{width:6px;height:6px;border-radius:50%;background:var(--f1-text-dim,#6a6a8a);flex-shrink:0;}
  .status-pill.active .dot{background:var(--f1-ok,#39ff14);box-shadow:0 0 6px var(--f1-ok,#39ff14);}
  .status-pill.warn .dot{background:var(--f1-warn,#ff9500);box-shadow:0 0 6px var(--f1-warn,#ff9500);}
  .status-pill.danger .dot{background:var(--f1-accent,#e8002d);box-shadow:0 0 6px var(--f1-accent,#e8002d);}
  .main{display:grid;grid-template-columns:170px 1fr 170px;gap:8px;align-items:start;}
  .panel{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:3px;padding:8px;display:flex;flex-direction:column;gap:5px;}
  .panel-title{font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:2px;color:var(--f1-accent,#e8002d);text-transform:uppercase;padding-bottom:4px;border-bottom:1px solid var(--f1-border,#2a2a3a);margin-bottom:2px;}
  .data-row{display:flex;justify-content:space-between;align-items:center;gap:6px;}
  .data-label{font-size:10px;color:var(--f1-text-dim,#6a6a8a);white-space:nowrap;flex-shrink:0;}
  .data-value{font-size:13px;color:var(--f1-text,#e0e0f0);text-align:right;font-weight:bold;}
  .data-value.warn{color:var(--f1-warn,#ff9500);}
  .data-value.danger{color:var(--f1-accent,#e8002d);}
  .data-value.ok{color:var(--f1-ok,#39ff14);}
  .data-value.info{color:var(--f1-accent2,#00d2ff);}
  .bar-wrap{display:flex;flex-direction:column;gap:2px;}
  .bar-header{display:flex;justify-content:space-between;font-size:9px;}
  .bar-label{color:var(--f1-text-dim,#6a6a8a);}
  .bar-val{color:var(--f1-text,#e0e0f0);font-weight:bold;}
  .bar-track{height:4px;background:#1a1a28;border-radius:2px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:2px;transition:width 0.3s ease;}
  .bar-fill.ok{background:var(--f1-ok,#39ff14);}
  .bar-fill.warn{background:var(--f1-warn,#ff9500);}
  .bar-fill.danger{background:var(--f1-accent,#e8002d);}
  .bar-fill.info{background:var(--f1-accent2,#00d2ff);}
  .car-area{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;}
  .car-svg-wrap{position:relative;width:100%;}
  .car-svg-wrap svg{width:100%;height:auto;display:block;}
  .tyre-badge{position:absolute;background:#0f0f1a;border:1px solid var(--f1-border,#2a2a3a);border-radius:3px;padding:3px 5px;font-size:9px;line-height:1.4;pointer-events:none;min-width:54px;}
  .tyre-badge .t-label{color:var(--f1-text-dim,#6a6a8a);font-size:8px;letter-spacing:1px;}
  .tyre-badge .t-wear{font-weight:bold;}
  .tyre-badge .t-temp{color:var(--f1-accent2,#00d2ff);}
  .tyre-badge .t-press{color:var(--f1-text-dim,#6a6a8a);font-size:8px;}
  .tyre-fl{top:18%;left:-2px;}
  .tyre-fr{top:18%;right:-2px;text-align:right;}
  .tyre-rl{bottom:12%;left:-2px;}
  .tyre-rr{bottom:12%;right:-2px;text-align:right;}
  .hud-strip{display:flex;gap:6px;width:100%;justify-content:center;}
  .hud-box{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:3px;padding:6px 10px;text-align:center;flex:1;}
  .hud-val{font-family:'Orbitron',sans-serif;font-size:28px;font-weight:900;line-height:1;color:var(--f1-text,#e0e0f0);}
  .hud-val.accent{color:var(--f1-accent,#e8002d);}
  .hud-val.info{color:var(--f1-accent2,#00d2ff);}
  .hud-lbl{font-size:8px;color:var(--f1-text-dim,#6a6a8a);letter-spacing:2px;text-transform:uppercase;margin-top:2px;}
  .rpm-strip{width:100%;display:flex;flex-direction:column;gap:2px;}
  .rpm-leds{display:flex;gap:2px;height:8px;}
  .rpm-led{flex:1;border-radius:1px;background:#1a1a28;transition:background 0.1s;}
  .bottom-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:8px;}
  .wear-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;}
  .wear-chip{background:#0a0a14;border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:3px 4px;text-align:center;}
  .wear-chip .wc-label{font-size:8px;color:var(--f1-text-dim,#6a6a8a);}
  .wear-chip .wc-val{font-size:11px;font-weight:bold;}
  .settings-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center;}
  .settings-overlay.open{display:flex;}
  .settings-box{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:6px;padding:20px;min-width:300px;max-width:440px;width:90%;max-height:90vh;overflow-y:auto;}
  .settings-title{font-family:'Orbitron',sans-serif;font-size:13px;color:var(--f1-accent,#e8002d);letter-spacing:2px;margin-bottom:16px;}
  .setting-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;}
  .setting-row label{font-size:11px;color:var(--f1-text-dim,#6a6a8a);white-space:nowrap;}
  .setting-row input[type=color]{width:40px;height:24px;border:1px solid var(--f1-border,#2a2a3a);background:none;cursor:pointer;border-radius:2px;padding:1px;}
  .setting-row input[type=text],.setting-row input[type=number]{background:var(--f1-bg,#0a0a0f);border:1px solid var(--f1-border,#2a2a3a);color:var(--f1-text,#e0e0f0);font-family:'Share Tech Mono',monospace;font-size:11px;padding:3px 6px;border-radius:2px;width:140px;outline:none;}
  .settings-actions{display:flex;gap:8px;margin-top:16px;justify-content:flex-end;}
  .btn{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:1px;padding:6px 14px;border:1px solid var(--f1-border,#2a2a3a);background:var(--f1-panel,#111118);color:var(--f1-text,#e0e0f0);cursor:pointer;border-radius:2px;text-transform:uppercase;}
  .btn.primary{background:var(--f1-accent,#e8002d);border-color:var(--f1-accent,#e8002d);color:#fff;}
  .btn:hover{opacity:0.8;}
  .section-divider{font-size:9px;color:var(--f1-text-dim,#6a6a8a);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--f1-border,#2a2a3a);padding-bottom:4px;margin:10px 0 6px;}
`;

// ─── HTML template ─────────────────────────────────────────────────────────────
function buildHTML() {
  return `
<div class="card">
  <div class="header">
    <div class="header-left">
      <span class="title">F1·25 TELEMETRY</span>
      <select class="console-select" id="consoleSelect">
        <option value="1">Console 1</option>
        <option value="2">Console 2</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <span id="trackName" style="font-size:11px;color:var(--f1-accent2,#00d2ff);letter-spacing:1px">—</span>
      <button class="btn" id="cfgBtn" style="padding:3px 8px;font-size:8px">⚙ CONFIG</button>
    </div>
  </div>

  <div class="status-bar">
    <div class="status-pill" id="pill-session"><span class="dot"></span><span id="pill-session-txt">SESSION</span></div>
    <div class="status-pill" id="pill-sc"><span class="dot"></span><span id="pill-sc-txt">NO SC</span></div>
    <div class="status-pill" id="pill-flag"><span class="dot"></span><span id="pill-flag-txt">GREEN</span></div>
    <div class="status-pill" id="pill-drs"><span class="dot"></span>DRS <span id="pill-drs-txt">OFF</span></div>
    <div class="status-pill" id="pill-pit"><span class="dot"></span><span id="pill-pit-txt">ON TRACK</span></div>
    <div class="status-pill" id="pill-tc"><span class="dot"></span>TC: <span id="pill-tc-txt">—</span></div>
    <div class="status-pill" id="pill-abs"><span class="dot"></span>ABS: <span id="pill-abs-txt">—</span></div>
  </div>

  <div class="main">
    <!-- LEFT -->
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div class="panel">
        <div class="panel-title">RACE INFO</div>
        <div class="data-row"><span class="data-label">POS</span><span class="data-value accent" id="v-pos">—</span></div>
        <div class="data-row"><span class="data-label">LAP</span><span class="data-value" id="v-lap">—</span></div>
        <div class="data-row"><span class="data-label">GRID</span><span class="data-value" id="v-grid">—</span></div>
        <div class="data-row"><span class="data-label">GAP AHEAD</span><span class="data-value info" id="v-delta-front">—</span></div>
        <div class="data-row"><span class="data-label">GAP LEADER</span><span class="data-value info" id="v-delta-leader">—</span></div>
        <div class="data-row"><span class="data-label">LEADER</span><span class="data-value" id="v-leader" style="font-size:10px">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">LAP TIMES</div>
        <div class="data-row"><span class="data-label">CURRENT</span><span class="data-value ok" id="v-cur-lap">—</span></div>
        <div class="data-row"><span class="data-label">LAST</span><span class="data-value" id="v-last-lap">—</span></div>
        <div class="data-row"><span class="data-label">FASTEST</span><span class="data-value accent" id="v-fastest">—</span></div>
        <div class="data-row"><span class="data-label">FASTEST BY</span><span class="data-value" id="v-fastest-drv" style="font-size:10px">—</span></div>
        <div class="data-row"><span class="data-label">SPEED TRAP</span><span class="data-value" id="v-speed-trap">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">PENALTIES</div>
        <div class="data-row"><span class="data-label">PEN TIME</span><span class="data-value warn" id="v-penalties">0s</span></div>
        <div class="data-row"><span class="data-label">WARNINGS</span><span class="data-value" id="v-warnings">0</span></div>
        <div class="data-row"><span class="data-label">CORNER CUT</span><span class="data-value" id="v-cc-warns">0</span></div>
        <div class="data-row"><span class="data-label">DT PENS</span><span class="data-value warn" id="v-dt-pens">0</span></div>
        <div class="data-row"><span class="data-label">SG PENS</span><span class="data-value warn" id="v-sg-pens">0</span></div>
        <div class="data-row"><span class="data-label">PIT STOPS</span><span class="data-value" id="v-pit-stops">0</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">SESSION COUNTS</div>
        <div class="data-row"><span class="data-label">SAFETY CAR</span><span class="data-value" id="v-sc-count">0</span></div>
        <div class="data-row"><span class="data-label">VIRT SC</span><span class="data-value" id="v-vsc-count">0</span></div>
        <div class="data-row"><span class="data-label">RED FLAGS</span><span class="data-value danger" id="v-rf-count">0</span></div>
      </div>
    </div>

    <!-- CENTRE -->
    <div class="car-area">
      <div class="hud-strip">
        <div class="hud-box"><div class="hud-val accent" id="v-speed">0</div><div class="hud-lbl" id="lbl-speed">KM/H</div></div>
        <div class="hud-box"><div class="hud-val info" id="v-gear">N</div><div class="hud-lbl">GEAR</div></div>
        <div class="hud-box"><div class="hud-val" id="v-rpm" style="font-size:20px">0</div><div class="hud-lbl">RPM</div></div>
        <div class="hud-box"><div class="hud-val" id="v-sg" style="font-size:20px;color:var(--f1-warn,#ff9500)">—</div><div class="hud-lbl">SUG GEAR</div></div>
      </div>
      <div class="rpm-strip"><div class="rpm-leds" id="rpmLeds"></div></div>
      <div style="display:flex;flex-direction:column;gap:3px;width:100%;padding:0 4px;">
        <div class="bar-wrap">
          <div class="bar-header"><span class="bar-label">THROTTLE</span><span class="bar-val" id="v-throttle-pct">0%</span></div>
          <div class="bar-track"><div class="bar-fill ok" id="bar-throttle" style="width:0%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-header"><span class="bar-label">BRAKE</span><span class="bar-val" id="v-brake-pct">0%</span></div>
          <div class="bar-track"><div class="bar-fill danger" id="bar-brake" style="width:0%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-header"><span class="bar-label">ERS STORE</span><span class="bar-val" id="v-ers-pct">0%</span></div>
          <div class="bar-track"><div class="bar-fill info" id="bar-ers" style="width:0%"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-header"><span class="bar-label">FUEL LAPS</span><span class="bar-val" id="v-fuel-laps">0.00</span></div>
          <div class="bar-track"><div class="bar-fill warn" id="bar-fuel" style="width:0%"></div></div>
        </div>
      </div>

      <div class="car-svg-wrap">
        <div class="tyre-badge tyre-fl">
          <div class="t-label">FL</div>
          <div class="t-wear" id="tw-fl">—</div>
          <div class="t-temp" id="tt-fl">—</div>
          <div class="t-press" id="tp-fl">—</div>
          <div class="t-press" id="tdmg-fl">—</div>
          <div class="t-press" id="tbl-fl">—</div>
        </div>
        <div class="tyre-badge tyre-fr">
          <div class="t-label">FR</div>
          <div class="t-wear" id="tw-fr">—</div>
          <div class="t-temp" id="tt-fr">—</div>
          <div class="t-press" id="tp-fr">—</div>
          <div class="t-press" id="tdmg-fr">—</div>
          <div class="t-press" id="tbl-fr">—</div>
        </div>
        <div class="tyre-badge tyre-rl">
          <div class="t-label">RL</div>
          <div class="t-wear" id="tw-rl">—</div>
          <div class="t-temp" id="tt-rl">—</div>
          <div class="t-press" id="tp-rl">—</div>
          <div class="t-press" id="tdmg-rl">—</div>
          <div class="t-press" id="tbl-rl">—</div>
        </div>
        <div class="tyre-badge tyre-rr">
          <div class="t-label">RR</div>
          <div class="t-wear" id="tw-rr">—</div>
          <div class="t-temp" id="tt-rr">—</div>
          <div class="t-press" id="tp-rr">—</div>
          <div class="t-press" id="tdmg-rr">—</div>
          <div class="t-press" id="tbl-rr">—</div>
        </div>

        <svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg" style="padding:0 30px;">
          <ellipse cx="100" cy="210" rx="36" ry="160" fill="#050508"/>
          <path d="M72 60 Q65 40 80 22 Q100 10 120 22 Q135 40 128 60 L130 200 Q130 240 128 260 L120 310 Q110 340 100 345 Q90 340 80 310 L72 260 Q70 240 70 200 Z" fill="#1a1a2e" stroke="#2a2a4a" stroke-width="1.5"/>
          <path d="M84 130 Q84 110 100 108 Q116 110 116 130 L116 190 Q116 200 100 202 Q84 200 84 190 Z" fill="#0d0d1a" stroke="#333355" stroke-width="1"/>
          <ellipse cx="100" cy="150" rx="12" ry="18" fill="#00d2ff22" stroke="#00d2ff55" stroke-width="1"/>
          <path d="M87 138 Q100 130 113 138" fill="none" stroke="#888" stroke-width="3" stroke-linecap="round"/>
          <rect x="52" y="48" width="96" height="12" rx="2" fill="#111122" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="50" y="38" width="8" height="26" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="142" y="38" width="8" height="26" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <path d="M54 60 L146 60 L148 70 L52 70 Z" fill="#0d0d20" stroke="#2a2a3a" stroke-width="0.5"/>
          <path d="M68 160 Q58 162 56 200 Q56 240 60 260 L72 260 L70 200 Z" fill="#141428" stroke="#2a2a4a" stroke-width="1"/>
          <path d="M132 160 Q142 162 144 200 Q144 240 140 260 L128 260 L130 200 Z" fill="#141428" stroke="#2a2a4a" stroke-width="1"/>
          <ellipse cx="100" cy="124" rx="8" ry="6" fill="#050508" stroke="#333355" stroke-width="1"/>
          <rect x="55" y="290" width="90" height="10" rx="2" fill="#111122" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="55" y="290" width="90" height="10" rx="2" fill="transparent" stroke="transparent" id="drs-wing"/>
          <rect x="52" y="282" width="7" height="22" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="141" y="282" width="7" height="22" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <ellipse cx="100" cy="330" rx="6" ry="4" fill="#050508" stroke="#444" stroke-width="1"/>
          <path d="M96 22 L96 340" stroke="#e8002d22" stroke-width="2"/>
          <path d="M104 22 L104 340" stroke="#e8002d22" stroke-width="2"/>
          <rect x="40" y="60" width="22" height="42" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-tfl"/>
          <rect x="43" y="64" width="16" height="34" rx="2" fill="#252525"/>
          <rect x="138" y="60" width="22" height="42" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-tfr"/>
          <rect x="141" y="64" width="16" height="34" rx="2" fill="#252525"/>
          <rect x="34" y="270" width="26" height="48" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-trl"/>
          <rect x="38" y="274" width="18" height="40" rx="2" fill="#252525"/>
          <rect x="140" y="270" width="26" height="48" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-trr"/>
          <rect x="144" y="274" width="18" height="40" rx="2" fill="#252525"/>
          <circle cx="51" cy="81" r="5" fill="transparent" id="brake-fl" opacity="0.7"/>
          <circle cx="149" cy="81" r="5" fill="transparent" id="brake-fr" opacity="0.7"/>
          <circle cx="47" cy="294" r="6" fill="transparent" id="brake-rl" opacity="0.7"/>
          <circle cx="153" cy="294" r="6" fill="transparent" id="brake-rr" opacity="0.7"/>
        </svg>
      </div>

      <div style="display:flex;gap:6px;width:100%;justify-content:center;">
        <div class="hud-box" style="flex:0 0 auto;padding:4px 10px;">
          <div style="font-size:18px;font-weight:900;font-family:'Orbitron'" id="v-compound">—</div>
          <div class="hud-lbl">COMPOUND</div>
        </div>
        <div class="hud-box" style="flex:0 0 auto;padding:4px 10px;">
          <div style="font-size:18px;font-weight:900;font-family:'Orbitron'" id="v-tyre-age">—</div>
          <div class="hud-lbl">TYRE AGE</div>
        </div>
        <div class="hud-box" style="flex:0 0 auto;padding:4px 10px;">
          <div style="font-size:18px;font-weight:900;font-family:'Orbitron'" id="v-track-temp">—</div>
          <div class="hud-lbl" id="lbl-track-temp">TRACK °C</div>
        </div>
        <div class="hud-box" style="flex:0 0 auto;padding:4px 10px;">
          <div style="font-size:18px;font-weight:900;font-family:'Orbitron'" id="v-engine-temp">—</div>
          <div class="hud-lbl" id="lbl-eng-temp">ENG °C</div>
        </div>
      </div>
    </div>

    <!-- RIGHT -->
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div class="panel">
        <div class="panel-title">POWER UNIT</div>
        <div class="data-row"><span class="data-label">ERS MODE</span><span class="data-value info" id="v-ers-mode">—</span></div>
        <div class="data-row"><span class="data-label">ERS HARV H</span><span class="data-value" id="v-ers-harv-h">—</span></div>
        <div class="data-row"><span class="data-label">ERS DEPLOY</span><span class="data-value warn" id="v-ers-deploy">—</span></div>
        <div class="data-row"><span class="data-label">ICE POWER</span><span class="data-value" id="v-ice-power">—</span></div>
        <div class="data-row"><span class="data-label">MGUK PWR</span><span class="data-value" id="v-mguk-power">—</span></div>
        <div class="data-row"><span class="data-label">MAX RPM</span><span class="data-value" id="v-max-rpm">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">FUEL</div>
        <div class="data-row"><span class="data-label">IN TANK</span><span class="data-value" id="v-fuel-tank">—</span></div>
        <div class="data-row"><span class="data-label">FUEL MIX</span><span class="data-value warn" id="v-fuel-mix">—</span></div>
        <div class="data-row"><span class="data-label">PIT LIMITER</span><span class="data-value" id="v-pit-lim">—</span></div>
        <div class="data-row"><span class="data-label">DRS DIST</span><span class="data-value info" id="v-drs-dist">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">DAMAGE</div>
        <div class="data-row"><span class="data-label">FRONT WING</span><span class="data-value ok" id="v-fw-dmg">OK</span></div>
        <div class="data-row"><span class="data-label">REAR WING</span><span class="data-value ok" id="v-rw-dmg">OK</span></div>
        <div class="data-row"><span class="data-label">FLOOR</span><span class="data-value ok" id="v-floor-dmg">OK</span></div>
        <div class="data-row"><span class="data-label">DIFFUSER</span><span class="data-value ok" id="v-diff-dmg">0%</span></div>
        <div class="data-row"><span class="data-label">SIDEPOD</span><span class="data-value ok" id="v-side-dmg">0%</span></div>
        <div class="data-row"><span class="data-label">GEARBOX</span><span class="data-value ok" id="v-gb-dmg">0%</span></div>
        <div class="data-row"><span class="data-label">ENGINE</span><span class="data-value ok" id="v-eng-dmg">0%</span></div>
        <div class="data-row"><span class="data-label">DRS FAULT</span><span class="data-value ok" id="v-drs-fault">OK</span></div>
        <div class="data-row"><span class="data-label">ERS FAULT</span><span class="data-value ok" id="v-ers-fault">OK</span></div>
        <div class="data-row"><span class="data-label">ENGINE</span><span class="data-value ok" id="v-eng-status">OK</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">ENGINE WEAR</div>
        <div class="wear-grid">
          <div class="wear-chip"><div class="wc-label">ICE</div><div class="wc-val" id="we-ice">0%</div></div>
          <div class="wear-chip"><div class="wc-label">MGU-H</div><div class="wc-val" id="we-mguh">0%</div></div>
          <div class="wear-chip"><div class="wc-label">MGU-K</div><div class="wc-val" id="we-mguk">0%</div></div>
          <div class="wear-chip"><div class="wc-label">ES</div><div class="wc-val" id="we-es">0%</div></div>
          <div class="wear-chip"><div class="wc-label">CE</div><div class="wc-val" id="we-ce">0%</div></div>
          <div class="wear-chip"><div class="wc-label">TC</div><div class="wc-val" id="we-tc">0%</div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="bottom-row">
    <div class="panel">
      <div class="panel-title">BRAKES FL</div>
      <div class="bar-wrap">
        <div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-fl">—</span></div>
        <div class="bar-track"><div class="bar-fill warn" id="bar-bt-fl" style="width:0%"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:4px;">
        <div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-fl">0%</span></div>
        <div class="bar-track"><div class="bar-fill danger" id="bar-bd-fl" style="width:0%"></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES FR</div>
      <div class="bar-wrap">
        <div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-fr">—</span></div>
        <div class="bar-track"><div class="bar-fill warn" id="bar-bt-fr" style="width:0%"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:4px;">
        <div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-fr">0%</span></div>
        <div class="bar-track"><div class="bar-fill danger" id="bar-bd-fr" style="width:0%"></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES RL</div>
      <div class="bar-wrap">
        <div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-rl">—</span></div>
        <div class="bar-track"><div class="bar-fill warn" id="bar-bt-rl" style="width:0%"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:4px;">
        <div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-rl">0%</span></div>
        <div class="bar-track"><div class="bar-fill danger" id="bar-bd-rl" style="width:0%"></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES RR</div>
      <div class="bar-wrap">
        <div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-rr">—</span></div>
        <div class="bar-track"><div class="bar-fill warn" id="bar-bt-rr" style="width:0%"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:4px;">
        <div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-rr">0%</span></div>
        <div class="bar-track"><div class="bar-fill danger" id="bar-bd-rr" style="width:0%"></div></div>
      </div>
    </div>
  </div>
</div>

<!-- Settings overlay — inside shadow DOM so it overlays the card -->
<div class="settings-overlay" id="settingsOverlay">
  <div class="settings-box">
    <div class="settings-title">⚙ CONFIGURATION</div>
    <div class="section-divider">CONSOLE ENTITY PREFIX</div>
    <div class="setting-row"><label>Console 1 prefix</label><input type="text" id="cfg-prefix1" placeholder="sensor.f1_25_game_port_20777_"></div>
    <div class="setting-row"><label>Console 2 prefix</label><input type="text" id="cfg-prefix2" placeholder="sensor.f1_25_game_port_20778_"></div>
    <div class="section-divider">COLORS</div>
    <div class="setting-row"><label>Accent (speed/pos)</label><input type="color" id="cfg-accent" value="#e8002d"></div>
    <div class="setting-row"><label>Info (deltas/DRS)</label><input type="color" id="cfg-accent2" value="#00d2ff"></div>
    <div class="setting-row"><label>Warning</label><input type="color" id="cfg-warn" value="#ff9500"></div>
    <div class="setting-row"><label>OK / Safe</label><input type="color" id="cfg-ok" value="#39ff14"></div>
    <div class="setting-row"><label>Background</label><input type="color" id="cfg-bg" value="#0a0a0f"></div>
    <div class="setting-row"><label>Panel background</label><input type="color" id="cfg-panel" value="#111118"></div>
    <div class="section-divider">REFRESH</div>
    <div class="setting-row"><label>Update interval (ms)</label><input type="number" id="cfg-interval" value="500" min="100" max="5000" step="100"></div>
    <div class="settings-actions">
      <button class="btn" id="cfgCancel">CANCEL</button>
      <button class="btn primary" id="cfgSave">SAVE &amp; APPLY</button>
    </div>
  </div>
</div>
`;
}

// ─── Custom Element ────────────────────────────────────────────────────────────
class F1TelemetryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass       = null;
    this._config     = {};
    this._pollTimer  = null;
    this._console    = 1;
    this._cfg = {
      prefix1:  "sensor.f1_25_game_port_20777_",
      prefix2:  "sensor.f1_25_game_port_20778_",
      accent:   "#e8002d", accent2: "#00d2ff",
      warn:     "#ff9500", ok:      "#39ff14",
      bg:       "#0a0a0f", panel:   "#111118",
      interval: 500,
    };
    this._built = false;
  }

  // Called by HA with the card config from YAML
  setConfig(config) {
    this._config = config;
    // Allow YAML overrides: console: 1 or 2, prefix1/prefix2, colors, interval
    if (config.console)   this._console  = parseInt(config.console) || 1;
    if (config.prefix1)   this._cfg.prefix1  = config.prefix1;
    if (config.prefix2)   this._cfg.prefix2  = config.prefix2;
    if (config.accent)    this._cfg.accent   = config.accent;
    if (config.accent2)   this._cfg.accent2  = config.accent2;
    if (config.warn)      this._cfg.warn     = config.warn;
    if (config.ok)        this._cfg.ok       = config.ok;
    if (config.bg)        this._cfg.bg       = config.bg;
    if (config.panel)     this._cfg.panel    = config.panel;
    if (config.interval)  this._cfg.interval = parseInt(config.interval) || 500;

    // Load localStorage overrides (from in-card settings UI)
    try {
      const saved = localStorage.getItem('f1card_cfg');
      if (saved) this._cfg = { ...this._cfg, ...JSON.parse(saved) };
    } catch(e) {}

    if (!this._built) this._build();
    this._applyColors();
    this._restartPoll();
  }

  set hass(hass) {
    this._hass = hass;
  }

  // Required by HA — card size in grid units
  getCardSize() { return 12; }

  // Static method for the visual card editor (optional but good practice)
  static getConfigElement() { return null; }

  static getStubConfig() {
    return { console: 1, prefix1: "sensor.f1_25_game_port_20777_", prefix2: "sensor.f1_25_game_port_20778_" };
  }

  // ── Build shadow DOM ─────────────────────────────────────────────────────────
  _build() {
    this._built = true;
    const style = document.createElement('style');
    style.textContent = CARD_CSS;
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildHTML();
    this.shadowRoot.appendChild(wrapper);

    // Build RPM LEDs
    const ledsEl = this._q('rpmLeds');
    if (ledsEl) {
      for (let i = 0; i < 20; i++) {
        const d = document.createElement('div');
        d.className = 'rpm-led';
        d.id = `rled${i}`;
        ledsEl.appendChild(d);
      }
    }

    // Wire up console select
    const sel = this._q('consoleSelect');
    if (sel) {
      sel.value = String(this._console);
      sel.addEventListener('change', e => {
        this._console = parseInt(e.target.value);
        this._update();
      });
    }

    // Wire up settings button
    this._q('cfgBtn')?.addEventListener('click', () => this._openSettings());
    this._q('cfgCancel')?.addEventListener('click', () => this._closeSettings());
    this._q('cfgSave')?.addEventListener('click', () => this._saveSettings());
  }

  // ── Shadow DOM query helper ──────────────────────────────────────────────────
  _q(id) { return this.shadowRoot.getElementById(id); }

  // ── Colors ───────────────────────────────────────────────────────────────────
  _applyColors() {
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;
    const c = this._cfg;
    card.style.setProperty('--f1-accent',  c.accent);
    card.style.setProperty('--f1-accent2', c.accent2);
    card.style.setProperty('--f1-warn',    c.warn);
    card.style.setProperty('--f1-ok',      c.ok);
    card.style.setProperty('--f1-bg',      c.bg);
    card.style.setProperty('--f1-panel',   c.panel);
  }

  // ── Polling ──────────────────────────────────────────────────────────────────
  _restartPoll() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._update();
    this._pollTimer = setInterval(() => this._update(), this._cfg.interval);
  }

  disconnectedCallback() {
    if (this._pollTimer) clearInterval(this._pollTimer);
  }

  // ── Main update ──────────────────────────────────────────────────────────────
  _update() {
    if (!this._hass) return;
    const prefix = this._console === 1 ? this._cfg.prefix1 : this._cfg.prefix2;
    const sensors = getSensors(prefix);
    // Read states directly from hass object — no HTTP needed
    const v = {};
    for (const [k, id] of Object.entries(sensors)) {
      const state = this._hass.states[id];
      v[k] = state ? state.state : null;
    }
    this._render(v);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  _render(v) {
    const q  = (id) => this._q(id);
    const sv = (id, val, cls) => {
      const el = q(id);
      if (!el) return;
      el.textContent = val ?? '—';
      if (cls !== undefined) el.className = 'data-value ' + (cls || '');
    };
    const pct = (id, val, max) => {
      const el = q(id);
      if (el) el.style.width = Math.min(100, Math.max(0, (parseFloat(val)||0) / max * 100)) + '%';
    };
    const dmgClass = n => n === 0 ? 'ok' : n < 25 ? '' : n < 60 ? 'warn' : 'danger';

    // Speed / Gear / RPM
    q('v-speed') && (q('v-speed').textContent = v.speed ? Math.round(parseFloat(v.speed)) : '0');
    q('v-gear')  && (q('v-gear').textContent  = v.gear ?? 'N');
    q('v-rpm')   && (q('v-rpm').textContent   = v.rpm  ? parseInt(v.rpm).toLocaleString() : '0');
    q('v-sg')    && (q('v-sg').textContent    = v.suggested_gear && v.suggested_gear !== 'None' ? v.suggested_gear : '—');

    // RPM LEDs
    const maxRpm = parseInt(v.max_rpm) || 14000;
    const rpmFrac = (parseInt(v.rpm)||0) / maxRpm;
    const litLeds = Math.round(rpmFrac * 20);
    for (let i = 0; i < 20; i++) {
      const led = q(`rled${i}`);
      if (!led) continue;
      led.style.background = i < litLeds
        ? (i/20 < 0.6 ? this._cfg.ok : i/20 < 0.8 ? this._cfg.warn : this._cfg.accent)
        : '#1a1a28';
    }

    // Bars
    const thr = parseFloat(v.throttle)||0;
    const brk = parseFloat(v.brake)||0;
    const ers = parseFloat(v.ers_store)||0;
    const fl  = parseFloat(v.fuel_laps)||0;
    q('v-throttle-pct') && (q('v-throttle-pct').textContent = thr + '%');
    q('v-brake-pct')    && (q('v-brake-pct').textContent    = brk + '%');
    q('v-ers-pct')      && (q('v-ers-pct').textContent      = ers + '%');
    q('v-fuel-laps')    && (q('v-fuel-laps').textContent    = fl.toFixed(2));
    pct('bar-throttle', thr, 100);
    pct('bar-brake', brk, 100);
    pct('bar-ers', ers, 100);
    pct('bar-fuel', Math.min(fl,5), 5);

    // Race info
    sv('v-pos', v.position);
    sv('v-lap', v.lap);
    sv('v-grid', v.grid_pos);
    sv('v-delta-front',  v.delta_front  ? '+' + parseFloat(v.delta_front).toFixed(3) + 's'  : '—');
    sv('v-delta-leader', v.delta_leader ? '+' + parseFloat(v.delta_leader).toFixed(3) + 's' : '—');
    sv('v-leader', v.leader);
    q('trackName') && (q('trackName').textContent = v.track || '—');

    // Lap times
    sv('v-cur-lap', v.current_lap);
    sv('v-last-lap', v.last_lap);
    sv('v-fastest', v.fastest_lap_time ? parseFloat(v.fastest_lap_time).toFixed(3) : '—');
    sv('v-fastest-drv', v.fastest_lap_drv);
    sv('v-speed-trap', v.speed_trap ? parseFloat(v.speed_trap).toFixed(1) : '—');

    // Penalties
    sv('v-penalties', v.penalties ? v.penalties + 's' : '0s');
    sv('v-warnings', v.warnings ?? '0');
    sv('v-cc-warns', v.cc_warnings ?? '0');
    sv('v-dt-pens', v.dt_pens ?? '0');
    sv('v-sg-pens', v.sg_pens ?? '0');
    sv('v-pit-stops', v.pit_stops ?? '0');
    sv('v-sc-count', v.sc_count ?? '0');
    sv('v-vsc-count', v.vsc_count ?? '0');
    sv('v-rf-count', v.rf_count ?? '0');

    // Power Unit
    sv('v-ers-mode', v.ers_mode);
    sv('v-ers-harv-h', v.ers_harv_h ? Math.round(parseFloat(v.ers_harv_h)).toLocaleString() + ' J' : '—');
    sv('v-ers-deploy', v.ers_deploy ? Math.round(parseFloat(v.ers_deploy)).toLocaleString() + ' J' : '—');
    sv('v-ice-power',  v.ice_power  ? (parseFloat(v.ice_power)/1000).toFixed(1) + ' kW' : '—');
    sv('v-mguk-power', v.mguk_power ? (parseFloat(v.mguk_power)/1000).toFixed(1) + ' kW' : '—');
    sv('v-max-rpm', v.max_rpm ? parseInt(v.max_rpm).toLocaleString() : '—');

    // Fuel
    sv('v-fuel-tank', v.fuel_tank ? parseFloat(v.fuel_tank).toFixed(2) : '—');
    sv('v-fuel-mix', v.fuel_mix);
    sv('v-pit-lim', v.pit_lim);
    sv('v-drs-dist', v.drs_dist ? v.drs_dist + 'm' : '—');

    // Temps & compound
    q('v-track-temp')  && (q('v-track-temp').textContent  = v.track_temp  ? parseFloat(v.track_temp).toFixed(0)  : '—');
    q('v-engine-temp') && (q('v-engine-temp').textContent = v.engine_temp ? parseFloat(v.engine_temp).toFixed(0) : '—');
    const compound = v.compound || '—';
    if (q('v-compound')) { q('v-compound').textContent = compound; q('v-compound').style.color = COMPOUND_COLORS[compound] || 'var(--f1-text,#e0e0f0)'; }
    q('v-tyre-age') && (q('v-tyre-age').textContent = v.tyre_age ? v.tyre_age + 'L' : '—');

    // Tyre badges
    const tyreBadge = (pos, wear, temp, press, tyredmg, blister, svgId) => {
      const wearN = parseFloat(wear)||0;
      const col   = tyreColor(wearN);
      if (q(`tw-${pos}`)) { q(`tw-${pos}`).textContent = wear ? wearN.toFixed(1)+'%' : '—'; q(`tw-${pos}`).style.color = col; }
      if (q(`tt-${pos}`)) q(`tt-${pos}`).textContent = temp  ? parseFloat(temp).toFixed(0)+'°'    : '—';
      if (q(`tp-${pos}`)) q(`tp-${pos}`).textContent = press ? parseFloat(press).toFixed(1)+' PSI': '—';
      if (q(`tdmg-${pos}`)) {
        const n = parseFloat(tyredmg)||0;
        q(`tdmg-${pos}`).textContent = 'DMG '+n+'%';
        q(`tdmg-${pos}`).style.color = n===0 ? 'var(--f1-text-dim,#6a6a8a)' : n<30 ? this._cfg.warn : this._cfg.accent;
      }
      if (q(`tbl-${pos}`)) {
        const n = parseFloat(blister)||0;
        q(`tbl-${pos}`).textContent = 'BLI '+n+'%';
        q(`tbl-${pos}`).style.color = n===0 ? 'var(--f1-text-dim,#6a6a8a)' : n<30 ? this._cfg.warn : this._cfg.accent;
      }
      const svgEl = q(svgId);
      if (svgEl) svgEl.setAttribute('stroke', col);
    };
    tyreBadge('fl',v.tw_fl,v.tt_fl,v.tp_fl,v.tdmg_fl,v.tbl_fl,'svg-tfl');
    tyreBadge('fr',v.tw_fr,v.tt_fr,v.tp_fr,v.tdmg_fr,v.tbl_fr,'svg-tfr');
    tyreBadge('rl',v.tw_rl,v.tt_rl,v.tp_rl,v.tdmg_rl,v.tbl_rl,'svg-trl');
    tyreBadge('rr',v.tw_rr,v.tt_rr,v.tp_rr,v.tdmg_rr,v.tbl_rr,'svg-trr');

    // Brake temps + damage + SVG glow
    ['fl','fr','rl','rr'].forEach(pos => {
      const tmp = parseFloat(v[`bt_${pos}`])||0;
      const dmg = parseFloat(v[`bd_${pos}`])||0;
      if (q(`v-bt-${pos}`)) q(`v-bt-${pos}`).textContent = tmp ? tmp.toFixed(0)+'°' : '—';
      pct(`bar-bt-${pos}`, tmp, 800);
      const brakeEl = q(`brake-${pos}`);
      if (brakeEl) brakeEl.setAttribute('fill', brakeGlow(tmp));
      if (q(`v-bd-${pos}`)) {
        q(`v-bd-${pos}`).textContent = dmg+'%';
        q(`v-bd-${pos}`).style.color = dmg===0 ? 'var(--f1-text-dim,#6a6a8a)' : dmg<25 ? this._cfg.warn : this._cfg.accent;
      }
      pct(`bar-bd-${pos}`, dmg, 100);
    });

    // Damage panel
    const ynTxt = val => val==='Yes' ? 'DAMAGE' : 'OK';
    const ynCls = val => val==='Yes' ? 'danger' : 'ok';
    const fwDmg = v.dmg_flw==='Yes'||v.dmg_frw==='Yes';
    sv('v-fw-dmg',   fwDmg ? 'DAMAGE' : 'OK', fwDmg ? 'data-value danger' : 'data-value ok');
    sv('v-rw-dmg',   ynTxt(v.dmg_rw),    'data-value '+ynCls(v.dmg_rw));
    sv('v-floor-dmg',ynTxt(v.dmg_floor), 'data-value '+ynCls(v.dmg_floor));
    const diffN=parseFloat(v.dmg_diff)||0, sideN=parseFloat(v.dmg_side)||0;
    const gbN=parseFloat(v.gb_dmg)||0, engDN=parseFloat(v.eng_dmg)||0;
    sv('v-diff-dmg', diffN+'%', 'data-value '+dmgClass(diffN));
    sv('v-side-dmg', sideN+'%', 'data-value '+dmgClass(sideN));
    sv('v-gb-dmg',   gbN+'%',   'data-value '+dmgClass(gbN));
    sv('v-eng-dmg',  engDN+'%', 'data-value '+dmgClass(engDN));
    sv('v-drs-fault',v.drs_fault==='Fault'?'FAULT':'OK','data-value '+(v.drs_fault==='Fault'?'danger':'ok'));
    sv('v-ers-fault',v.ers_fault==='Fault'?'FAULT':'OK','data-value '+(v.ers_fault==='Fault'?'danger':'ok'));
    const engSt = v.eng_blown==='Yes'?'BLOWN':v.eng_seize==='Yes'?'SEIZED':'OK';
    sv('v-eng-status',engSt,'data-value '+(engSt==='OK'?'ok':'danger'));

    // Engine wear chips
    ['ice','mguh','mguk','es','ce','tc'].forEach(k => {
      const el = q(`we-${k}`);
      if (!el) return;
      const n = parseFloat(v[`we_${k}`])||0;
      el.textContent = n+'%';
      el.style.color = n<30 ? this._cfg.ok : n<70 ? this._cfg.warn : this._cfg.accent;
    });

    // Status pills
    const setPill = (id, txt, state) => {
      const el = q(id);
      if (!el) return;
      el.className = 'status-pill '+(state||'');
      const txtEl = q(id+'-txt');
      if (txtEl) txtEl.textContent = txt;
    };
    setPill('pill-session', v.session_status||'INACTIVE',
      v.session_status==='Started'||v.session_status==='Active' ? 'active' : '');
    setPill('pill-sc', v.safety_car||'NO SC',
      v.safety_car&&v.safety_car!=='No Safety Car' ? 'warn' : 'active');
    const flagVal = v.flag||'None';
    setPill('pill-flag', flagVal, flagVal==='Red'?'danger':flagVal==='Yellow'?'warn':'active');
    const drsOn = v.drs_state==='On';
    setPill('pill-drs', 'DRS '+(v.drs_state||'OFF'), drsOn?'active':'');
    const pitVal = v.pit_status||'ON TRACK';
    setPill('pill-pit', pitVal, pitVal!=='None'&&pitVal!=='ON TRACK'?'warn':'active');
    setPill('pill-tc',  'TC: '+(v.tc||'—'), '');
    setPill('pill-abs', 'ABS: '+(v.abs||'—'), '');

    // DRS wing glow
    const drsWing = q('drs-wing');
    if (drsWing) drsWing.setAttribute('stroke', drsOn ? this._cfg.ok : 'transparent');
  }

  // ── Settings UI ──────────────────────────────────────────────────────────────
  _openSettings() {
    const c = this._cfg;
    const fields = {
      'cfg-prefix1':c.prefix1,'cfg-prefix2':c.prefix2,
      'cfg-accent':c.accent,'cfg-accent2':c.accent2,
      'cfg-warn':c.warn,'cfg-ok':c.ok,
      'cfg-bg':c.bg,'cfg-panel':c.panel,
      'cfg-interval':c.interval,
    };
    for (const [id,val] of Object.entries(fields)) {
      const el = this._q(id); if (el) el.value = val;
    }
    this._q('settingsOverlay')?.classList.add('open');
  }

  _closeSettings() {
    this._q('settingsOverlay')?.classList.remove('open');
  }

  _saveSettings() {
    const g = id => this._q(id)?.value || '';
    this._cfg.prefix1  = g('cfg-prefix1').trim();
    this._cfg.prefix2  = g('cfg-prefix2').trim();
    this._cfg.accent   = g('cfg-accent');
    this._cfg.accent2  = g('cfg-accent2');
    this._cfg.warn     = g('cfg-warn');
    this._cfg.ok       = g('cfg-ok');
    this._cfg.bg       = g('cfg-bg');
    this._cfg.panel    = g('cfg-panel');
    this._cfg.interval = parseInt(g('cfg-interval'))||500;
    try { localStorage.setItem('f1card_cfg', JSON.stringify(this._cfg)); } catch(e) {}
    this._applyColors();
    this._restartPoll();
    this._closeSettings();
  }
}

customElements.define('f1-telemetry-card', F1TelemetryCard);

// Tell HA about the card for the visual editor picker
window.customCards = window.customCards || [];
window.customCards.push({
  type:        'f1-telemetry-card',
  name:        'F1 25 Telemetry',
  description: 'Real-time F1 25 game telemetry dashboard with car visualisation',
  preview:     false,
});

console.info(`%c F1-TELEMETRY-CARD %c v${CARD_VERSION} `, 'background:#e8002d;color:#fff;font-weight:bold;', 'background:#222;color:#fff;');
