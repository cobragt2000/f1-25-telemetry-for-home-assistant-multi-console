"""Data Coordinator for F1 25 Telemetry MC."""
import asyncio
import logging
import socket
import struct
import time
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    DOMAIN,
    DEFAULT_PORT,
    CONF_PORT,
    CONF_FORWARD_ENABLED,
    CONF_FORWARD_IP,
    CONF_FORWARD_PORT,
    DEVICE_ID,
    PACKET_HEADER_SIZE,
    PACKET_ID_CAR_DAMAGE,
    PACKET_ID_CAR_STATUS,
    PACKET_ID_CAR_TELEMETRY,
    PACKET_ID_EVENT,
    PACKET_ID_LAP_DATA,
    PACKET_ID_PARTICIPANTS,
    PACKET_ID_SESSION,
    PACKET_SIZES,
)

_LOGGER = logging.getLogger(__name__)

RELEVANT_PACKETS = [
    PACKET_ID_SESSION,
    PACKET_ID_LAP_DATA,
    PACKET_ID_CAR_TELEMETRY,
    PACKET_ID_CAR_STATUS,
    PACKET_ID_CAR_DAMAGE,
    PACKET_ID_EVENT,
    PACKET_ID_PARTICIPANTS,
]

# Fuel mix map
FUEL_MIX_MAP = {0: "Lean", 1: "Standard", 2: "Rich", 3: "Max"}
# Pit status map
PIT_STATUS_MAP = {0: "None", 1: "Pitting", 2: "In Pit Area"}
# Traction control map
TC_MAP = {0: "Off", 1: "Medium", 2: "Full"}


class F125Coordinator(DataUpdateCoordinator):
    """Class to manage fetching F1 25 data via UDP."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=None,
        )
        self.entry = entry
        self.port = entry.options.get(CONF_PORT, entry.data.get(CONF_PORT, DEFAULT_PORT))
        self.transport = None
        self.protocol = None
        self._last_update = 0
        self._forward_socket = None
        self._forward_dest = None

        forward_enabled = entry.options.get(CONF_FORWARD_ENABLED, entry.data.get(CONF_FORWARD_ENABLED, False))
        if forward_enabled:
            ip = entry.options.get(CONF_FORWARD_IP, entry.data.get(CONF_FORWARD_IP))
            port = entry.options.get(CONF_FORWARD_PORT, entry.data.get(CONF_FORWARD_PORT, DEFAULT_PORT))
            if ip and port:
                self._forward_dest = (ip, port)
                self._forward_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                _LOGGER.info(f"UDP Forwarding enabled to {ip}:{port}")

        self.data = {
            "session": {},
            "lap_data": {},
            "car_telemetry": {},
            "car_status": {},
            "car_damage": {},
            "participants": {},
            "fastest_lap": {"car_index": 255, "lap_time": 0.0},
            "events": {"start_lights": 0, "session_status": "Unknown"},
            "forecast": [],
        }

    async def async_start(self):
        """Start UDP listener."""
        _LOGGER.debug(f"Starting UDP listener on port {self.port}")
        loop = asyncio.get_running_loop()
        try:
            self.transport, self.protocol = await loop.create_datagram_endpoint(
                lambda: F125Protocol(self.process_packet),
                local_addr=("0.0.0.0", self.port)
            )
        except Exception as e:
            _LOGGER.error(f"Failed to start UDP listener: {e}")

    @callback
    def async_stop(self):
        """Stop UDP listener."""
        if self.transport:
            self.transport.close()
            self.transport = None
        if self._forward_socket:
            self._forward_socket.close()
            self._forward_socket = None

    @callback
    def async_update_options(self):
        """Update options."""
        if self._forward_socket:
            self._forward_socket.close()
            self._forward_socket = None
        self._forward_dest = None

        forward_enabled = self.entry.options.get(CONF_FORWARD_ENABLED, self.entry.data.get(CONF_FORWARD_ENABLED, False))
        if forward_enabled:
            ip = self.entry.options.get(CONF_FORWARD_IP, self.entry.data.get(CONF_FORWARD_IP))
            port = self.entry.options.get(CONF_FORWARD_PORT, self.entry.data.get(CONF_FORWARD_PORT, DEFAULT_PORT))
            if ip and port:
                self._forward_dest = (ip, port)
                self._forward_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                _LOGGER.info(f"UDP Forwarding enabled to {ip}:{port}")

    @callback
    def process_packet(self, data: bytes):
        """Process incoming UDP packet."""
        if len(data) < PACKET_HEADER_SIZE:
            return

        header_fmt = "<HBBBBBQfIIBB"
        try:
            (
                packet_format, game_year, game_major_version, game_minor_version,
                packet_version, packet_id, session_uid, session_time,
                frame_identifier, overall_frame_identifier,
                player_car_index, secondary_player_car_index,
            ) = struct.unpack(header_fmt, data[:PACKET_HEADER_SIZE])
        except struct.error:
            return

        expected_size = PACKET_SIZES.get(packet_id)
        if expected_size and len(data) != expected_size:
            _LOGGER.debug(f"Packet size mismatch for ID {packet_id}: expected {expected_size}, got {len(data)}")
            return

        payload = data[PACKET_HEADER_SIZE:]

        if self._forward_socket and self._forward_dest:
            try:
                self._forward_socket.sendto(data, self._forward_dest)
            except Exception as e:
                _LOGGER.error(f"Failed to forward UDP packet: {e}")

        if packet_id == PACKET_ID_SESSION:
            self.parse_session_packet(payload)
        elif packet_id == PACKET_ID_LAP_DATA:
            self.parse_lap_data_packet(payload, player_car_index)
        elif packet_id == PACKET_ID_CAR_TELEMETRY:
            self.parse_car_telemetry_packet(payload, player_car_index)
        elif packet_id == PACKET_ID_CAR_STATUS:
            self.parse_car_status_packet(payload, player_car_index)
        elif packet_id == PACKET_ID_CAR_DAMAGE:
            self.parse_car_damage_packet(payload, player_car_index)
        elif packet_id == PACKET_ID_PARTICIPANTS:
            self.parse_participants_packet(payload)
        elif packet_id == PACKET_ID_EVENT:
            self.parse_event_packet(payload)

        if packet_id in RELEVANT_PACKETS:
            if packet_id in [PACKET_ID_CAR_TELEMETRY, PACKET_ID_LAP_DATA]:
                now = time.monotonic()
                if now - self._last_update < 0.1:
                    return
                self._last_update = now
            self.async_set_updated_data(self.data)

    def parse_session_packet(self, payload: bytes):
        """Parse session packet.

        Layout (packed, no padding):
          B  weather
          b  trackTemperature
          b  airTemperature
          B  totalLaps
          H  trackLength
          B  sessionType
          b  trackId
          B  formula
          H  sessionTimeLeft
          H  sessionDuration
          B  pitSpeedLimit
          B  gamePaused
          B  isSpectating
          B  spectatorCarIndex
          B  sliProNativeSupport
          B  numMarshalZones          <- byte 18, total so far = 19 bytes
          [21 * MarshalZone (5 bytes each) = 105 bytes]  offset 19..123
          B  safetyCarStatus          <- offset 124
          B  networkGame              <- offset 125
          B  numWeatherForecastSamples<- offset 126
          [up to 64 * WeatherForecastSample (8 bytes)]   offset 127+
          After all samples:
          B  forecastAccuracy
          B  aiDifficulty
          ...many more fields...
          B  numSafetyCarPeriods      (we need to find exact offset)
          B  numVirtualSafetyCarPeriods
          B  numRedFlagPeriods
        """
        try:
            fmt = "<BbbBHBbBHHBBBBBB"
            unpacked = struct.unpack(fmt, payload[:19])

            session_type_id = unpacked[5]
            session_status = self.data["events"].get("session_status", "Inactive")
            if session_type_id != 0 and unpacked[8] > 0:
                if session_status in ["Unknown", "Inactive"]:
                    session_status = "Active"
            elif session_status == "Active":
                session_status = "Ended"

            self.data["session"] = {
                "weather": unpacked[0],
                "track_temperature": unpacked[1],
                "air_temperature": unpacked[2],
                "total_laps": unpacked[3],
                "track_length": unpacked[4],
                "session_type": session_type_id,
                "track_id": unpacked[6],
                "session_time_left": unpacked[8],
                "pit_speed_limit": unpacked[10] if len(unpacked) > 10 else None,
                "safety_car_status": 0,
                "num_safety_car_periods": 0,
                "num_virtual_safety_car_periods": 0,
                "num_red_flag_periods": 0,
            }
            self.data["events"]["session_status"] = session_status

            # Safety car status at offset 124
            if len(payload) > 124:
                self.data["session"]["safety_car_status"] = payload[124]

            # Weather forecast samples
            if len(payload) > 126:
                num_samples = payload[126]
                samples = []
                for i in range(num_samples):
                    s_offset = 127 + (i * 8)
                    if s_offset + 8 <= len(payload):
                        rain_pct = payload[s_offset + 7]
                        time_offset = payload[s_offset + 1]
                        samples.append({"time": time_offset, "rain": rain_pct})
                self.data["forecast"] = samples

                # After forecast samples: forecastAccuracy(1) + aiDifficulty(1) +
                # seasonLink(4) + weekendLink(4) + sessionLink(4) +
                # pitStopWindowIdeal(1) + pitStopWindowLatest(1) + pitStopRejoin(1) +
                # steeringAssist(1) + brakingAssist(1) + gearboxAssist(1) +
                # pitAssist(1) + pitReleaseAssist(1) + ERSAssist(1) + DRSAssist(1) +
                # dynamicRacingLine(1) + dynamicRacingLineType(1) +
                # gameMode(1) + ruleSet(1) + timeOfDay(4) + sessionLength(1) +
                # speedUnitsLead(1) + tempUnitsLead(1) + speedUnitsSec(1) + tempUnitsSec(1) +
                # numSafetyCarPeriods(1) + numVirtualSafetyCarPeriods(1) + numRedFlagPeriods(1)
                #
                # Offset after samples = 127 + num_samples * 8
                after_samples = 127 + num_samples * 8
                # forecastAccuracy + aiDifficulty + 3 x uint32 + 3 x uint8 +
                # 8 x assist uint8 + 2 uint8 + 2 uint8 + uint32 + uint8 +
                # 4 uint8 = 2 + 12 + 3 + 8 + 2 + 2 + 4 + 1 + 4 = 38 bytes to numSafetyCarPeriods
                sc_offset = after_samples + 38
                if sc_offset + 3 <= len(payload):
                    self.data["session"]["num_safety_car_periods"] = payload[sc_offset]
                    self.data["session"]["num_virtual_safety_car_periods"] = payload[sc_offset + 1]
                    self.data["session"]["num_red_flag_periods"] = payload[sc_offset + 2]

        except struct.error:
            pass

    def parse_lap_data_packet(self, payload: bytes, player_index: int):
        """Parse lap data packet.

        LapData struct (57 bytes, packed):
          I  lastLapTimeInMS           offset 0
          I  currentLapTimeInMS        offset 4
          H  sector1TimeMSPart         offset 8
          B  sector1TimeMinutesPart    offset 10
          H  sector2TimeMSPart         offset 11
          B  sector2TimeMinutesPart    offset 13
          H  deltaToCarInFrontMSPart   offset 14
          B  deltaCarFrontMin          offset 16
          H  deltaToRaceLeaderMSPart   offset 17
          B  deltaRaceLeaderMin        offset 19
          f  lapDistance               offset 20
          f  totalDistance             offset 24
          f  safetyCarDelta            offset 28
          B  carPosition               offset 32
          B  currentLapNum             offset 33
          B  pitStatus                 offset 34
          B  numPitStops               offset 35
          B  sector                    offset 36
          B  currentLapInvalid         offset 37
          B  penalties                 offset 38
          B  totalWarnings             offset 39
          B  cornerCuttingWarnings     offset 40
          B  numUnservedDriveThroughPens offset 41
          B  numUnservedStopGoPens     offset 42
          B  gridPosition              offset 43
          B  driverStatus              offset 44
          B  resultStatus              offset 45
          B  pitLaneTimerActive        offset 46
          H  pitLaneTimeInLaneInMS     offset 47
          H  pitStopTimerInMS          offset 49
          B  pitStopShouldServePen     offset 51
          f  speedTrapFastestSpeed     offset 52
          B  speedTrapFastestLap       offset 56
        """
        struct_size = 57
        offset = player_index * struct_size
        if offset + struct_size > len(payload):
            return

        car_data = payload[offset: offset + struct_size]
        fmt = "<IIHBHBHBHBfffBBBBBBBBBBBBBBBHHBfB"
        try:
            u = struct.unpack(fmt, car_data)
            # u indices:
            # 0=lastLap, 1=currentLap, 2=s1MS, 3=s1Min, 4=s2MS, 5=s2Min,
            # 6=deltaFrontMS, 7=deltaFrontMin, 8=deltaLeaderMS, 9=deltaLeaderMin,
            # 10=lapDist, 11=totalDist, 12=scDelta,
            # 13=carPos, 14=lapNum, 15=pitStatus, 16=numPitStops, 17=sector,
            # 18=lapInvalid, 19=penalties, 20=totalWarnings, 21=ccWarnings,
            # 22=dtPens, 23=sgPens, 24=gridPos, 25=driverStatus, 26=resultStatus,
            # 27=pitLaneTimerActive, 28=pitLaneTimeMS, 29=pitStopTimerMS,
            # 30=pitServePen, 31=speedTrapSpeed, 32=speedTrapLap

            # Reconstruct delta times (minutes + ms parts)
            delta_front_ms = u[7] * 60000 + u[6]
            delta_leader_ms = u[9] * 60000 + u[8]

            self.data["lap_data"] = {
                "last_lap_time": u[0],
                "current_lap_time": u[1],
                "last_lap_str": self._format_lap_time(u[0]),
                "current_lap_str": self._format_lap_time(u[1]),
                "delta_to_car_in_front": round(delta_front_ms / 1000.0, 3),
                "delta_to_race_leader": round(delta_leader_ms / 1000.0, 3),
                "car_position": u[13],
                "current_lap_num": u[14],
                "pit_status": u[15],
                "pit_status_str": PIT_STATUS_MAP.get(u[15], "Unknown"),
                "num_pit_stops": u[16],
                "sector": u[17],
                "current_lap_invalid": u[18],
                "penalties": u[19],
                "total_warnings": u[20],
                "corner_cutting_warnings": u[21],
                "drive_through_pens": u[22],
                "stop_go_pens": u[23],
                "grid_position": u[24],
                "speed_trap_fastest_speed": round(u[31], 1),
            }

            # Find current leader
            for i in range(22):
                l_offset = i * struct_size
                if l_offset + 14 < len(payload):
                    pos = payload[l_offset + 32]
                    if pos == 1:
                        self.data["session"]["leader_index"] = i
                        break
        except struct.error:
            pass

    def parse_car_telemetry_packet(self, payload: bytes, player_index: int):
        """Parse car telemetry.

        CarTelemetryData struct (60 bytes, packed):
          H  speed                     offset 0
          f  throttle                  offset 2
          f  steer                     offset 6
          f  brake                     offset 10
          B  clutch                    offset 14
          b  gear                      offset 15
          H  engineRPM                 offset 16
          B  drs                       offset 18
          B  revLightsPercent          offset 19
          H  revLightsBitValue         offset 20
          H[4] brakesTemperature       offset 22  (8 bytes)
          B[4] tyresSurfaceTemperature offset 30  (4 bytes)
          B[4] tyresInnerTemperature   offset 34  (4 bytes)
          H  engineTemperature         offset 38
          f[4] tyresPressure           offset 40  (16 bytes)
          B[4] surfaceType             offset 56  (4 bytes)
        Total = 60 bytes
        """
        struct_size = 60
        offset = player_index * struct_size
        if offset + struct_size > len(payload):
            return

        car_data = payload[offset: offset + struct_size]
        try:
            speed     = struct.unpack_from("<H", car_data, 0)[0]
            throttle  = struct.unpack_from("<f", car_data, 2)[0]
            steer     = struct.unpack_from("<f", car_data, 6)[0]
            brake     = struct.unpack_from("<f", car_data, 10)[0]
            gear      = struct.unpack_from("<b", car_data, 15)[0]
            rpm       = struct.unpack_from("<H", car_data, 16)[0]
            drs       = struct.unpack_from("<B", car_data, 18)[0]
            rev_pct   = struct.unpack_from("<B", car_data, 19)[0]

            brake_temps  = list(struct.unpack_from("<HHHH", car_data, 22))
            surf_temps   = list(struct.unpack_from("<BBBB", car_data, 30))
            inner_temps  = list(struct.unpack_from("<BBBB", car_data, 34))
            engine_temp  = struct.unpack_from("<H", car_data, 38)[0]
            tyre_press   = list(struct.unpack_from("<ffff", car_data, 40))

            # Suggested gear is in PacketCarTelemetryData AFTER all 22 cars
            # Offset = 22 * 60 + 1 (mfdPanelIndex) + 1 (mfdPanelIndexSecondaryPlayer) = 1322
            # then int8 suggestedGear
            suggested_gear = None
            sg_offset = 22 * 60 + 2
            if sg_offset + 1 <= len(payload):
                suggested_gear = struct.unpack_from("<b", payload, sg_offset)[0]

            self.data["car_telemetry"] = {
                "speed": speed,
                "throttle": throttle,
                "steer": steer,
                "brake": brake,
                "gear": gear,
                "engine_rpm": rpm,
                "drs": drs,
                "rev_lights_percent": rev_pct,
                "brake_temps": brake_temps,
                "tyre_surface_temp": surf_temps,
                "tyre_inner_temp": inner_temps,
                "engine_temp": engine_temp,
                "tyre_pressure": [round(p, 1) for p in tyre_press],
                "suggested_gear": suggested_gear,
            }
        except struct.error:
            pass

    def parse_car_status_packet(self, payload: bytes, player_index: int):
        """Parse car status.

        CarStatusData struct (55 bytes, packed):
          B  tractionControl           offset 0
          B  antiLockBrakes            offset 1
          B  fuelMix                   offset 2
          B  frontBrakeBias            offset 3
          B  pitLimiterStatus          offset 4
          f  fuelInTank                offset 5
          f  fuelCapacity              offset 9
          f  fuelRemainingLaps         offset 13
          H  maxRPM                    offset 17
          H  idleRPM                   offset 19
          B  maxGears                  offset 21
          B  drsAllowed                offset 22
          H  drsActivationDistance     offset 23
          B  actualTyreCompound        offset 25
          B  visualTyreCompound        offset 26
          B  tyresAgeLaps              offset 27
          b  vehicleFiaFlags           offset 28
          f  enginePowerICE            offset 29
          f  enginePowerMGUK           offset 33
          f  ersStoreEnergy            offset 37
          B  ersDeployMode             offset 41
          f  ersHarvestedThisLapMGUK   offset 42
          f  ersHarvestedThisLapMGUH   offset 46
          f  ersDeployedThisLap        offset 50
          B  networkPaused             offset 54
        Total = 55 bytes
        """
        struct_size = 55
        offset = player_index * struct_size
        if offset + struct_size > len(payload):
            return

        car_data = payload[offset: offset + struct_size]
        try:
            tc           = struct.unpack_from("<B", car_data, 0)[0]
            abs_         = struct.unpack_from("<B", car_data, 1)[0]
            fuel_mix     = struct.unpack_from("<B", car_data, 2)[0]
            pit_lim      = struct.unpack_from("<B", car_data, 4)[0]
            fuel_in_tank = struct.unpack_from("<f", car_data, 5)[0]
            fuel_cap     = struct.unpack_from("<f", car_data, 9)[0]
            fuel_rem     = struct.unpack_from("<f", car_data, 13)[0]
            max_rpm      = struct.unpack_from("<H", car_data, 17)[0]
            drs_allowed  = struct.unpack_from("<B", car_data, 22)[0]
            drs_dist     = struct.unpack_from("<H", car_data, 23)[0]
            actual_tyre  = struct.unpack_from("<B", car_data, 25)[0]
            visual_tyre  = struct.unpack_from("<B", car_data, 26)[0]
            tyre_age     = struct.unpack_from("<B", car_data, 27)[0]
            fia_flags    = struct.unpack_from("<b", car_data, 28)[0]
            eng_ice      = struct.unpack_from("<f", car_data, 29)[0]
            eng_mguk     = struct.unpack_from("<f", car_data, 33)[0]
            ers_store    = struct.unpack_from("<f", car_data, 37)[0]
            ers_mode     = struct.unpack_from("<B", car_data, 41)[0]
            ers_harv_k   = struct.unpack_from("<f", car_data, 42)[0]
            ers_harv_h   = struct.unpack_from("<f", car_data, 46)[0]
            ers_deployed = struct.unpack_from("<f", car_data, 50)[0]

            self.data["car_status"] = {
                "traction_control": tc,
                "anti_lock_brakes": abs_,
                "fuel_mix": fuel_mix,
                "fuel_mix_str": FUEL_MIX_MAP.get(fuel_mix, "Unknown"),
                "pit_limiter_status": pit_lim,
                "fuel_in_tank": round(fuel_in_tank, 3),
                "fuel_capacity": round(fuel_cap, 3),
                "fuel_remaining_laps": fuel_rem,
                "max_rpm": max_rpm,
                "drs_allowed": drs_allowed,
                "drs_activation_distance": drs_dist,
                "actual_tyre_compound": actual_tyre,
                "tyre_visual": visual_tyre,
                "tyre_age": tyre_age,
                "fia_flags": fia_flags,
                "engine_power_ice": round(eng_ice, 1),
                "engine_power_mguk": round(eng_mguk, 1),
                "ers_store": ers_store,
                "ers_deploy_mode": ers_mode,
                "ers_harvested_mguk": round(ers_harv_k, 1),
                "ers_harvested_mguh": round(ers_harv_h, 1),
                "ers_deployed_this_lap": round(ers_deployed, 1),
            }
        except struct.error:
            pass

    def parse_car_damage_packet(self, payload: bytes, player_index: int):
        """Parse car damage.

        CarDamageData struct (46 bytes, packed):
          f[4] tyresWear               offset 0   (16 bytes)
          B[4] tyresDamage             offset 16  (4 bytes)
          B[4] brakesDamage            offset 20  (4 bytes)
          B[4] tyreBlisters            offset 24  (4 bytes)  -- NEW in F1 25
          B  frontLeftWingDamage       offset 28
          B  frontRightWingDamage      offset 29
          B  rearWingDamage            offset 30
          B  floorDamage               offset 31
          B  diffuserDamage            offset 32
          B  sidepodDamage             offset 33
          B  drsFault                  offset 34
          B  ersFault                  offset 35
          B  gearBoxDamage             offset 36
          B  engineDamage              offset 37
          B  engineMGUHWear            offset 38
          B  engineESWear              offset 39
          B  engineCEWear              offset 40
          B  engineICEWear             offset 41
          B  engineMGUKWear            offset 42
          B  engineTCWear              offset 43
          B  engineBlown               offset 44
          B  engineSeized              offset 45
        Total = 46 bytes
        """
        struct_size = 46
        offset = player_index * struct_size
        if offset + struct_size > len(payload):
            return

        car_data = payload[offset: offset + struct_size]
        try:
            tyres_wear   = list(struct.unpack_from("<ffff", car_data, 0))
            tyres_damage = list(struct.unpack_from("<BBBB", car_data, 16))
            brakes_dmg   = list(struct.unpack_from("<BBBB", car_data, 20))
            blisters     = list(struct.unpack_from("<BBBB", car_data, 24))

            terminal = self.data["car_damage"].get("terminal", 0)

            self.data["car_damage"] = {
                "tyres_wear": tyres_wear,
                "tyres_damage": tyres_damage,
                "brakes_damage": brakes_dmg,
                "tyre_blisters": blisters,
                "front_left_wing": car_data[28],
                "front_right_wing": car_data[29],
                "rear_wing": car_data[30],
                "floor": car_data[31],
                "diffuser": car_data[32],
                "sidepod": car_data[33],
                "drs_fault": car_data[34],
                "ers_fault": car_data[35],
                "gearbox_damage": car_data[36],
                "engine_damage": car_data[37],
                "engine_mguh_wear": car_data[38],
                "engine_es_wear": car_data[39],
                "engine_ce_wear": car_data[40],
                "engine_ice_wear": car_data[41],
                "engine_mguk_wear": car_data[42],
                "engine_tc_wear": car_data[43],
                "engine_blown": car_data[44],
                "engine_seized": car_data[45],
                "terminal": terminal,
            }
            has_damage = any([
                any(tyres_damage), any(brakes_dmg),
                car_data[28], car_data[29], car_data[30],
                car_data[31], car_data[32], car_data[33],
                car_data[36], car_data[37],
            ])
            self.data["car_damage"]["has_damage"] = 1 if has_damage else 0
        except struct.error:
            pass

    def parse_event_packet(self, payload: bytes):
        """Parse event packet."""
        try:
            event_code = payload[:4].decode("ascii")
            if event_code == "STLG":
                self.data["events"]["start_lights"] = payload[4]
            elif event_code == "LGOT":
                self.data["events"]["start_lights"] = 0
            elif event_code == "SSTA":
                self.data["events"]["session_status"] = "Started"
            elif event_code == "SEND":
                self.data["events"]["session_status"] = "Ended"
            elif event_code == "CHQF":
                self.data["events"]["session_status"] = "Chequered Flag"
            elif event_code == "RDFL":
                self.data["events"]["session_status"] = "Red Flag"
            elif event_code == "FTLP":
                veh_idx = payload[4]
                lap_time = struct.unpack_from("<f", payload, 5)[0]
                self.data["fastest_lap"] = {"car_index": veh_idx, "lap_time": lap_time}
            elif event_code == "RTMT":
                veh_idx = payload[4]
                reason = payload[5]
                if reason == 3:
                    self.data["car_damage"]["terminal"] = 1
        except (struct.error, UnicodeDecodeError):
            pass

    def parse_participants_packet(self, payload: bytes):
        """Parse participants.

        ParticipantData struct (57 bytes in F1 25):
          B  aiControlled   offset 0
          B  driverId       offset 1
          B  networkId      offset 2
          B  teamId         offset 3
          B  myTeam         offset 4
          B  raceNumber     offset 5
          B  nationality    offset 6
          char[32] name     offset 7   (32 bytes)
          B  yourTelemetry  offset 39
          B  showOnlineNames offset 40
          H  techLevel      offset 41
          B  platform       offset 43
          B  numColours     offset 44
          LiveryColour[4]   offset 45  (12 bytes: 3 bytes each)
        Total = 57 bytes
        """
        try:
            num_cars = payload[0]
            for i in range(num_cars):
                offset = 1 + (i * 57)
                if offset + 57 <= len(payload):
                    name_bytes = payload[offset + 7: offset + 7 + 32]
                    try:
                        name = name_bytes.split(b'\x00')[0].decode("utf-8")
                        self.data["participants"][i] = name
                    except UnicodeDecodeError:
                        pass
        except struct.error:
            pass

    def _format_lap_time(self, lap_time_ms: int) -> str:
        """Format lap time from ms to m:ss.mmm string."""
        if lap_time_ms <= 0:
            return "0:00.000"
        seconds = (lap_time_ms / 1000.0) % 60
        minutes = int((lap_time_ms / (1000.0 * 60)) % 60)
        return f"{minutes}:{seconds:06.3f}"


class F125Protocol(asyncio.DatagramProtocol):
    """UDP Protocol handler for F1 25."""

    def __init__(self, callback_func):
        self.callback = callback_func

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, addr):
        self.callback(data)
