# F1 25 Telemetry — Multi-Console for Home Assistant

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![Version](https://img.shields.io/badge/version-1.5.1-red.svg)](https://github.com/cobragt2000/f1-25-telemetry-for-home-assistant-multi-console/releases)
[![HA Versions](https://img.shields.io/badge/HA-2024.1%2B-blue.svg)](https://www.home-assistant.io)

A fork of [richardvinger/f1-25-telemetry-for-home-assistant](https://github.com/richardvinger/f1-25-telemetry-for-home-assistant) with multi-console support, an expanded sensor set, imperial/metric unit switching, and a built-in Lovelace telemetry dashboard card.

---

## What's different from the original

| Feature | Original | This fork |
|---------|----------|-----------|
| Multiple consoles | ✗ | ✓ — add once per console, each on its own UDP port |
| Unique entity IDs | ✗ — collide on 2nd install | ✓ — scoped to config entry |
| Device naming | Single unnamed device | Named per port e.g. *F1 25 Game (Port 20777)* |
| Unit system | km/h · °C only | ✓ — metric **or** imperial (mph · °F) per instance |
| Sensor count | ~30 | **82 sensor classes · 100+ entities** |
| Lovelace card | ✗ | ✓ — `custom:f1-telemetry-card` included |
| Integration domain | `f1_25_telemetry` | `f1_25_telemetry_mc` — installs alongside original |

---

## Requirements

- Home Assistant 2024.1 or newer
- [HACS](https://hacs.xyz) installed
- EA Sports F1 25 on PS5, Xbox, or PC
- Both consoles (if using two) must be on the same network as your HA instance

---

## Installation

### Via HACS (recommended)

1. In HACS → **Integrations** → three-dot menu → **Custom repositories**
2. Paste `https://github.com/cobragt2000/f1-25-telemetry-for-home-assistant-multi-console` and select **Integration**
3. Click **Download**
4. Restart Home Assistant

### Manual

Copy the `custom_components/f1_25_telemetry_mc/` folder into your HA `config/custom_components/` directory, then restart.

---

## Configuration

### Adding the integration

Go to **Settings → Devices & Services → Add Integration** and search for **F1 25 Telemetry Multi-Console**.

| Field | Description |
|-------|-------------|
| **Local UDP Port** | Port HA listens on. Default `20777`. Use `20778` for a second console. |
| **Unit System** | `metric` = km/h · °C (European). `imperial` = mph · °F (USA). |
| **Enable UDP Forwarding** | Re-transmit raw packets to another device (e.g. a phone dashboard). |
| **Destination IP / Port** | Target for forwarded packets (only needed if forwarding is enabled). |

Repeat the **Add Integration** step for each console, using a different port each time. HA will block you if you try to reuse a port.

### F1 25 game settings

On each console, go to **Settings → Telemetry**:

| Setting | Value |
|---------|-------|
| UDP Telemetry | **On** |
| UDP Broadcast Mode | **Off** |
| UDP IP Address | Your Home Assistant IP |
| UDP Port | `20777` for Console 1, `20778` for Console 2 |
| UDP Format | **2025** |
| Your Telemetry | **Public** (required for participant names) |

### Options (after install)

Click **Configure** on the integration card to change the port, unit system, or forwarding settings at any time. HA will reload the integration automatically.

---

## Sensors

All sensors are grouped under a device named **F1 25 Game (Port XXXXX)**.

### Session Info

| Sensor | Notes |
|--------|-------|
| Track | Circuit name |
| Weather | HA weather condition string (sunny, rainy, etc.) |
| Track Temperature | °C or °F |
| Session Status | Started / Ended / Red Flag / Chequered Flag |
| Safety Car | No Safety Car / Safety Car / Virtual Safety Car / Formation Lap |
| Safety Car Count | Number of SC periods this session |
| Virtual Safety Car Count | Number of VSC periods this session |
| Red Flag Count | Number of red flags this session |
| Start Lights | Count of lights on (0–5) |
| Flag | None / Green / Blue / Yellow / Red |
| Rain Chance Now | % |
| Rain Chance in 5m | % |
| Rain Chance in 10m | % |
| Rain Chance in 15m | % |

### Race Position

| Sensor | Notes |
|--------|-------|
| Position | Current race position |
| Lap | Current lap number |
| Grid Position | Starting grid slot |
| Leader | Name of race leader |
| Delta to Car in Front | Gap in seconds |
| Delta to Race Leader | Gap in seconds |

### Lap Times & Penalties

| Sensor | Notes |
|--------|-------|
| Current Lap Time | Live running lap time (formatted) |
| Last Lap | Last lap time (formatted string) |
| Last Lap Time | Last lap time in seconds |
| Fastest Lap Time | Fastest lap time this session |
| Fastest Lap | Driver name who set fastest lap |
| Speed Trap | Fastest speed through speed trap this session |
| Lap Invalid | Yes / No |
| Penalties | Accumulated time penalty in seconds |
| Warnings | Total warnings issued |
| Corner Cutting Warnings | Corner cutting warning count |
| Drive-Through Pens | Unserved drive-through penalties |
| Stop-Go Pens | Unserved stop-go penalties |
| Pit Status | None / Pitting / In Pit Area |
| Pit Stops | Total pit stops this session |

### Performance

| Sensor | Notes |
|--------|-------|
| Speed | km/h or mph |
| Engine RPM | |
| Gear | Current gear (−1=reverse, 0=neutral) |
| Suggested Gear | Recommended gear from game |
| Throttle | % |
| Brake | % |
| Engine Temperature | °C or °F |
| Max RPM | Rev limiter point |
| Engine Power ICE | Watts |
| Engine Power MGU-K | Watts |

### Fuel

| Sensor | Notes |
|--------|-------|
| Fuel Laps | Estimated fuel remaining in laps |
| Fuel In Tank | kg (metric) or gallons (imperial) |
| Fuel Mix | Lean / Standard / Rich / Max |
| Pit Limiter | On / Off |

### ERS / Power Unit

| Sensor | Notes |
|--------|-------|
| ERS Store | % (0–100) |
| ERS Mode | None / Medium / Hotlap / Overtake |
| ERS Harvested MGU-H | Joules this lap |
| ERS Deployed This Lap | Joules |

### DRS & Driver Aids

| Sensor | Notes |
|--------|-------|
| DRS State | On / Off |
| DRS Allowed | Allowed / Not Allowed |
| DRS Activation Distance | Metres until DRS available |
| Traction Control | Off / Medium / Full |
| Anti-Lock Brakes | On / Off |

### Tyres (per corner: FL / FR / RL / RR)

| Sensor | Notes |
|--------|-------|
| Tyre Compound | Visual compound (Soft / Medium / Hard / Inter / Wet) |
| Actual Tyre Compound | Specific compound (C1–C6 / Inter / Wet) |
| Tyre Age | Laps on current set |
| Tyre Wear FL/FR/RL/RR | % |
| Tyre Temp FL/FR/RL/RR | Surface temperature °C or °F |
| Tyre Inner Temp FL/FR/RL/RR | Inner temperature °C or °F |
| Tyre Pressure FL/FR/RL/RR | PSI |
| Tyre Damage FL/FR/RL/RR | % |
| Tyre Blisters FL/FR/RL/RR | % — new in F1 25 |

### Brakes (per corner: FL / FR / RL / RR)

| Sensor | Notes |
|--------|-------|
| Brake Temp FL/FR/RL/RR | °C or °F |
| Brake Damage FL/FR/RL/RR | % |

### Damage

| Sensor | Notes |
|--------|-------|
| Damaged Front Left Wing | Yes / No |
| Damaged Front Right Wing | Yes / No |
| Damaged Rear Wing | Yes / No |
| Damaged Floor | Yes / No |
| Diffuser Damage | % |
| Sidepod Damage | % |
| Gearbox Damage | % |
| Engine Damage | % |
| DRS Fault | OK / Fault |
| ERS Fault | OK / Fault |
| Engine Blown | Yes / No |
| Engine Seized | Yes / No |
| Damage | Yes / No (overall flag) |
| Terminal Damage | Yes / No |

### Engine Wear

| Sensor | Notes |
|--------|-------|
| Engine ICE Wear | % |
| Engine MGU-H Wear | % |
| Engine MGU-K Wear | % |
| Engine ES Wear | % |
| Engine CE Wear | % |
| Engine TC Wear | % |

> **Note:** High-frequency sensors (Speed, Gear, RPM, Throttle, Brake, ERS Store) are disabled by default in the entity registry to avoid flooding your database. Enable only the ones you need for recording.

---

## Lovelace Dashboard Card

This integration includes a built-in custom Lovelace card — `custom:f1-telemetry-card` — that provides a real-time visual dashboard with a top-down F1 car view, tyre badges, RPM LED bar, and all sensors laid out by category.

### Resource registration

After installing via HACS, register the card resource once:

**Settings → Dashboards → Resources → Add Resource**

| Field | Value |
|-------|-------|
| URL | `/hacsfiles/f1_25_telemetry_mc/f1-telemetry-card.js` |
| Type | JavaScript module |

### Adding the card

The card is designed to be used inside a HA grid card so it can be given a column span. Recommended setup:

```yaml
type: grid
cards:
  - type: custom:f1-telemetry-card
    console: 1
    prefix1: sensor.f1_25_game_john_port_20777_
    prefix2: sensor.f1_25_game_john_port_20778_
column_span: 2
```

> **Finding your prefix:** Go to **Settings → Devices & Services → your F1 25 device → any entity** (e.g. Speed) and note its entity ID. Strip the sensor name off the end — everything up to and including the last underscore is your prefix. For example `sensor.f1_25_game_john_port_20777_speed` → prefix is `sensor.f1_25_game_john_port_20777_`.

### Responsive layout

The card uses CSS container queries and automatically adapts its layout based on the width it is given — no configuration needed. Just change `column_span` and the card reflows:

| Column span | Approx width | Layout |
|-------------|-------------|--------|
| `1` | ~300px | Single column stack |
| `2` | ~500px | Left panels + car side by side, data panels below in a row |
| `3` | ~800px | Full 3-column: left data \| car \| right data |
| `4` | ~1100px | Full layout with larger fonts and more spacing |

### YAML configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `console` | `1` | Which console to show on load (`1` or `2`) |
| `prefix1` | `sensor.f1_25_port_20777_` | Entity prefix for Console 1 |
| `prefix2` | `sensor.f1_25_port_20778_` | Entity prefix for Console 2 |
| `accent` | `#e8002d` | Accent colour (speed, position) |
| `accent2` | `#00d2ff` | Info colour (deltas, DRS) |
| `warn` | `#ff9500` | Warning colour |
| `ok` | `#39ff14` | OK/safe colour |
| `bg` | `#0a0a0f` | Card background colour |
| `panel` | `#111118` | Panel background colour |
| `interval` | `500` | Poll interval in milliseconds |

All options can also be changed live via the **⚙ CONFIG** button inside the card without editing YAML. Settings are saved to browser `localStorage` and persist across sessions.

### What the card shows

| Area | Content |
|------|---------|
| Header | Console selector, track name, config button |
| Status pills | Session status, Safety Car, Flag, DRS, Pit status, TC, ABS |
| Top HUD | Speed, Gear, RPM (with 20-LED rev bar), Suggested Gear |
| Input bars | Throttle, Brake, ERS Store, Fuel Laps |
| Car SVG | Top-down F1 car with per-corner tyre badges (wear %, surface temp, PSI, tyre damage %, blister %), brake heat glow on all 4 corners, DRS wing glow when active |
| Car info strip | Compound, Tyre Age, Track Temp, Engine Temp |
| Left panels | Race position, lap times, penalties, session counts |
| Right panels | Power unit, fuel, damage, engine wear |
| Bottom row | Brake temp + brake damage bars for all 4 corners |

---

## Example automations

### Flash lights yellow on yellow flag

```yaml
automation:
  - alias: "F1 Yellow Flag"
    trigger:
      - platform: state
        entity_id: sensor.f1_25_game_port_20777_flag
        to: "Yellow"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
        data:
          color_name: yellow
          brightness: 255
```

### Alert on terminal damage

```yaml
automation:
  - alias: "F1 Terminal Damage"
    trigger:
      - platform: state
        entity_id: sensor.f1_25_game_port_20777_terminal_damage
        to: "Yes"
    action:
      - service: notify.mobile_app
        data:
          message: "Terminal damage — retirement incoming!"
```

### Red lights on red flag

```yaml
automation:
  - alias: "F1 Red Flag"
    trigger:
      - platform: state
        entity_id: sensor.f1_25_game_port_20777_session_status
        to: "Red Flag"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
        data:
          color_name: red
```

---

## UDP Forwarding

If you run a secondary dashboard (phone app, steering wheel display, etc.) alongside HA, enable forwarding during setup to re-transmit raw packets to that device's IP and port. HA processes the packets first, then forwards them unchanged.

---

## Changelog

### v1.5.1
- Lovelace card fully responsive via CSS container queries — scales cleanly from span-1 (~300px) to span-4 (~1100px+)
- Card now recommended inside a `type: grid` card with `column_span` for best results
- Tyre badge damage and blister labels shortened (D% / B%) for compact layouts
- Status pills, HUD fonts, and panel sizes all scale with card width automatically
- Added prefix discovery note to README

### v1.5.0
- Added 50+ new sensors: lap penalties, deltas, pit data, engine wear, brake temps, tyre blisters/damage, ERS details, session counts
- Added `custom:f1-telemetry-card` Lovelace dashboard card
- Imperial / metric unit switching (per instance)
- Brake damage sensors (per corner)
- Tyre blister sensors (per corner) — new F1 25 data

### v1.2.0
- Added metric / imperial unit system option to config flow
- Speed switches between km/h and mph
- Track temp and tyre temps switch between °C and °F
- Fuel In Tank shows kg or gallons

### v1.1.0
- Multi-console support — add the integration multiple times on different ports
- Unique entity IDs scoped to config entry (no more collisions)
- Port conflict validation in config flow
- Device named per port
- Integration domain changed to `f1_25_telemetry_mc`
- Updated `hacs.json`, `manifest.json`, codeowner and URLs

---

## Credits

Original integration by [@richardvinger](https://github.com/richardvinger/f1-25-telemetry-for-home-assistant). Multi-console fork and extended sensor set by [@cobragt2000](https://github.com/cobragt2000).

F1 25 UDP telemetry specification by EA Sports / Codemasters.
