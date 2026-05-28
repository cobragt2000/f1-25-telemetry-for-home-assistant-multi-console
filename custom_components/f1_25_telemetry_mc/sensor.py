"""Sensors for F1 25 Telemetry MC."""
from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfSpeed, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    CONF_PORT,
    CONF_UNIT_SYSTEM,
    DEFAULT_PORT,
    DEFAULT_UNIT_SYSTEM,
    UNIT_SYSTEM_IMPERIAL,
    ERS_MODE_MAP,
    FIA_FLAG_MAP,
    SAFETY_CAR_STATUS_MAP,
    WEATHER_MAP,
    TRACK_MAP,
    TYRE_COMPOUND_MAP,
)
from .coordinator import F125Coordinator

KMH_TO_MPH = 0.621371
CELSIUS_TO_FAHRENHEIT = lambda c: round((c * 9 / 5) + 32, 1)


def _is_imperial(entry: ConfigEntry) -> bool:
    """Return True if this entry is configured for imperial units."""
    unit = entry.options.get(CONF_UNIT_SYSTEM, entry.data.get(CONF_UNIT_SYSTEM, DEFAULT_UNIT_SYSTEM))
    return unit == UNIT_SYSTEM_IMPERIAL


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up F1 25 sensors."""
    coordinator: F125Coordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [
        F125SpeedSensor(coordinator, entry),
        F125GearSensor(coordinator, entry),
        F125RPMSensor(coordinator, entry),
        F125ThrottleSensor(coordinator, entry),
        F125BrakeSensor(coordinator, entry),
        F125LapSensor(coordinator, entry),
        F125PositionSensor(coordinator, entry),
        F125SafetyCarSensor(coordinator, entry),
        F125TrackTempSensor(coordinator, entry),
        F125WeatherSensor(coordinator, entry),
        F125SessionStatusSensor(coordinator, entry),
        F125StartLightsSensor(coordinator, entry),
        F125FlagSensor(coordinator, entry),
        F125ERSStoreSensor(coordinator, entry),
        F125ERSModeSensor(coordinator, entry),
        F125DRSSensor(coordinator, entry),
        F125DRSAllowedSensor(coordinator, entry),
        F125TrackSensor(coordinator, entry),
        F125TyreCompoundSensor(coordinator, entry),
        F125TyreAgeSensor(coordinator, entry),
        F125FuelLapsSensor(coordinator, entry),
        F125LeaderSensor(coordinator, entry),
        F125FastestLapSensor(coordinator, entry),
        F125FastestLapTimeSensor(coordinator, entry),
        F125LastLapTimeSensor(coordinator, entry),
        F125LastLapSensor(coordinator, entry),
        F125LapInvalidSensor(coordinator, entry),
        F125DamageSensor(coordinator, entry),
        F125TerminalDamageSensor(coordinator, entry),
        F125RainChanceSensor(coordinator, entry, 0, "Now"),
        F125RainChanceSensor(coordinator, entry, 5, "in 5m"),
        F125RainChanceSensor(coordinator, entry, 10, "in 10m"),
        F125RainChanceSensor(coordinator, entry, 15, "in 15m"),

        # Damage booleans
        F125WingDamageSensor(coordinator, entry, "Damaged Front Left Wing", "front_left_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Front Right Wing", "front_right_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Rear Wing", "rear_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Floor", "floor"),
    ]

    for i, label in enumerate(["Rear Left", "Rear Right", "Front Left", "Front Right"]):
        entities.append(F125TyreWearSensor(coordinator, entry, i, label))
        entities.append(F125TyreTempSensor(coordinator, entry, i, label))

    async_add_entities(entities)


class F1Sensor(CoordinatorEntity, SensorEntity):
    """Base class for F1 25 sensors."""

    def __init__(self, coordinator: F125Coordinator, entry: ConfigEntry):
        """Initialize."""
        super().__init__(coordinator)
        self._entry = entry
        self._entry_id = entry.entry_id
        port = entry.options.get(CONF_PORT, entry.data.get(CONF_PORT, DEFAULT_PORT))
        self._attr_has_entity_name = True
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"F1 25 Game (Port {port})",
            manufacturer="Electronic Arts",
            model="F1 25 Telemetry",
            sw_version="2025.1.0",
        )

    @property
    def _imperial(self) -> bool:
        """Return True if imperial units are selected."""
        return _is_imperial(self._entry)

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return super().available


class F125SpeedSensor(F1Sensor):
    """Speed Sensor — km/h (metric) or mph (imperial)."""

    _attr_translation_key = "speed"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_name = "Speed"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_speed"

    @property
    def native_unit_of_measurement(self):
        return UnitOfSpeed.MILES_PER_HOUR if self._imperial else UnitOfSpeed.KILOMETERS_PER_HOUR

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["car_telemetry"].get("speed")
        if val is None:
            return None
        if self._imperial:
            return int(val * KMH_TO_MPH)
        return int(val)


class F125GearSensor(F1Sensor):
    """Gear Sensor."""

    _attr_translation_key = "gear"
    _attr_name = "Gear"
    _attr_icon = "mdi:car-shift-pattern"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gear"

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["car_telemetry"].get("gear")
        return int(val) if val is not None else None


class F125RPMSensor(F1Sensor):
    """RPM Sensor."""

    _attr_translation_key = "rpm"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_name = "Engine RPM"
    _attr_icon = "mdi:gauge"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_rpm"

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["car_telemetry"].get("engine_rpm")
        return int(val) if val is not None else None


class F125ThrottleSensor(F1Sensor):
    """Throttle Sensor."""

    _attr_name = "Throttle"
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:gas-station"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_throttle"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("throttle")
        if val is not None:
            return int(val * 100)
        return None


class F125BrakeSensor(F1Sensor):
    """Brake Sensor."""

    _attr_name = "Brake"
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:alert-octagon-outline"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_brake"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("brake")
        if val is not None:
            return int(val * 100)
        return None


class F125LapSensor(F1Sensor):
    """Lap Number Sensor."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "laps"
    _attr_name = "Lap"
    _attr_icon = "mdi:flag-checkered"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_lap"

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["lap_data"].get("current_lap_num")
        return int(val) if val is not None else None


class F125PositionSensor(F1Sensor):
    """Position Sensor."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "pos"
    _attr_name = "Position"
    _attr_icon = "mdi:podium"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_position"

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["lap_data"].get("car_position")
        return int(val) if val is not None else None


class F125SafetyCarSensor(F1Sensor):
    """Safety Car Status Sensor."""

    _attr_name = "Safety Car"
    _attr_icon = "mdi:car-emergency"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_safety_car"

    @property
    def native_value(self):
        status = self.coordinator.data["session"].get("safety_car_status")
        return SAFETY_CAR_STATUS_MAP.get(status, "Unknown")


class F125TrackTempSensor(F1Sensor):
    """Track Temperature Sensor — °C (metric) or °F (imperial)."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_name = "Track Temperature"
    _attr_icon = "mdi:thermometer"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_track_temp"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        val = self.coordinator.data["session"].get("track_temperature")
        if val is None:
            return None
        if self._imperial:
            return CELSIUS_TO_FAHRENHEIT(val)
        return int(val)


class F125WeatherSensor(F1Sensor):
    """Weather Sensor."""

    _attr_name = "Weather"
    _attr_icon = "mdi:weather-partly-cloudy"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_weather"

    @property
    def native_value(self):
        w_id = self.coordinator.data["session"].get("weather")
        return WEATHER_MAP.get(w_id, "Unknown")


class F125SessionStatusSensor(F1Sensor):
    """Session Status Sensor."""

    _attr_name = "Session Status"
    _attr_icon = "mdi:flag"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_session_status"

    @property
    def native_value(self):
        return self.coordinator.data["events"].get("session_status", "Unknown")


class F125StartLightsSensor(F1Sensor):
    """Start Lights Sensor."""

    _attr_name = "Start Lights"
    _attr_icon = "mdi:traffic-light"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_start_lights"

    @property
    def native_value(self) -> int:
        return self.coordinator.data["events"].get("start_lights", 0)


class F125FlagSensor(F1Sensor):
    """FIA Flag Sensor."""

    _attr_name = "Flag"
    _attr_icon = "mdi:flag-variant"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_flag"

    @property
    def native_value(self):
        flag = self.coordinator.data["car_status"].get("fia_flags")
        return FIA_FLAG_MAP.get(flag, "Unknown")


class F125TyreWearSensor(F1Sensor):
    """Tyre Wear Sensor."""

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Wear {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_wear_{label.lower().replace(' ', '_')}"
        self._attr_native_unit_of_measurement = "%"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:tire"

    @property
    def native_value(self):
        wear = self.coordinator.data["car_damage"].get("tyres_wear")
        if wear and len(wear) > self._index:
            return round(wear[self._index], 1)
        return None


class F125TyreTempSensor(F1Sensor):
    """Tyre Temperature Sensor — °C (metric) or °F (imperial)."""

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Temp {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_temp_{label.lower().replace(' ', '_')}"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:thermometer-lines"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        temps = self.coordinator.data["car_telemetry"].get("tyre_surface_temp")
        if temps and len(temps) > self._index:
            val = temps[self._index]
            if self._imperial:
                return CELSIUS_TO_FAHRENHEIT(val)
            return val
        return None


class F125ERSStoreSensor(F1Sensor):
    """ERS Store Sensor (Percentage)."""

    _attr_name = "ERS Store"
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:battery-flash"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_store"

    @property
    def native_value(self) -> float | None:
        val = self.coordinator.data["car_status"].get("ers_store")
        if val is not None:
            pct = (val / 4000000.0) * 100.0
            return float(round(pct, 1))
        return None


class F125ERSModeSensor(F1Sensor):
    """ERS Mode Sensor."""

    _attr_name = "ERS Mode"
    _attr_icon = "mdi:car-electric"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_mode"

    @property
    def native_value(self):
        mode = self.coordinator.data["car_status"].get("ers_deploy_mode")
        return ERS_MODE_MAP.get(mode, "Unknown")


class F125DRSSensor(F1Sensor):
    """DRS State Sensor (On/Off)."""

    _attr_name = "DRS State"
    _attr_icon = "mdi:wing"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drs_state"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("drs")
        return "On" if val == 1 else "Off"


class F125DRSAllowedSensor(F1Sensor):
    """DRS Allowed Sensor."""

    _attr_name = "DRS Allowed"
    _attr_icon = "mdi:check-circle-outline"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drs_allowed"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("drs_allowed")
        return "Allowed" if val == 1 else "Not Allowed"


class F125TrackSensor(F1Sensor):
    """Track name sensor."""

    _attr_name = "Track"
    _attr_icon = "mdi:map-marker-path"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_track"

    @property
    def native_value(self):
        val = self.coordinator.data["session"].get("track_id")
        return TRACK_MAP.get(val, "Unknown")


class F125TyreCompoundSensor(F1Sensor):
    """Tyre compound sensor."""

    _attr_name = "Tyre Compound"
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_tyre_compound"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("tyre_visual")
        return TYRE_COMPOUND_MAP.get(val, "Unknown")


class F125TyreAgeSensor(F1Sensor):
    """Tyre age sensor (laps)."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "laps"
    _attr_name = "Tyre Age"
    _attr_icon = "mdi:counter"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_tyre_age"

    @property
    def native_value(self) -> int | None:
        val = self.coordinator.data["car_status"].get("tyre_age")
        return int(val) if val is not None else None


class F125FuelLapsSensor(F1Sensor):
    """Fuel remaining in laps."""

    _attr_name = "Fuel Laps"
    _attr_icon = "mdi:fuel"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fuel_laps"

    @property
    def native_value(self) -> float | None:
        val = self.coordinator.data["car_status"].get("fuel_remaining_laps")
        return float(round(val, 2)) if val is not None else None


class F125LeaderSensor(F1Sensor):
    """Leader name sensor."""

    _attr_name = "Leader"
    _attr_icon = "mdi:account-star"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_leader"

    @property
    def native_value(self):
        idx = self.coordinator.data["session"].get("leader_index")
        if idx is not None:
            return self.coordinator.data["participants"].get(idx, "Unknown")
        return "Unknown"


class F125FastestLapSensor(F1Sensor):
    """Fastest lap driver sensor."""

    _attr_name = "Fastest Lap"
    _attr_icon = "mdi:timer-star"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fastest_lap"

    @property
    def native_value(self):
        idx = self.coordinator.data["fastest_lap"].get("car_index")
        if idx is not None and idx != 255:
            return self.coordinator.data["participants"].get(idx, "Unknown")
        return "None"


class F125FastestLapTimeSensor(F1Sensor):
    """Fastest lap time sensor."""

    _attr_name = "Fastest Lap Time"
    _attr_icon = "mdi:timer-outline"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fastest_lap_time"

    @property
    def native_value(self) -> float | None:
        val = self.coordinator.data["fastest_lap"].get("lap_time")
        return float(round(val, 3)) if val and val > 0 else None


class F125LastLapTimeSensor(F1Sensor):
    """Last lap time sensor."""

    _attr_name = "Last Lap Time"
    _attr_icon = "mdi:history"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_last_lap_time"

    @property
    def native_value(self) -> float | None:
        val = self.coordinator.data["lap_data"].get("last_lap_time")
        return float(val / 1000.0) if val and val > 0 else None


class F125LastLapSensor(F1Sensor):
    """Last lap formatted string sensor."""

    _attr_name = "Last Lap"
    _attr_icon = "mdi:timer-sand"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_last_lap"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("last_lap_str", "0:00.000")


class F125LapInvalidSensor(F1Sensor):
    """Lap invalid sensor."""

    _attr_name = "Lap Invalid"
    _attr_icon = "mdi:alert-circle"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_lap_invalid"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("current_lap_invalid")
        return "Yes" if val == 1 else "No"


class F125DamageSensor(F1Sensor):
    """General damage sensor."""

    _attr_name = "Damage"
    _attr_icon = "mdi:car-wrench"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_damage"

    @property
    def native_value(self):
        val = self.coordinator.data["car_damage"].get("has_damage")
        return "Yes" if val == 1 else "No"


class F125TerminalDamageSensor(F1Sensor):
    """Terminal damage sensor."""

    _attr_name = "Terminal Damage"
    _attr_icon = "mdi:car-crash"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_terminal_damage"

    @property
    def native_value(self):
        val = self.coordinator.data["car_damage"].get("terminal")
        return "Yes" if val == 1 else "No"


class F125RainChanceSensor(F1Sensor):
    """Rain chance sensor."""

    def __init__(self, coordinator, entry, minutes, name_suffix):
        super().__init__(coordinator, entry)
        self._minutes = minutes
        self._attr_name = f"Rain Chance {name_suffix}"
        self._attr_unique_id = f"{entry.entry_id}_rain_chance_{minutes}"
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:weather-rainy"

    @property
    def native_value(self) -> int:
        forecast = self.coordinator.data.get("forecast", [])
        for f in forecast:
            if f["time"] == self._minutes:
                return int(f["rain"])
        return 0


class F125WingDamageSensor(F1Sensor):
    """Wing damage boolean sensor."""

    def __init__(self, coordinator, entry, label, key):
        super().__init__(coordinator, entry)
        self._key = key
        self._attr_name = label
        self._attr_unique_id = f"{entry.entry_id}_damage_{key}"
        self._attr_icon = "mdi:car-back"

    @property
    def native_value(self):
        val = self.coordinator.data.get("car_damage", {}).get(self._key, 0)
        return "Yes" if val > 0 else "No"
