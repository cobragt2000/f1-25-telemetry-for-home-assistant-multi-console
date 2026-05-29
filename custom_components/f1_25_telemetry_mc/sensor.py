"""Sensors for F1 25 Telemetry MC."""
from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfSpeed, UnitOfTemperature, UnitOfPressure, UnitOfPower
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
from .coordinator import F125Coordinator, TC_MAP, FUEL_MIX_MAP, PIT_STATUS_MAP

KMH_TO_MPH = 0.621371
KG_TO_LBS  = 2.20462
CELSIUS_TO_FAHRENHEIT = lambda c: round((c * 9 / 5) + 32, 1)

# Actual tyre compound map (more detailed than visual)
ACTUAL_TYRE_MAP = {
    16: "C5", 17: "C4", 18: "C3", 19: "C2", 20: "C1", 21: "C0", 22: "C6",
    7: "Inter", 8: "Wet",
    9: "Classic Dry", 10: "Classic Wet",
    11: "F2 Super Soft", 12: "F2 Soft", 13: "F2 Medium", 14: "F2 Hard", 15: "F2 Wet",
}

WHEEL_LABELS = ["Rear Left", "Rear Right", "Front Left", "Front Right"]


def _is_imperial(entry: ConfigEntry) -> bool:
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
        # --- Car Telemetry ---
        F125SpeedSensor(coordinator, entry),
        F125GearSensor(coordinator, entry),
        F125RPMSensor(coordinator, entry),
        F125ThrottleSensor(coordinator, entry),
        F125BrakeSensor(coordinator, entry),
        F125SuggestedGearSensor(coordinator, entry),
        F125EngineTemperatureSensor(coordinator, entry),

        # --- Lap Data ---
        F125LapSensor(coordinator, entry),
        F125PositionSensor(coordinator, entry),
        F125CurrentLapTimeSensor(coordinator, entry),
        F125LastLapTimeSensor(coordinator, entry),
        F125LastLapSensor(coordinator, entry),
        F125LapInvalidSensor(coordinator, entry),
        F125DeltaToCarInFrontSensor(coordinator, entry),
        F125DeltaToRaceLeaderSensor(coordinator, entry),
        F125PitStatusSensor(coordinator, entry),
        F125NumPitStopsSensor(coordinator, entry),
        F125PenaltiesSensor(coordinator, entry),
        F125TotalWarningsSensor(coordinator, entry),
        F125CornerCuttingWarningsSensor(coordinator, entry),
        F125DriveThroughPensSensor(coordinator, entry),
        F125StopGoPensSensor(coordinator, entry),
        F125GridPositionSensor(coordinator, entry),
        F125SpeedTrapSensor(coordinator, entry),

        # --- Session ---
        F125SafetyCarSensor(coordinator, entry),
        F125TrackTempSensor(coordinator, entry),
        F125WeatherSensor(coordinator, entry),
        F125SessionStatusSensor(coordinator, entry),
        F125StartLightsSensor(coordinator, entry),
        F125FlagSensor(coordinator, entry),
        F125TrackSensor(coordinator, entry),
        F125SafetyCarCountSensor(coordinator, entry),
        F125VirtualSafetyCarCountSensor(coordinator, entry),
        F125RedFlagCountSensor(coordinator, entry),

        # --- Car Status ---
        F125TractionControlSensor(coordinator, entry),
        F125AntiLockBrakesSensor(coordinator, entry),
        F125FuelMixSensor(coordinator, entry),
        F125FuelInTankSensor(coordinator, entry),
        F125FuelLapsSensor(coordinator, entry),
        F125PitLimiterSensor(coordinator, entry),
        F125MaxRPMSensor(coordinator, entry),
        F125DRSSensor(coordinator, entry),
        F125DRSAllowedSensor(coordinator, entry),
        F125DRSActivationDistanceSensor(coordinator, entry),
        F125ActualTyreCompoundSensor(coordinator, entry),
        F125TyreCompoundSensor(coordinator, entry),
        F125TyreAgeSensor(coordinator, entry),
        F125ERSStoreSensor(coordinator, entry),
        F125ERSModeSensor(coordinator, entry),
        F125EngineICEPowerSensor(coordinator, entry),
        F125EngineMGUKPowerSensor(coordinator, entry),
        F125ERSHarvestedMGUHSensor(coordinator, entry),
        F125ERSDeployedLapSensor(coordinator, entry),

        # --- Race Info ---
        F125LeaderSensor(coordinator, entry),
        F125FastestLapSensor(coordinator, entry),
        F125FastestLapTimeSensor(coordinator, entry),

        # --- Rain forecast ---
        F125RainChanceSensor(coordinator, entry, 0, "Now"),
        F125RainChanceSensor(coordinator, entry, 5, "in 5m"),
        F125RainChanceSensor(coordinator, entry, 10, "in 10m"),
        F125RainChanceSensor(coordinator, entry, 15, "in 15m"),

        # --- Damage: Wings / Body ---
        F125WingDamageSensor(coordinator, entry, "Damaged Front Left Wing", "front_left_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Front Right Wing", "front_right_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Rear Wing", "rear_wing"),
        F125WingDamageSensor(coordinator, entry, "Damaged Floor", "floor"),
        F125DiffuserDamageSensor(coordinator, entry),
        F125SidepodDamageSensor(coordinator, entry),
        F125DRSFaultSensor(coordinator, entry),
        F125ERSFaultSensor(coordinator, entry),
        F125GearboxDamageSensor(coordinator, entry),
        F125EngineDamageSensor(coordinator, entry),
        F125EngineBlownSensor(coordinator, entry),
        F125EngineSiezedSensor(coordinator, entry),
        F125DamageSensor(coordinator, entry),
        F125TerminalDamageSensor(coordinator, entry),

        # --- Engine Component Wear ---
        F125EngineMGUHWearSensor(coordinator, entry),
        F125EngineESWearSensor(coordinator, entry),
        F125EngineCEWearSensor(coordinator, entry),
        F125EngineICEWearSensor(coordinator, entry),
        F125EngineMGUKWearSensor(coordinator, entry),
        F125EngineTCWearSensor(coordinator, entry),
    ]

    # Per-wheel sensors
    for i, label in enumerate(WHEEL_LABELS):
        entities.append(F125TyreWearSensor(coordinator, entry, i, label))
        entities.append(F125TyreTempSensor(coordinator, entry, i, label))
        entities.append(F125TyreInnerTempSensor(coordinator, entry, i, label))
        entities.append(F125TyreDamageSensor(coordinator, entry, i, label))
        entities.append(F125TyreBlistersSensor(coordinator, entry, i, label))
        entities.append(F125BrakeDamageSensor(coordinator, entry, i, label))
        entities.append(F125BrakeTempSensor(coordinator, entry, i, label))
        entities.append(F125TyrePressureSensor(coordinator, entry, i, label))

    async_add_entities(entities)


# ---------------------------------------------------------------------------
# Base sensor
# ---------------------------------------------------------------------------

class F1Sensor(CoordinatorEntity, SensorEntity):
    """Base class for F1 25 sensors."""

    def __init__(self, coordinator: F125Coordinator, entry: ConfigEntry):
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
        return _is_imperial(self._entry)

    @property
    def available(self) -> bool:
        return super().available


# ---------------------------------------------------------------------------
# Car Telemetry sensors
# ---------------------------------------------------------------------------

class F125SpeedSensor(F1Sensor):
    _attr_name = "Speed"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_speed"

    @property
    def native_unit_of_measurement(self):
        return UnitOfSpeed.MILES_PER_HOUR if self._imperial else UnitOfSpeed.KILOMETERS_PER_HOUR

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("speed")
        if val is None:
            return None
        return int(val * KMH_TO_MPH) if self._imperial else int(val)


class F125GearSensor(F1Sensor):
    _attr_name = "Gear"
    _attr_icon = "mdi:car-shift-pattern"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gear"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("gear")
        return int(val) if val is not None else None


class F125RPMSensor(F1Sensor):
    _attr_name = "Engine RPM"
    _attr_icon = "mdi:gauge"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_rpm"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("engine_rpm")
        return int(val) if val is not None else None


class F125ThrottleSensor(F1Sensor):
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
        return int(val * 100) if val is not None else None


class F125BrakeSensor(F1Sensor):
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
        return int(val * 100) if val is not None else None


class F125SuggestedGearSensor(F1Sensor):
    _attr_name = "Suggested Gear"
    _attr_icon = "mdi:car-shift-pattern"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_suggested_gear"

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("suggested_gear")
        if val is None or val == 0:
            return "None"
        return int(val)


class F125EngineTemperatureSensor(F1Sensor):
    _attr_name = "Engine Temperature"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_temp"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        val = self.coordinator.data["car_telemetry"].get("engine_temp")
        if val is None:
            return None
        return CELSIUS_TO_FAHRENHEIT(val) if self._imperial else int(val)


# ---------------------------------------------------------------------------
# Lap Data sensors
# ---------------------------------------------------------------------------

class F125LapSensor(F1Sensor):
    _attr_name = "Lap"
    _attr_icon = "mdi:flag-checkered"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "laps"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_lap"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("current_lap_num")
        return int(val) if val is not None else None


class F125PositionSensor(F1Sensor):
    _attr_name = "Position"
    _attr_icon = "mdi:podium"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "pos"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_position"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("car_position")
        return int(val) if val is not None else None


class F125CurrentLapTimeSensor(F1Sensor):
    _attr_name = "Current Lap Time"
    _attr_icon = "mdi:timer-play"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_current_lap_time"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("current_lap_str", "0:00.000")


class F125LastLapTimeSensor(F1Sensor):
    _attr_name = "Last Lap Time"
    _attr_icon = "mdi:history"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_last_lap_time"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("last_lap_time")
        return float(val / 1000.0) if val and val > 0 else None


class F125LastLapSensor(F1Sensor):
    _attr_name = "Last Lap"
    _attr_icon = "mdi:timer-sand"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_last_lap"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("last_lap_str", "0:00.000")


class F125LapInvalidSensor(F1Sensor):
    _attr_name = "Lap Invalid"
    _attr_icon = "mdi:alert-circle"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_lap_invalid"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("current_lap_invalid")
        return "Yes" if val == 1 else "No"


class F125DeltaToCarInFrontSensor(F1Sensor):
    _attr_name = "Delta to Car in Front"
    _attr_icon = "mdi:car-arrow-left"
    _attr_native_unit_of_measurement = "s"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_delta_to_car_in_front"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("delta_to_car_in_front")


class F125DeltaToRaceLeaderSensor(F1Sensor):
    _attr_name = "Delta to Race Leader"
    _attr_icon = "mdi:car-arrow-left"
    _attr_native_unit_of_measurement = "s"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_delta_to_race_leader"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("delta_to_race_leader")


class F125PitStatusSensor(F1Sensor):
    _attr_name = "Pit Status"
    _attr_icon = "mdi:wrench"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_pit_status"

    @property
    def native_value(self):
        return self.coordinator.data["lap_data"].get("pit_status_str", "Unknown")


class F125NumPitStopsSensor(F1Sensor):
    _attr_name = "Pit Stops"
    _attr_icon = "mdi:wrench-clock"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_num_pit_stops"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("num_pit_stops")
        return int(val) if val is not None else None


class F125PenaltiesSensor(F1Sensor):
    _attr_name = "Penalties"
    _attr_icon = "mdi:clock-alert"
    _attr_native_unit_of_measurement = "s"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_penalties"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("penalties")
        return int(val) if val is not None else None


class F125TotalWarningsSensor(F1Sensor):
    _attr_name = "Warnings"
    _attr_icon = "mdi:alert"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_total_warnings"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("total_warnings")
        return int(val) if val is not None else None


class F125CornerCuttingWarningsSensor(F1Sensor):
    _attr_name = "Corner Cutting Warnings"
    _attr_icon = "mdi:scissors-cutting"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_corner_cutting_warnings"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("corner_cutting_warnings")
        return int(val) if val is not None else None


class F125DriveThroughPensSensor(F1Sensor):
    _attr_name = "Drive-Through Pens"
    _attr_icon = "mdi:road"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drive_through_pens"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("drive_through_pens")
        return int(val) if val is not None else None


class F125StopGoPensSensor(F1Sensor):
    _attr_name = "Stop-Go Pens"
    _attr_icon = "mdi:stop"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_stop_go_pens"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("stop_go_pens")
        return int(val) if val is not None else None


class F125GridPositionSensor(F1Sensor):
    _attr_name = "Grid Position"
    _attr_icon = "mdi:traffic-cone"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_grid_position"

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("grid_position")
        return int(val) if val is not None else None


class F125SpeedTrapSensor(F1Sensor):
    _attr_name = "Speed Trap"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:radar"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_speed_trap"

    @property
    def native_unit_of_measurement(self):
        return UnitOfSpeed.MILES_PER_HOUR if self._imperial else UnitOfSpeed.KILOMETERS_PER_HOUR

    @property
    def native_value(self):
        val = self.coordinator.data["lap_data"].get("speed_trap_fastest_speed")
        if val is None or val == 0:
            return None
        return round(val * KMH_TO_MPH, 1) if self._imperial else val


# ---------------------------------------------------------------------------
# Session sensors
# ---------------------------------------------------------------------------

class F125SafetyCarSensor(F1Sensor):
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
    _attr_name = "Track Temperature"
    _attr_state_class = SensorStateClass.MEASUREMENT
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
        return CELSIUS_TO_FAHRENHEIT(val) if self._imperial else int(val)


class F125WeatherSensor(F1Sensor):
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
    _attr_name = "Session Status"
    _attr_icon = "mdi:flag"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_session_status"

    @property
    def native_value(self):
        return self.coordinator.data["events"].get("session_status", "Unknown")


class F125StartLightsSensor(F1Sensor):
    _attr_name = "Start Lights"
    _attr_icon = "mdi:traffic-light"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_start_lights"

    @property
    def native_value(self):
        return self.coordinator.data["events"].get("start_lights", 0)


class F125FlagSensor(F1Sensor):
    _attr_name = "Flag"
    _attr_icon = "mdi:flag-variant"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_flag"

    @property
    def native_value(self):
        flag = self.coordinator.data["car_status"].get("fia_flags")
        return FIA_FLAG_MAP.get(flag, "Unknown")


class F125TrackSensor(F1Sensor):
    _attr_name = "Track"
    _attr_icon = "mdi:map-marker-path"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_track"

    @property
    def native_value(self):
        val = self.coordinator.data["session"].get("track_id")
        return TRACK_MAP.get(val, "Unknown")


class F125SafetyCarCountSensor(F1Sensor):
    _attr_name = "Safety Car Count"
    _attr_icon = "mdi:car-emergency"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_safety_car_count"

    @property
    def native_value(self):
        return self.coordinator.data["session"].get("num_safety_car_periods", 0)


class F125VirtualSafetyCarCountSensor(F1Sensor):
    _attr_name = "Virtual Safety Car Count"
    _attr_icon = "mdi:car-emergency"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_virtual_safety_car_count"

    @property
    def native_value(self):
        return self.coordinator.data["session"].get("num_virtual_safety_car_periods", 0)


class F125RedFlagCountSensor(F1Sensor):
    _attr_name = "Red Flag Count"
    _attr_icon = "mdi:flag"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_red_flag_count"

    @property
    def native_value(self):
        return self.coordinator.data["session"].get("num_red_flag_periods", 0)


# ---------------------------------------------------------------------------
# Car Status sensors
# ---------------------------------------------------------------------------

class F125TractionControlSensor(F1Sensor):
    _attr_name = "Traction Control"
    _attr_icon = "mdi:car-traction-control"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_traction_control"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("traction_control")
        return TC_MAP.get(val, "Unknown")


class F125AntiLockBrakesSensor(F1Sensor):
    _attr_name = "Anti-Lock Brakes"
    _attr_icon = "mdi:car-brake-abs"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_anti_lock_brakes"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("anti_lock_brakes")
        return "On" if val == 1 else "Off"


class F125FuelMixSensor(F1Sensor):
    _attr_name = "Fuel Mix"
    _attr_icon = "mdi:fuel"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fuel_mix"

    @property
    def native_value(self):
        return self.coordinator.data["car_status"].get("fuel_mix_str", "Unknown")


class F125FuelInTankSensor(F1Sensor):
    _attr_name = "Fuel In Tank"
    _attr_icon = "mdi:fuel"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fuel_in_tank"

    @property
    def native_unit_of_measurement(self):
        return "gal" if self._imperial else "kg"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("fuel_in_tank")
        if val is None:
            return None
        if self._imperial:
            return round(val * KG_TO_LBS / 6.3, 3)  # kg → lbs → US gal (approx using F1 fuel ~6.3 lb/gal)
        return round(val, 3)


class F125FuelLapsSensor(F1Sensor):
    _attr_name = "Fuel Laps"
    _attr_icon = "mdi:fuel"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fuel_laps"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("fuel_remaining_laps")
        return round(val, 2) if val is not None else None


class F125PitLimiterSensor(F1Sensor):
    _attr_name = "Pit Limiter"
    _attr_icon = "mdi:speedometer-slow"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_pit_limiter"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("pit_limiter_status")
        return "On" if val == 1 else "Off"


class F125MaxRPMSensor(F1Sensor):
    _attr_name = "Max RPM"
    _attr_icon = "mdi:gauge-full"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_max_rpm"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("max_rpm")
        return int(val) if val else None


class F125DRSSensor(F1Sensor):
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
    _attr_name = "DRS Allowed"
    _attr_icon = "mdi:check-circle-outline"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drs_allowed"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("drs_allowed")
        return "Allowed" if val == 1 else "Not Allowed"


class F125DRSActivationDistanceSensor(F1Sensor):
    _attr_name = "DRS Activation Distance"
    _attr_icon = "mdi:map-marker-distance"
    _attr_native_unit_of_measurement = "m"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drs_activation_distance"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("drs_activation_distance")
        return int(val) if val else None


class F125ActualTyreCompoundSensor(F1Sensor):
    _attr_name = "Actual Tyre Compound"
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_actual_tyre_compound"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("actual_tyre_compound")
        return ACTUAL_TYRE_MAP.get(val, "Unknown")


class F125TyreCompoundSensor(F1Sensor):
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
    _attr_name = "Tyre Age"
    _attr_icon = "mdi:counter"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "laps"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_tyre_age"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("tyre_age")
        return int(val) if val is not None else None


class F125ERSStoreSensor(F1Sensor):
    _attr_name = "ERS Store"
    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:battery-flash"
    _attr_entity_registry_enabled_default = False

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_store"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("ers_store")
        return round((val / 4000000.0) * 100.0, 1) if val is not None else None


class F125ERSModeSensor(F1Sensor):
    _attr_name = "ERS Mode"
    _attr_icon = "mdi:car-electric"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_mode"

    @property
    def native_value(self):
        mode = self.coordinator.data["car_status"].get("ers_deploy_mode")
        return ERS_MODE_MAP.get(mode, "Unknown")


class F125EngineICEPowerSensor(F1Sensor):
    _attr_name = "Engine Power ICE"
    _attr_icon = "mdi:engine"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "W"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_power_ice"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("engine_power_ice")
        return round(val, 1) if val is not None else None


class F125EngineMGUKPowerSensor(F1Sensor):
    _attr_name = "Engine Power MGU-K"
    _attr_icon = "mdi:lightning-bolt"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "W"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_power_mguk"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("engine_power_mguk")
        return round(val, 1) if val is not None else None


class F125ERSHarvestedMGUHSensor(F1Sensor):
    _attr_name = "ERS Harvested MGU-H"
    _attr_icon = "mdi:battery-charging"
    _attr_native_unit_of_measurement = "J"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_harvested_mguh"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("ers_harvested_mguh")
        return round(val, 1) if val is not None else None


class F125ERSDeployedLapSensor(F1Sensor):
    _attr_name = "ERS Deployed This Lap"
    _attr_icon = "mdi:battery-arrow-down"
    _attr_native_unit_of_measurement = "J"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_deployed_lap"

    @property
    def native_value(self):
        val = self.coordinator.data["car_status"].get("ers_deployed_this_lap")
        return round(val, 1) if val is not None else None


# ---------------------------------------------------------------------------
# Race info sensors
# ---------------------------------------------------------------------------

class F125LeaderSensor(F1Sensor):
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
    _attr_name = "Fastest Lap Time"
    _attr_icon = "mdi:timer-outline"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fastest_lap_time"

    @property
    def native_value(self):
        val = self.coordinator.data["fastest_lap"].get("lap_time")
        return round(val, 3) if val and val > 0 else None


# ---------------------------------------------------------------------------
# Rain forecast sensors
# ---------------------------------------------------------------------------

class F125RainChanceSensor(F1Sensor):
    def __init__(self, coordinator, entry, minutes, name_suffix):
        super().__init__(coordinator, entry)
        self._minutes = minutes
        self._attr_name = f"Rain Chance {name_suffix}"
        self._attr_unique_id = f"{entry.entry_id}_rain_chance_{minutes}"
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:weather-rainy"

    @property
    def native_value(self):
        for f in self.coordinator.data.get("forecast", []):
            if f["time"] == self._minutes:
                return int(f["rain"])
        return 0


# ---------------------------------------------------------------------------
# Damage sensors — wings / body
# ---------------------------------------------------------------------------

class F125WingDamageSensor(F1Sensor):
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


class F125DiffuserDamageSensor(F1Sensor):
    _attr_name = "Diffuser Damage"
    _attr_icon = "mdi:car-back"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_diffuser_damage"

    @property
    def native_value(self):
        return self.coordinator.data.get("car_damage", {}).get("diffuser", 0)


class F125SidepodDamageSensor(F1Sensor):
    _attr_name = "Sidepod Damage"
    _attr_icon = "mdi:car-side"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_sidepod_damage"

    @property
    def native_value(self):
        return self.coordinator.data.get("car_damage", {}).get("sidepod", 0)


class F125DRSFaultSensor(F1Sensor):
    _attr_name = "DRS Fault"
    _attr_icon = "mdi:wing"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_drs_fault"

    @property
    def native_value(self):
        val = self.coordinator.data.get("car_damage", {}).get("drs_fault", 0)
        return "Fault" if val == 1 else "OK"


class F125ERSFaultSensor(F1Sensor):
    _attr_name = "ERS Fault"
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ers_fault"

    @property
    def native_value(self):
        val = self.coordinator.data.get("car_damage", {}).get("ers_fault", 0)
        return "Fault" if val == 1 else "OK"


class F125GearboxDamageSensor(F1Sensor):
    _attr_name = "Gearbox Damage"
    _attr_icon = "mdi:car-shift-pattern"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gearbox_damage"

    @property
    def native_value(self):
        return self.coordinator.data.get("car_damage", {}).get("gearbox_damage", 0)


class F125EngineDamageSensor(F1Sensor):
    _attr_name = "Engine Damage"
    _attr_icon = "mdi:engine"
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_damage"

    @property
    def native_value(self):
        return self.coordinator.data.get("car_damage", {}).get("engine_damage", 0)


class F125EngineBlownSensor(F1Sensor):
    _attr_name = "Engine Blown"
    _attr_icon = "mdi:engine-off"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_blown"

    @property
    def native_value(self):
        val = self.coordinator.data.get("car_damage", {}).get("engine_blown", 0)
        return "Yes" if val == 1 else "No"


class F125EngineSiezedSensor(F1Sensor):
    _attr_name = "Engine Seized"
    _attr_icon = "mdi:engine-off"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_seized"

    @property
    def native_value(self):
        val = self.coordinator.data.get("car_damage", {}).get("engine_seized", 0)
        return "Yes" if val == 1 else "No"


class F125DamageSensor(F1Sensor):
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
    _attr_name = "Terminal Damage"
    _attr_icon = "mdi:car-crash"

    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_terminal_damage"

    @property
    def native_value(self):
        val = self.coordinator.data["car_damage"].get("terminal")
        return "Yes" if val == 1 else "No"


# ---------------------------------------------------------------------------
# Engine component wear sensors
# ---------------------------------------------------------------------------

class _EngineWearSensor(F1Sensor):
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:engine"
    _damage_key: str = ""

    @property
    def native_value(self):
        return self.coordinator.data.get("car_damage", {}).get(self._damage_key, 0)


class F125EngineMGUHWearSensor(_EngineWearSensor):
    _attr_name = "Engine MGU-H Wear"
    _damage_key = "engine_mguh_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_mguh_wear"


class F125EngineESWearSensor(_EngineWearSensor):
    _attr_name = "Engine ES Wear"
    _damage_key = "engine_es_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_es_wear"


class F125EngineCEWearSensor(_EngineWearSensor):
    _attr_name = "Engine CE Wear"
    _damage_key = "engine_ce_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_ce_wear"


class F125EngineICEWearSensor(_EngineWearSensor):
    _attr_name = "Engine ICE Wear"
    _damage_key = "engine_ice_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_ice_wear"


class F125EngineMGUKWearSensor(_EngineWearSensor):
    _attr_name = "Engine MGU-K Wear"
    _damage_key = "engine_mguk_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_mguk_wear"


class F125EngineTCWearSensor(_EngineWearSensor):
    _attr_name = "Engine TC Wear"
    _damage_key = "engine_tc_wear"
    def __init__(self, coordinator, entry):
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_engine_tc_wear"


# ---------------------------------------------------------------------------
# Per-wheel sensors
# ---------------------------------------------------------------------------

class F125TyreWearSensor(F1Sensor):
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Wear {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_wear_{label.lower().replace(' ', '_')}"

    @property
    def native_value(self):
        wear = self.coordinator.data["car_damage"].get("tyres_wear")
        return round(wear[self._index], 1) if wear and len(wear) > self._index else None


class F125TyreTempSensor(F1Sensor):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer-lines"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Temp {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_temp_{label.lower().replace(' ', '_')}"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        temps = self.coordinator.data["car_telemetry"].get("tyre_surface_temp")
        if temps and len(temps) > self._index:
            val = temps[self._index]
            return CELSIUS_TO_FAHRENHEIT(val) if self._imperial else val
        return None


class F125TyreInnerTempSensor(F1Sensor):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer-high"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Inner Temp {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_inner_temp_{label.lower().replace(' ', '_')}"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        temps = self.coordinator.data["car_telemetry"].get("tyre_inner_temp")
        if temps and len(temps) > self._index:
            val = temps[self._index]
            return CELSIUS_TO_FAHRENHEIT(val) if self._imperial else val
        return None


class F125TyreDamageSensor(F1Sensor):
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Damage {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_damage_{label.lower().replace(' ', '_')}"

    @property
    def native_value(self):
        dmg = self.coordinator.data["car_damage"].get("tyres_damage")
        return int(dmg[self._index]) if dmg and len(dmg) > self._index else None


class F125TyreBlistersSensor(F1Sensor):
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Blisters {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_blisters_{label.lower().replace(' ', '_')}"

    @property
    def native_value(self):
        bl = self.coordinator.data["car_damage"].get("tyre_blisters")
        return int(bl[self._index]) if bl and len(bl) > self._index else None


class F125BrakeDamageSensor(F1Sensor):
    _attr_native_unit_of_measurement = "%"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:car-brake-alert"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Brake Damage {label}"
        self._attr_unique_id = f"{entry.entry_id}_brake_damage_{label.lower().replace(' ', '_')}"

    @property
    def native_value(self):
        dmg = self.coordinator.data["car_damage"].get("brakes_damage")
        return int(dmg[self._index]) if dmg and len(dmg) > self._index else None


class F125BrakeTempSensor(F1Sensor):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Brake Temp {label}"
        self._attr_unique_id = f"{entry.entry_id}_brake_temp_{label.lower().replace(' ', '_')}"

    @property
    def native_unit_of_measurement(self):
        return UnitOfTemperature.FAHRENHEIT if self._imperial else UnitOfTemperature.CELSIUS

    @property
    def native_value(self):
        temps = self.coordinator.data["car_telemetry"].get("brake_temps")
        if temps and len(temps) > self._index:
            val = temps[self._index]
            return CELSIUS_TO_FAHRENHEIT(val) if self._imperial else val
        return None


class F125TyrePressureSensor(F1Sensor):
    _attr_native_unit_of_measurement = "PSI"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:tire"

    def __init__(self, coordinator, entry, index, label):
        super().__init__(coordinator, entry)
        self._index = index
        self._attr_name = f"Tyre Pressure {label}"
        self._attr_unique_id = f"{entry.entry_id}_tyre_pressure_{label.lower().replace(' ', '_')}"

    @property
    def native_value(self):
        press = self.coordinator.data["car_telemetry"].get("tyre_pressure")
        return round(press[self._index], 1) if press and len(press) > self._index else None
