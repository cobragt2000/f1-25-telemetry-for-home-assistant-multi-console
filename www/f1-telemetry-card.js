// F1 25 Telemetry Card — Lovelace Custom Element
// Responsive via CSS Container Queries — scales from span-1 to span-4
// Part of the f1_25_telemetry_mc HACS integration

const CARD_VERSION = "1.5.1";

const KMH_TO_MPH = 0.621371;
const COMPOUND_COLORS = {
  Soft:'#e8002d',C5:'#e8002d',C6:'#e8002d',
  Medium:'#ffcc00',C3:'#ffcc00',C4:'#ffcc00',
  Hard:'#e0e0e0',C1:'#e0e0e0',C2:'#e0e0e0',C0:'#e0e0e0',
  Inter:'#39ff14',Wet:'#00d2ff',
};

function tyreColor(w){const n=parseFloat(w)||0;return n<30?'#39ff14':n<60?'#ffcc00':n<80?'#ff9500':'#e8002d';}
function brakeGlow(t){const n=parseFloat(t)||0;if(n<200)return'transparent';const i=Math.min(1,(n-200)/600),r=Math.round(255*i);return`rgba(${r},${Math.round(r*.3)},0,${i.toFixed(2)})`;}

function getSensors(p){return{
  speed:p+"speed",gear:p+"gear",rpm:p+"engine_rpm",
  throttle:p+"throttle",brake:p+"brake",
  suggested_gear:p+"suggested_gear",engine_temp:p+"engine_temperature",
  lap:p+"lap",position:p+"position",
  current_lap:p+"current_lap_time",last_lap:p+"last_lap",
  fastest_lap_time:p+"fastest_lap_time",fastest_lap_drv:p+"fastest_lap",
  speed_trap:p+"speed_trap",
  delta_front:p+"delta_to_car_in_front",delta_leader:p+"delta_to_race_leader",
  pit_status:p+"pit_status",pit_stops:p+"pit_stops",
  penalties:p+"penalties",warnings:p+"warnings",
  cc_warnings:p+"corner_cutting_warnings",
  dt_pens:p+"drive_through_pens",sg_pens:p+"stop_go_pens",
  grid_pos:p+"grid_position",safety_car:p+"safety_car",
  track_temp:p+"track_temperature",weather:p+"weather",
  session_status:p+"session_status",flag:p+"flag",track:p+"track",
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
  tw_rl:p+"tyre_wear_rear_left",   tt_rl:p+"tyre_temp_rear_left",   tp_rl:p+"tyre_pressure_rear_left",
  tw_rr:p+"tyre_wear_rear_right",  tt_rr:p+"tyre_temp_rear_right",  tp_rr:p+"tyre_pressure_rear_right",
  tw_fl:p+"tyre_wear_front_left",  tt_fl:p+"tyre_temp_front_left",  tp_fl:p+"tyre_pressure_front_left",
  tw_fr:p+"tyre_wear_front_right", tt_fr:p+"tyre_temp_front_right", tp_fr:p+"tyre_pressure_front_right",
  tdmg_fl:p+"tyre_damage_front_left",  tdmg_fr:p+"tyre_damage_front_right",
  tdmg_rl:p+"tyre_damage_rear_left",   tdmg_rr:p+"tyre_damage_rear_right",
  tbl_fl:p+"tyre_blisters_front_left", tbl_fr:p+"tyre_blisters_front_right",
  tbl_rl:p+"tyre_blisters_rear_left",  tbl_rr:p+"tyre_blisters_rear_right",
  bt_fl:p+"brake_temp_front_left",  bt_fr:p+"brake_temp_front_right",
  bt_rl:p+"brake_temp_rear_left",   bt_rr:p+"brake_temp_rear_right",
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
};}

// ── CSS with container queries ─────────────────────────────────────────────────
const CARD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  /* Container query context on the host */
  :host { display:block; container-type:inline-size; container-name:f1card; font-family:'Share Tech Mono',monospace; }
  *{ box-sizing:border-box; margin:0; padding:0; }

  /* ── Base styles (span-1, ~300px) ─────────────────────────────────────────── */
  .card{
    background:var(--f1-bg,#0a0a0f);
    border:1px solid var(--f1-border,#2a2a3a);
    border-radius:4px;
    padding:8px;
    color:var(--f1-text,#e0e0f0);
    user-select:none;
  }

  /* Header */
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--f1-border,#2a2a3a);flex-wrap:wrap;gap:4px;}
  .header-left{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .title{font-family:'Orbitron',sans-serif;font-size:10px;font-weight:900;letter-spacing:2px;color:var(--f1-accent,#e8002d);text-transform:uppercase;}
  .track-name{font-size:9px;color:var(--f1-accent2,#00d2ff);letter-spacing:1px;}
  .console-select{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);color:var(--f1-text,#e0e0f0);font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 5px;border-radius:3px;cursor:pointer;outline:none;}

  /* Status pills */
  .status-bar{display:flex;gap:3px;margin-bottom:6px;flex-wrap:wrap;}
  .status-pill{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:1px 5px;font-size:8px;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:3px;}
  .status-pill .dot{width:5px;height:5px;border-radius:50%;background:var(--f1-text-dim,#6a6a8a);flex-shrink:0;}
  .status-pill.active .dot{background:var(--f1-ok,#39ff14);box-shadow:0 0 4px var(--f1-ok,#39ff14);}
  .status-pill.warn   .dot{background:var(--f1-warn,#ff9500);box-shadow:0 0 4px var(--f1-warn,#ff9500);}
  .status-pill.danger .dot{background:var(--f1-accent,#e8002d);box-shadow:0 0 4px var(--f1-accent,#e8002d);}

  /* HUD */
  .hud-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:5px;}
  .hud-box{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:3px;padding:3px 4px;text-align:center;}
  .hud-val{font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;line-height:1;color:var(--f1-text,#e0e0f0);}
  .hud-val.accent{color:var(--f1-accent,#e8002d);}
  .hud-val.info{color:var(--f1-accent2,#00d2ff);}
  .hud-lbl{font-size:6px;color:var(--f1-text-dim,#6a6a8a);letter-spacing:1px;text-transform:uppercase;margin-top:1px;}

  /* RPM LEDs */
  .rpm-leds{display:flex;gap:2px;height:5px;margin-bottom:5px;}
  .rpm-led{flex:1;border-radius:1px;background:#1a1a28;transition:background 0.1s;}

  /* Input bars */
  .bars{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:5px;}
  .bar-wrap{display:flex;flex-direction:column;gap:1px;}
  .bar-header{display:flex;justify-content:space-between;font-size:7px;}
  .bar-label{color:var(--f1-text-dim,#6a6a8a);}
  .bar-val{color:var(--f1-text,#e0e0f0);font-weight:bold;}
  .bar-track{height:3px;background:#1a1a28;border-radius:2px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:2px;transition:width 0.3s ease;}
  .bar-fill.ok    {background:var(--f1-ok,#39ff14);}
  .bar-fill.warn  {background:var(--f1-warn,#ff9500);}
  .bar-fill.danger{background:var(--f1-accent,#e8002d);}
  .bar-fill.info  {background:var(--f1-accent2,#00d2ff);}

  /* Main layout — default: single column stack */
  .main{display:flex;flex-direction:column;gap:5px;margin-bottom:5px;}
  .left-panels{display:flex;flex-direction:column;gap:4px;}
  .right-panels{display:flex;flex-direction:column;gap:4px;}

  /* Car area */
  .car-area{display:flex;flex-direction:column;align-items:center;gap:4px;}
  .car-svg-wrap{position:relative;width:100%;max-width:180px;}
  .car-svg-wrap svg{width:100%;height:auto;display:block;}

  /* Tyre badges */
  .tyre-badge{position:absolute;background:#0f0f1a;border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:2px 3px;font-size:7px;line-height:1.3;pointer-events:none;min-width:40px;}
  .tyre-badge .t-label{color:var(--f1-text-dim,#6a6a8a);font-size:6px;letter-spacing:1px;}
  .tyre-badge .t-wear{font-weight:bold;}
  .tyre-badge .t-temp{color:var(--f1-accent2,#00d2ff);}
  .tyre-badge .t-press{color:var(--f1-text-dim,#6a6a8a);font-size:6px;}
  .tyre-fl{top:17%;left:-2px;}
  .tyre-fr{top:17%;right:-2px;text-align:right;}
  .tyre-rl{bottom:11%;left:-2px;}
  .tyre-rr{bottom:11%;right:-2px;text-align:right;}

  /* Car info strip */
  .car-info{display:grid;grid-template-columns:1fr 1fr;gap:3px;width:100%;max-width:180px;}
  .car-info-box{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:2px 3px;text-align:center;}
  .car-info-val{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:900;}
  .car-info-lbl{font-size:6px;color:var(--f1-text-dim,#6a6a8a);letter-spacing:1px;text-transform:uppercase;}

  /* Panels */
  .panel{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:3px;padding:5px;display:flex;flex-direction:column;gap:3px;}
  .panel-title{font-family:'Orbitron',sans-serif;font-size:7px;letter-spacing:2px;color:var(--f1-accent,#e8002d);text-transform:uppercase;padding-bottom:3px;border-bottom:1px solid var(--f1-border,#2a2a3a);margin-bottom:1px;}
  .data-row{display:flex;justify-content:space-between;align-items:center;gap:4px;}
  .data-label{font-size:8px;color:var(--f1-text-dim,#6a6a8a);white-space:nowrap;flex-shrink:0;}
  .data-value{font-size:9px;color:var(--f1-text,#e0e0f0);text-align:right;font-weight:bold;}
  .data-value.warn  {color:var(--f1-warn,#ff9500);}
  .data-value.danger{color:var(--f1-accent,#e8002d);}
  .data-value.ok    {color:var(--f1-ok,#39ff14);}
  .data-value.info  {color:var(--f1-accent2,#00d2ff);}
  .data-value.accent{color:var(--f1-accent,#e8002d);}

  /* Wear grid */
  .wear-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;}
  .wear-chip{background:#0a0a14;border:1px solid var(--f1-border,#2a2a3a);border-radius:2px;padding:2px;text-align:center;}
  .wear-chip .wc-label{font-size:6px;color:var(--f1-text-dim,#6a6a8a);}
  .wear-chip .wc-val{font-size:8px;font-weight:bold;}

  /* Bottom brake row */
  .bottom-row{display:grid;grid-template-columns:repeat(2,1fr);gap:4px;}

  /* Settings */
  .settings-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center;}
  .settings-overlay.open{display:flex;}
  .settings-box{background:var(--f1-panel,#111118);border:1px solid var(--f1-border,#2a2a3a);border-radius:6px;padding:16px;min-width:260px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto;}
  .settings-title{font-family:'Orbitron',sans-serif;font-size:11px;color:var(--f1-accent,#e8002d);letter-spacing:2px;margin-bottom:12px;}
  .setting-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;}
  .setting-row label{font-size:10px;color:var(--f1-text-dim,#6a6a8a);white-space:nowrap;}
  .setting-row input[type=color]{width:36px;height:22px;border:1px solid var(--f1-border,#2a2a3a);background:none;cursor:pointer;border-radius:2px;padding:1px;}
  .setting-row input[type=text],.setting-row input[type=number]{background:var(--f1-bg,#0a0a0f);border:1px solid var(--f1-border,#2a2a3a);color:var(--f1-text,#e0e0f0);font-family:'Share Tech Mono',monospace;font-size:10px;padding:3px 6px;border-radius:2px;width:130px;outline:none;}
  .settings-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end;}
  .btn{font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:1px;padding:5px 12px;border:1px solid var(--f1-border,#2a2a3a);background:var(--f1-panel,#111118);color:var(--f1-text,#e0e0f0);cursor:pointer;border-radius:2px;text-transform:uppercase;}
  .btn.primary{background:var(--f1-accent,#e8002d);border-color:var(--f1-accent,#e8002d);color:#fff;}
  .btn:hover{opacity:0.8;}
  .section-divider{font-size:8px;color:var(--f1-text-dim,#6a6a8a);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--f1-border,#2a2a3a);padding-bottom:3px;margin:8px 0 5px;}

  /* ── span-2 / ~500px+ ─────────────────────────────────────────────────────── */
  @container f1card (min-width: 500px) {
    .title{font-size:12px;}
    .hud-val{font-size:22px;}
    .hud-lbl{font-size:7px;}
    .bar-track{height:4px;}
    .bar-header{font-size:8px;}
    .data-label{font-size:9px;}
    .data-value{font-size:10px;}
    .panel-title{font-size:7px;}
    .car-info-val{font-size:13px;}
    .car-info-lbl{font-size:7px;}
    .tyre-badge{font-size:8px;min-width:46px;}
    .tyre-badge .t-label{font-size:7px;}
    .tyre-badge .t-press{font-size:7px;}
    .wear-chip .wc-val{font-size:9px;}
    .wear-chip .wc-label{font-size:7px;}
    .rpm-leds{height:6px;}
    .car-svg-wrap{max-width:200px;}
    /* 2-col: left panels | car — right panels below */
    .main{flex-direction:row;flex-wrap:wrap;align-items:start;}
    .left-panels{flex:1;min-width:130px;}
    .car-area{flex:0 0 auto;}
    .right-panels{width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
    .bottom-row{grid-template-columns:repeat(4,1fr);}
  }

  /* ── span-3 / ~800px+ ─────────────────────────────────────────────────────── */
  @container f1card (min-width: 800px) {
    .card{padding:10px;}
    .title{font-size:13px;}
    .track-name{font-size:10px;}
    .hud-val{font-size:26px;}
    .hud-strip{gap:5px;margin-bottom:6px;}
    .bar-header{font-size:9px;}
    .bar-track{height:4px;}
    .bars{gap:5px;margin-bottom:6px;}
    .data-label{font-size:9px;}
    .data-value{font-size:11px;}
    .panel{padding:6px;gap:4px;}
    .panel-title{font-size:8px;}
    .car-info-val{font-size:15px;}
    .car-info-lbl{font-size:7px;}
    .tyre-badge{font-size:8.5px;min-width:50px;padding:3px 4px;}
    .tyre-badge .t-press{font-size:7.5px;}
    .wear-chip .wc-val{font-size:10px;}
    .wear-chip .wc-label{font-size:7px;}
    .rpm-leds{height:7px;margin-bottom:6px;}
    .car-svg-wrap{max-width:220px;}
    /* 3-col: left | car | right */
    .main{flex-direction:row;flex-wrap:nowrap;align-items:start;}
    .left-panels{flex:1;}
    .car-area{flex:0 0 auto;}
    .right-panels{flex:1;display:flex;flex-direction:column;gap:4px;}
    .bottom-row{grid-template-columns:repeat(4,1fr);}
  }

  /* ── span-4 / ~1100px+ ────────────────────────────────────────────────────── */
  @container f1card (min-width: 1100px) {
    .card{padding:12px;}
    .title{font-size:14px;letter-spacing:3px;}
    .track-name{font-size:11px;}
    .hud-val{font-size:32px;}
    .hud-box{padding:6px 10px;}
    .hud-lbl{font-size:8px;letter-spacing:2px;}
    .hud-strip{gap:6px;margin-bottom:8px;}
    .bar-header{font-size:9px;}
    .bar-track{height:5px;}
    .bars{gap:6px;margin-bottom:8px;}
    .data-label{font-size:10px;}
    .data-value{font-size:13px;}
    .panel{padding:8px;gap:5px;}
    .panel-title{font-size:8px;letter-spacing:2px;}
    .car-info-val{font-size:18px;}
    .car-info-lbl{font-size:8px;}
    .car-info-box{padding:4px 6px;}
    .tyre-badge{font-size:9px;min-width:54px;padding:3px 5px;}
    .tyre-badge .t-label{font-size:8px;}
    .tyre-badge .t-press{font-size:8px;}
    .wear-chip .wc-val{font-size:11px;}
    .wear-chip .wc-label{font-size:8px;}
    .wear-chip{padding:3px 4px;}
    .rpm-leds{height:8px;margin-bottom:8px;}
    .car-svg-wrap{max-width:260px;}
    .status-pill{font-size:10px;padding:2px 8px;}
    .status-bar{gap:6px;margin-bottom:10px;}
    .bottom-row{grid-template-columns:repeat(4,1fr);gap:6px;}
  }
`;

// ── HTML template ──────────────────────────────────────────────────────────────
function buildHTML(){return `
<div class="card">

  <div class="header">
    <div class="header-left">
      <span class="title">F1·25 TELEMETRY</span>
      <select class="console-select" id="consoleSelect">
        <option value="1">Console 1</option>
        <option value="2">Console 2</option>
      </select>
      <span class="track-name" id="trackName">—</span>
    </div>
    <button class="btn" id="cfgBtn" style="padding:2px 7px;font-size:8px">⚙ CONFIG</button>
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

  <div class="hud-strip">
    <div class="hud-box"><div class="hud-val accent" id="v-speed">0</div><div class="hud-lbl" id="lbl-speed">KM/H</div></div>
    <div class="hud-box"><div class="hud-val info"   id="v-gear">N</div><div class="hud-lbl">GEAR</div></div>
    <div class="hud-box"><div class="hud-val"        id="v-rpm">0</div><div class="hud-lbl">RPM</div></div>
    <div class="hud-box"><div class="hud-val"        id="v-sg" style="color:var(--f1-warn,#ff9500)">—</div><div class="hud-lbl">SUG GEAR</div></div>
  </div>

  <div class="rpm-leds" id="rpmLeds"></div>

  <div class="bars">
    <div class="bar-wrap">
      <div class="bar-header"><span class="bar-label">THROTTLE</span><span class="bar-val" id="v-throttle-pct">0%</span></div>
      <div class="bar-track"><div class="bar-fill ok"     id="bar-throttle" style="width:0%"></div></div>
    </div>
    <div class="bar-wrap">
      <div class="bar-header"><span class="bar-label">BRAKE</span><span class="bar-val" id="v-brake-pct">0%</span></div>
      <div class="bar-track"><div class="bar-fill danger" id="bar-brake"    style="width:0%"></div></div>
    </div>
    <div class="bar-wrap">
      <div class="bar-header"><span class="bar-label">ERS STORE</span><span class="bar-val" id="v-ers-pct">0%</span></div>
      <div class="bar-track"><div class="bar-fill info"   id="bar-ers"      style="width:0%"></div></div>
    </div>
    <div class="bar-wrap">
      <div class="bar-header"><span class="bar-label">FUEL LAPS</span><span class="bar-val" id="v-fuel-laps">0.00</span></div>
      <div class="bar-track"><div class="bar-fill warn"   id="bar-fuel"     style="width:0%"></div></div>
    </div>
  </div>

  <div class="main">

    <!-- LEFT -->
    <div class="left-panels">
      <div class="panel">
        <div class="panel-title">RACE INFO</div>
        <div class="data-row"><span class="data-label">POS</span><span class="data-value accent" id="v-pos">—</span></div>
        <div class="data-row"><span class="data-label">LAP</span><span class="data-value" id="v-lap">—</span></div>
        <div class="data-row"><span class="data-label">GRID</span><span class="data-value" id="v-grid">—</span></div>
        <div class="data-row"><span class="data-label">GAP AHEAD</span><span class="data-value info" id="v-delta-front">—</span></div>
        <div class="data-row"><span class="data-label">GAP LEADER</span><span class="data-value info" id="v-delta-leader">—</span></div>
        <div class="data-row"><span class="data-label">LEADER</span><span class="data-value" id="v-leader">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">LAP TIMES</div>
        <div class="data-row"><span class="data-label">CURRENT</span><span class="data-value ok" id="v-cur-lap">—</span></div>
        <div class="data-row"><span class="data-label">LAST</span><span class="data-value" id="v-last-lap">—</span></div>
        <div class="data-row"><span class="data-label">FASTEST</span><span class="data-value accent" id="v-fastest">—</span></div>
        <div class="data-row"><span class="data-label">FASTEST BY</span><span class="data-value" id="v-fastest-drv">—</span></div>
        <div class="data-row"><span class="data-label">SPEED TRAP</span><span class="data-value" id="v-speed-trap">—</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">PENALTIES</div>
        <div class="data-row"><span class="data-label">TIME</span><span class="data-value warn" id="v-penalties">0s</span></div>
        <div class="data-row"><span class="data-label">WARNINGS</span><span class="data-value" id="v-warnings">0</span></div>
        <div class="data-row"><span class="data-label">CORNER CUT</span><span class="data-value" id="v-cc-warns">0</span></div>
        <div class="data-row"><span class="data-label">DT PENS</span><span class="data-value warn" id="v-dt-pens">0</span></div>
        <div class="data-row"><span class="data-label">SG PENS</span><span class="data-value warn" id="v-sg-pens">0</span></div>
        <div class="data-row"><span class="data-label">PIT STOPS</span><span class="data-value" id="v-pit-stops">0</span></div>
      </div>
      <div class="panel">
        <div class="panel-title">SESSION</div>
        <div class="data-row"><span class="data-label">SAFETY CAR</span><span class="data-value" id="v-sc-count">0</span></div>
        <div class="data-row"><span class="data-label">VIRT SC</span><span class="data-value" id="v-vsc-count">0</span></div>
        <div class="data-row"><span class="data-label">RED FLAGS</span><span class="data-value danger" id="v-rf-count">0</span></div>
      </div>
    </div>

    <!-- CENTRE: car -->
    <div class="car-area">
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
        <svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg" style="padding:0 28px;">
          <ellipse cx="100" cy="210" rx="36" ry="160" fill="#050508"/>
          <path d="M72 60 Q65 40 80 22 Q100 10 120 22 Q135 40 128 60 L130 200 Q130 240 128 260 L120 310 Q110 340 100 345 Q90 340 80 310 L72 260 Q70 240 70 200 Z" fill="#1a1a2e" stroke="#2a2a4a" stroke-width="1.5"/>
          <path d="M84 130 Q84 110 100 108 Q116 110 116 130 L116 190 Q116 200 100 202 Q84 200 84 190 Z" fill="#0d0d1a" stroke="#333355" stroke-width="1"/>
          <ellipse cx="100" cy="150" rx="12" ry="18" fill="#00d2ff22" stroke="#00d2ff55" stroke-width="1"/>
          <path d="M87 138 Q100 130 113 138" fill="none" stroke="#888" stroke-width="3" stroke-linecap="round"/>
          <rect x="52" y="48" width="96" height="12" rx="2" fill="#111122" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="50" y="38" width="8"  height="26" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="142" y="38" width="8" height="26" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <path d="M54 60 L146 60 L148 70 L52 70 Z" fill="#0d0d20" stroke="#2a2a3a" stroke-width="0.5"/>
          <path d="M68 160 Q58 162 56 200 Q56 240 60 260 L72 260 L70 200 Z" fill="#141428" stroke="#2a2a4a" stroke-width="1"/>
          <path d="M132 160 Q142 162 144 200 Q144 240 140 260 L128 260 L130 200 Z" fill="#141428" stroke="#2a2a4a" stroke-width="1"/>
          <ellipse cx="100" cy="124" rx="8" ry="6" fill="#050508" stroke="#333355" stroke-width="1"/>
          <rect x="55" y="290" width="90" height="10" rx="2" fill="#111122" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="55" y="290" width="90" height="10" rx="2" fill="transparent" stroke="transparent" id="drs-wing"/>
          <rect x="52"  y="282" width="7" height="22" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <rect x="141" y="282" width="7" height="22" rx="1" fill="#1a1a30" stroke="#2a2a4a" stroke-width="1"/>
          <ellipse cx="100" cy="330" rx="6" ry="4" fill="#050508" stroke="#444" stroke-width="1"/>
          <path d="M96 22 L96 340" stroke="#e8002d22" stroke-width="2"/>
          <path d="M104 22 L104 340" stroke="#e8002d22" stroke-width="2"/>
          <rect x="40"  y="60"  width="22" height="42" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-tfl"/>
          <rect x="43"  y="64"  width="16" height="34" rx="2" fill="#252525"/>
          <rect x="138" y="60"  width="22" height="42" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-tfr"/>
          <rect x="141" y="64"  width="16" height="34" rx="2" fill="#252525"/>
          <rect x="34"  y="270" width="26" height="48" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-trl"/>
          <rect x="38"  y="274" width="18" height="40" rx="2" fill="#252525"/>
          <rect x="140" y="270" width="26" height="48" rx="4" fill="#1e1e1e" stroke="#333" stroke-width="1.5" id="svg-trr"/>
          <rect x="144" y="274" width="18" height="40" rx="2" fill="#252525"/>
          <circle cx="51"  cy="81"  r="5" fill="transparent" id="brake-fl" opacity="0.8"/>
          <circle cx="149" cy="81"  r="5" fill="transparent" id="brake-fr" opacity="0.8"/>
          <circle cx="47"  cy="294" r="6" fill="transparent" id="brake-rl" opacity="0.8"/>
          <circle cx="153" cy="294" r="6" fill="transparent" id="brake-rr" opacity="0.8"/>
        </svg>
      </div>
      <div class="car-info">
        <div class="car-info-box"><div class="car-info-val" id="v-compound">—</div><div class="car-info-lbl">TYRE</div></div>
        <div class="car-info-box"><div class="car-info-val" id="v-tyre-age">—</div><div class="car-info-lbl">AGE</div></div>
        <div class="car-info-box"><div class="car-info-val" id="v-track-temp">—</div><div class="car-info-lbl">TRACK °</div></div>
        <div class="car-info-box"><div class="car-info-val" id="v-engine-temp">—</div><div class="car-info-lbl">ENG °</div></div>
      </div>
    </div>

    <!-- RIGHT -->
    <div class="right-panels">
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

  <!-- Bottom brake row -->
  <div class="bottom-row">
    <div class="panel">
      <div class="panel-title">BRAKES FL</div>
      <div class="bar-wrap"><div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-fl">—</span></div><div class="bar-track"><div class="bar-fill warn" id="bar-bt-fl" style="width:0%"></div></div></div>
      <div class="bar-wrap" style="margin-top:3px;"><div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-fl">0%</span></div><div class="bar-track"><div class="bar-fill danger" id="bar-bd-fl" style="width:0%"></div></div></div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES FR</div>
      <div class="bar-wrap"><div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-fr">—</span></div><div class="bar-track"><div class="bar-fill warn" id="bar-bt-fr" style="width:0%"></div></div></div>
      <div class="bar-wrap" style="margin-top:3px;"><div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-fr">0%</span></div><div class="bar-track"><div class="bar-fill danger" id="bar-bd-fr" style="width:0%"></div></div></div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES RL</div>
      <div class="bar-wrap"><div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-rl">—</span></div><div class="bar-track"><div class="bar-fill warn" id="bar-bt-rl" style="width:0%"></div></div></div>
      <div class="bar-wrap" style="margin-top:3px;"><div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-rl">0%</span></div><div class="bar-track"><div class="bar-fill danger" id="bar-bd-rl" style="width:0%"></div></div></div>
    </div>
    <div class="panel">
      <div class="panel-title">BRAKES RR</div>
      <div class="bar-wrap"><div class="bar-header"><span class="bar-label">TEMP</span><span class="bar-val" id="v-bt-rr">—</span></div><div class="bar-track"><div class="bar-fill warn" id="bar-bt-rr" style="width:0%"></div></div></div>
      <div class="bar-wrap" style="margin-top:3px;"><div class="bar-header"><span class="bar-label">DAMAGE</span><span class="bar-val" id="v-bd-rr">0%</span></div><div class="bar-track"><div class="bar-fill danger" id="bar-bd-rr" style="width:0%"></div></div></div>
    </div>
  </div>

</div>

<!-- Settings overlay -->
<div class="settings-overlay" id="settingsOverlay">
  <div class="settings-box">
    <div class="settings-title">⚙ CONFIGURATION</div>
    <div class="section-divider">ENTITY PREFIX</div>
    <div class="setting-row"><label>Console 1 prefix</label><input type="text" id="cfg-prefix1" placeholder="sensor.f1_25_port_20777_"></div>
    <div class="setting-row"><label>Console 2 prefix</label><input type="text" id="cfg-prefix2" placeholder="sensor.f1_25_port_20778_"></div>
    <div class="section-divider">COLORS</div>
    <div class="setting-row"><label>Accent (speed/pos)</label><input type="color" id="cfg-accent" value="#e8002d"></div>
    <div class="setting-row"><label>Info (deltas/DRS)</label><input type="color" id="cfg-accent2" value="#00d2ff"></div>
    <div class="setting-row"><label>Warning</label><input type="color" id="cfg-warn" value="#ff9500"></div>
    <div class="setting-row"><label>OK / Safe</label><input type="color" id="cfg-ok" value="#39ff14"></div>
    <div class="setting-row"><label>Background</label><input type="color" id="cfg-bg" value="#0a0a0f"></div>
    <div class="setting-row"><label>Panel</label><input type="color" id="cfg-panel" value="#111118"></div>
    <div class="section-divider">REFRESH</div>
    <div class="setting-row"><label>Interval (ms)</label><input type="number" id="cfg-interval" value="500" min="100" max="5000" step="100"></div>
    <div class="settings-actions">
      <button class="btn" id="cfgCancel">CANCEL</button>
      <button class="btn primary" id="cfgSave">SAVE &amp; APPLY</button>
    </div>
  </div>
</div>
`;}

// ── Custom Element ─────────────────────────────────────────────────────────────
class F1TelemetryCard extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._hass=null; this._config={}; this._pollTimer=null; this._console=1; this._built=false;
    this._cfg={prefix1:'sensor.f1_25_port_20777_',prefix2:'sensor.f1_25_port_20778_',accent:'#e8002d',accent2:'#00d2ff',warn:'#ff9500',ok:'#39ff14',bg:'#0a0a0f',panel:'#111118',interval:500};
  }

  setConfig(config){
    this._config=config;
    if(config.console)  this._console      =parseInt(config.console)||1;
    if(config.prefix1)  this._cfg.prefix1  =config.prefix1;
    if(config.prefix2)  this._cfg.prefix2  =config.prefix2;
    if(config.accent)   this._cfg.accent   =config.accent;
    if(config.accent2)  this._cfg.accent2  =config.accent2;
    if(config.warn)     this._cfg.warn     =config.warn;
    if(config.ok)       this._cfg.ok       =config.ok;
    if(config.bg)       this._cfg.bg       =config.bg;
    if(config.panel)    this._cfg.panel    =config.panel;
    if(config.interval) this._cfg.interval =parseInt(config.interval)||500;
    try{const s=localStorage.getItem('f1card_cfg');if(s)this._cfg={...this._cfg,...JSON.parse(s)};}catch(e){}
    if(!this._built)this._build();
    this._applyColors();
    this._restartPoll();
  }

  set hass(h){this._hass=h;}
  getCardSize(){return 12;}
  static getStubConfig(){return{console:1,prefix1:'sensor.f1_25_port_20777_',prefix2:'sensor.f1_25_port_20778_'};}

  _q(id){return this.shadowRoot.getElementById(id);}

  _build(){
    this._built=true;
    const style=document.createElement('style');
    style.textContent=CARD_CSS;
    this.shadowRoot.innerHTML='';
    this.shadowRoot.appendChild(style);
    const w=document.createElement('div');
    w.innerHTML=buildHTML();
    this.shadowRoot.appendChild(w);
    // RPM LEDs
    const el=this._q('rpmLeds');
    if(el)for(let i=0;i<20;i++){const d=document.createElement('div');d.className='rpm-led';d.id=`rled${i}`;el.appendChild(d);}
    // Console select
    const sel=this._q('consoleSelect');
    if(sel){sel.value=String(this._console);sel.addEventListener('change',e=>{this._console=parseInt(e.target.value);this._update();});}
    // Settings
    this._q('cfgBtn')?.addEventListener('click',()=>this._openSettings());
    this._q('cfgCancel')?.addEventListener('click',()=>this._closeSettings());
    this._q('cfgSave')?.addEventListener('click',()=>this._saveSettings());
  }

  _applyColors(){
    const c=this.shadowRoot.querySelector('.card');
    if(!c)return;
    const g=this._cfg;
    c.style.setProperty('--f1-accent', g.accent);
    c.style.setProperty('--f1-accent2',g.accent2);
    c.style.setProperty('--f1-warn',   g.warn);
    c.style.setProperty('--f1-ok',     g.ok);
    c.style.setProperty('--f1-bg',     g.bg);
    c.style.setProperty('--f1-panel',  g.panel);
  }

  _restartPoll(){
    if(this._pollTimer)clearInterval(this._pollTimer);
    this._update();
    this._pollTimer=setInterval(()=>this._update(),this._cfg.interval);
  }

  disconnectedCallback(){if(this._pollTimer)clearInterval(this._pollTimer);}

  _update(){
    if(!this._hass)return;
    const prefix=this._console===1?this._cfg.prefix1:this._cfg.prefix2;
    const sensors=getSensors(prefix);
    const v={};
    for(const[k,id]of Object.entries(sensors)){const st=this._hass.states[id];v[k]=st?st.state:null;}
    this._render(v);
  }

  _render(v){
    const q=id=>this._q(id);
    const sv=(id,val,cls)=>{const el=q(id);if(!el)return;el.textContent=val??'—';if(cls!==undefined)el.className='data-value '+(cls||'');};
    const pct=(id,val,max)=>{const el=q(id);if(el)el.style.width=Math.min(100,Math.max(0,(parseFloat(val)||0)/max*100))+'%';};
    const dmgCls=n=>n===0?'ok':n<25?'':n<60?'warn':'danger';
    const ynTxt=v=>v==='Yes'?'DAMAGE':'OK', ynCls=v=>v==='Yes'?'danger':'ok';

    // HUD
    q('v-speed')&&(q('v-speed').textContent=v.speed?Math.round(parseFloat(v.speed)):'0');
    q('v-gear') &&(q('v-gear').textContent =v.gear??'N');
    q('v-rpm')  &&(q('v-rpm').textContent  =v.rpm?parseInt(v.rpm).toLocaleString():'0');
    q('v-sg')   &&(q('v-sg').textContent   =v.suggested_gear&&v.suggested_gear!=='None'?v.suggested_gear:'—');

    // RPM LEDs
    const mr=parseInt(v.max_rpm)||14000, lit=Math.round((parseInt(v.rpm)||0)/mr*20);
    for(let i=0;i<20;i++){const l=q(`rled${i}`);if(!l)continue;l.style.background=i<lit?(i/20<0.6?this._cfg.ok:i/20<0.8?this._cfg.warn:this._cfg.accent):'#1a1a28';}

    // Bars
    const thr=parseFloat(v.throttle)||0,brk=parseFloat(v.brake)||0,ers=parseFloat(v.ers_store)||0,fl=parseFloat(v.fuel_laps)||0;
    q('v-throttle-pct')&&(q('v-throttle-pct').textContent=thr+'%');
    q('v-brake-pct')   &&(q('v-brake-pct').textContent   =brk+'%');
    q('v-ers-pct')     &&(q('v-ers-pct').textContent     =ers+'%');
    q('v-fuel-laps')   &&(q('v-fuel-laps').textContent   =fl.toFixed(2));
    pct('bar-throttle',thr,100);pct('bar-brake',brk,100);pct('bar-ers',ers,100);pct('bar-fuel',Math.min(fl,5),5);

    // Race info
    sv('v-pos',v.position);sv('v-lap',v.lap);sv('v-grid',v.grid_pos);
    sv('v-delta-front', v.delta_front ?'+'+parseFloat(v.delta_front).toFixed(3)+'s':'—');
    sv('v-delta-leader',v.delta_leader?'+'+parseFloat(v.delta_leader).toFixed(3)+'s':'—');
    sv('v-leader',v.leader);
    q('trackName')&&(q('trackName').textContent=v.track||'—');

    // Lap times
    sv('v-cur-lap',v.current_lap);sv('v-last-lap',v.last_lap);
    sv('v-fastest',v.fastest_lap_time?parseFloat(v.fastest_lap_time).toFixed(3):'—');
    sv('v-fastest-drv',v.fastest_lap_drv);
    sv('v-speed-trap',v.speed_trap?parseFloat(v.speed_trap).toFixed(1):'—');

    // Penalties
    sv('v-penalties',v.penalties?v.penalties+'s':'0s');
    sv('v-warnings',v.warnings??'0');sv('v-cc-warns',v.cc_warnings??'0');
    sv('v-dt-pens',v.dt_pens??'0');sv('v-sg-pens',v.sg_pens??'0');sv('v-pit-stops',v.pit_stops??'0');
    sv('v-sc-count',v.sc_count??'0');sv('v-vsc-count',v.vsc_count??'0');sv('v-rf-count',v.rf_count??'0');

    // Power unit
    sv('v-ers-mode',v.ers_mode);
    sv('v-ers-harv-h',v.ers_harv_h?Math.round(parseFloat(v.ers_harv_h)).toLocaleString()+' J':'—');
    sv('v-ers-deploy',v.ers_deploy?Math.round(parseFloat(v.ers_deploy)).toLocaleString()+' J':'—');
    sv('v-ice-power', v.ice_power ?(parseFloat(v.ice_power)/1000).toFixed(1)+' kW':'—');
    sv('v-mguk-power',v.mguk_power?(parseFloat(v.mguk_power)/1000).toFixed(1)+' kW':'—');
    sv('v-max-rpm',v.max_rpm?parseInt(v.max_rpm).toLocaleString():'—');

    // Fuel
    sv('v-fuel-tank',v.fuel_tank?parseFloat(v.fuel_tank).toFixed(2):'—');
    sv('v-fuel-mix',v.fuel_mix);sv('v-pit-lim',v.pit_lim);
    sv('v-drs-dist',v.drs_dist?v.drs_dist+'m':'—');

    // Temps & compound
    q('v-track-temp') &&(q('v-track-temp').textContent =v.track_temp ?parseFloat(v.track_temp).toFixed(0):'—');
    q('v-engine-temp')&&(q('v-engine-temp').textContent=v.engine_temp?parseFloat(v.engine_temp).toFixed(0):'—');
    const comp=v.compound||'—';
    if(q('v-compound')){q('v-compound').textContent=comp;q('v-compound').style.color=COMPOUND_COLORS[comp]||'var(--f1-text,#e0e0f0)';}
    q('v-tyre-age')&&(q('v-tyre-age').textContent=v.tyre_age?v.tyre_age+'L':'—');

    // Tyre badges
    const tb=(pos,wear,temp,press,tdmg,tbl,svgId)=>{
      const wn=parseFloat(wear)||0,col=tyreColor(wn);
      if(q(`tw-${pos}`)){q(`tw-${pos}`).textContent=wear?wn.toFixed(1)+'%':'—';q(`tw-${pos}`).style.color=col;}
      if(q(`tt-${pos}`))q(`tt-${pos}`).textContent=temp ?parseFloat(temp).toFixed(0)+'°':'—';
      if(q(`tp-${pos}`))q(`tp-${pos}`).textContent=press?parseFloat(press).toFixed(1)+' PSI':'—';
      if(q(`tdmg-${pos}`)){const n=parseFloat(tdmg)||0;q(`tdmg-${pos}`).textContent='D'+n+'%';q(`tdmg-${pos}`).style.color=n===0?'var(--f1-text-dim,#6a6a8a)':n<30?this._cfg.warn:this._cfg.accent;}
      if(q(`tbl-${pos}`)){ const n=parseFloat(tbl)||0; q(`tbl-${pos}`).textContent='B'+n+'%'; q(`tbl-${pos}`).style.color=n===0?'var(--f1-text-dim,#6a6a8a)':n<30?this._cfg.warn:this._cfg.accent;}
      const s=q(svgId);if(s)s.setAttribute('stroke',col);
    };
    tb('fl',v.tw_fl,v.tt_fl,v.tp_fl,v.tdmg_fl,v.tbl_fl,'svg-tfl');
    tb('fr',v.tw_fr,v.tt_fr,v.tp_fr,v.tdmg_fr,v.tbl_fr,'svg-tfr');
    tb('rl',v.tw_rl,v.tt_rl,v.tp_rl,v.tdmg_rl,v.tbl_rl,'svg-trl');
    tb('rr',v.tw_rr,v.tt_rr,v.tp_rr,v.tdmg_rr,v.tbl_rr,'svg-trr');

    // Brakes
    ['fl','fr','rl','rr'].forEach(pos=>{
      const tmp=parseFloat(v[`bt_${pos}`])||0,dmg=parseFloat(v[`bd_${pos}`])||0;
      if(q(`v-bt-${pos}`))q(`v-bt-${pos}`).textContent=tmp?tmp.toFixed(0)+'°':'—';
      pct(`bar-bt-${pos}`,tmp,800);
      const be=q(`brake-${pos}`);if(be)be.setAttribute('fill',brakeGlow(tmp));
      if(q(`v-bd-${pos}`)){q(`v-bd-${pos}`).textContent=dmg+'%';q(`v-bd-${pos}`).style.color=dmg===0?'var(--f1-text-dim,#6a6a8a)':dmg<25?this._cfg.warn:this._cfg.accent;}
      pct(`bar-bd-${pos}`,dmg,100);
    });

    // Damage panel
    const fwD=v.dmg_flw==='Yes'||v.dmg_frw==='Yes';
    sv('v-fw-dmg',  fwD?'DAMAGE':'OK','data-value '+(fwD?'danger':'ok'));
    sv('v-rw-dmg',  ynTxt(v.dmg_rw),'data-value '+ynCls(v.dmg_rw));
    sv('v-floor-dmg',ynTxt(v.dmg_floor),'data-value '+ynCls(v.dmg_floor));
    sv('v-diff-dmg',(parseFloat(v.dmg_diff)||0)+'%','data-value '+dmgCls(parseFloat(v.dmg_diff)||0));
    sv('v-side-dmg',(parseFloat(v.dmg_side)||0)+'%','data-value '+dmgCls(parseFloat(v.dmg_side)||0));
    sv('v-gb-dmg',  (parseFloat(v.gb_dmg)||0)+'%',  'data-value '+dmgCls(parseFloat(v.gb_dmg)||0));
    sv('v-eng-dmg', (parseFloat(v.eng_dmg)||0)+'%', 'data-value '+dmgCls(parseFloat(v.eng_dmg)||0));
    sv('v-drs-fault',v.drs_fault==='Fault'?'FAULT':'OK','data-value '+(v.drs_fault==='Fault'?'danger':'ok'));
    sv('v-ers-fault',v.ers_fault==='Fault'?'FAULT':'OK','data-value '+(v.ers_fault==='Fault'?'danger':'ok'));
    const es=v.eng_blown==='Yes'?'BLOWN':v.eng_seize==='Yes'?'SEIZED':'OK';
    sv('v-eng-status',es,'data-value '+(es==='OK'?'ok':'danger'));

    // Engine wear
    ['ice','mguh','mguk','es','ce','tc'].forEach(k=>{
      const el=q(`we-${k}`);if(!el)return;
      const n=parseFloat(v[`we_${k}`])||0;
      el.textContent=n+'%';
      el.style.color=n<30?this._cfg.ok:n<70?this._cfg.warn:this._cfg.accent;
    });

    // Status pills
    const sp=(id,txt,state)=>{const el=q(id);if(!el)return;el.className='status-pill '+(state||'');const tx=q(id+'-txt');if(tx)tx.textContent=txt;};
    sp('pill-session',v.session_status||'INACTIVE',v.session_status==='Started'||v.session_status==='Active'?'active':'');
    sp('pill-sc',v.safety_car||'NO SC',v.safety_car&&v.safety_car!=='No Safety Car'?'warn':'active');
    const fv=v.flag||'None';
    sp('pill-flag',fv,fv==='Red'?'danger':fv==='Yellow'?'warn':'active');
    const dOn=v.drs_state==='On';
    sp('pill-drs','DRS '+(v.drs_state||'OFF'),dOn?'active':'');
    const pv=v.pit_status||'ON TRACK';
    sp('pill-pit',pv,pv!=='None'&&pv!=='ON TRACK'?'warn':'active');
    sp('pill-tc', 'TC: '+(v.tc||'—'),'');
    sp('pill-abs','ABS: '+(v.abs||'—'),'');
    const dw=q('drs-wing');if(dw)dw.setAttribute('stroke',dOn?this._cfg.ok:'transparent');
  }

  _openSettings(){
    const c=this._cfg;
    [['cfg-prefix1',c.prefix1],['cfg-prefix2',c.prefix2],['cfg-accent',c.accent],
     ['cfg-accent2',c.accent2],['cfg-warn',c.warn],['cfg-ok',c.ok],
     ['cfg-bg',c.bg],['cfg-panel',c.panel],['cfg-interval',c.interval]
    ].forEach(([id,val])=>{const el=this._q(id);if(el)el.value=val;});
    this._q('settingsOverlay')?.classList.add('open');
  }
  _closeSettings(){this._q('settingsOverlay')?.classList.remove('open');}
  _saveSettings(){
    const g=id=>this._q(id)?.value||'';
    this._cfg={prefix1:g('cfg-prefix1').trim(),prefix2:g('cfg-prefix2').trim(),accent:g('cfg-accent'),accent2:g('cfg-accent2'),warn:g('cfg-warn'),ok:g('cfg-ok'),bg:g('cfg-bg'),panel:g('cfg-panel'),interval:parseInt(g('cfg-interval'))||500};
    try{localStorage.setItem('f1card_cfg',JSON.stringify(this._cfg));}catch(e){}
    this._applyColors();this._restartPoll();this._closeSettings();
  }
}

customElements.define('f1-telemetry-card',F1TelemetryCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'f1-telemetry-card',name:'F1 25 Telemetry',description:'Real-time F1 25 telemetry — responsive from span-1 to span-4',preview:false});
console.info(`%c F1-TELEMETRY-CARD %c v${CARD_VERSION} `,'background:#e8002d;color:#fff;font-weight:bold;','background:#222;color:#fff;');
