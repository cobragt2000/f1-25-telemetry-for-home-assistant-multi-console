
FORK of Original - With Added Items:

**Completed Additions:
Multi-Console support. Entities tied to name/port number, shouldn't be a limit on consoles. 
C/F temp selection.

**Pending Additions:




# F1 25 Game Telemetry for Home Assistant Multi Console

A high-performance custom integration for Home Assistant that brings real-time telemetry from EA Sports' **F1 25** game directly into your smarthome.

## 💡 What is this for?

- **🏮 Immersive Lighting**: Trigger your smart lights to match the flags! Flash yellow for yellow flags, red for session stops, or perhaps turn off all the lights when there's terminal damage.
- **🖥️ Ultimate Race Dashboards**: Create real-time dashboards that are useful during the race, with information like tyre wear, temperatures, and lap times.
- **🏁 Historic Data Analysis**: Track your performance over time. View graphs of your lap times, fuel consumption, and tyre degradation across different sessions.

## ✨ Features

- **🏎️ Real-time Car Telemetry**: Speed, RPM, Gear, Fuel levels, and ERS deployment.
- **🚦 Race Control**: Track session types (P, Q, R), session status, and start lights.
- **🛠️ Detailed Damage Tracking**: Individual wear and damage sensors for all four tyres, wings, and floor.
- **⏱️ Lap Timing**: Live lap counting, position tracking, and a formatted "Last Lap" time sensor.
- **☁️ Weather Forecast**: Forecast parsing to help you plan your pit strategy.
- **➡️ UDP Forwarding**: Re-transmit raw telemetry packets to another IP/Port, which can be useful if you have an existing dashboard on a phone or steering wheel.

## 🚀 Installation

### HACS (Recommended)
1. In HACS, go to **Integrations** and click the three dots in the top-right corner.
2. Select **Custom repositories**.
3. Paste the URL of this repository and select **Integration** as the category.
4. Click **Add** and then **Download**.
5. Restart Home Assistant.

### Manual
1. Copy the `custom_components/f1-25-telemetry-for-home-assistant-multi-console
` folder to your Home Assistant `config/custom_components/` directory.
2. Restart Home Assistant.

## ⚙️ Configuration

1. In Home Assistant, go to **Settings** -> **Devices & Services**.
2. Click **Add Integration** and search for **F1 25 Telemetry**.
3. **Local UDP Port**: Enter the port your game is broadcasting to (Default: `20777`).
4. **UDP Forwarding**: (Optional) Enable this if you want to forward data to another telemetry app or dashboard.

## 📝 F1 25 Game Settings

To enable telemetry in-game:
1. Go to **Settings** -> **Telemetry Settings**.
2. **UDP Telemetry**: `On`.
3. **UDP Broadcast Mode**: `Off` (unless you know what you're doing).
4. **UDP IP Address**: Enter the IP of your **Home Assistant** server.
5. **UDP Port**: `20777` (or your configured port).
6. **UDP Format**: `2025`.

## 📈 Sensors Included

- **Session Info**: Track, Weather, Safety Car Status, Session Status.
- **Performance**: Speed, RPM, Gear, Fuel Laps, Fastest Lap.
- **Damage**: Tyre Wear (FL/FR/RL/RR), Wing Damage, Floor Damage.
- **Status**: Flag, ERS Mode, DRS Allowed, Tyre Age.

*Note: High-frequency sensors (like ERS Store) are disabled by default to save database space. You can enable them manually in the entity settings.*
