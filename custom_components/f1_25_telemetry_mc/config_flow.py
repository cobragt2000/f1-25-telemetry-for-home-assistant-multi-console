"""Config flow for F1 25 Telemetry integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.exceptions import HomeAssistantError

from .const import (
    DOMAIN,
    DEFAULT_PORT,
    CONF_PORT,
    CONF_FORWARD_ENABLED,
    CONF_FORWARD_IP,
    CONF_FORWARD_PORT,
)

_LOGGER = logging.getLogger(__name__)


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for F1 25 Telemetry."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            port = user_input[CONF_PORT]

            # Check if this port is already used by another config entry
            for entry in self._async_current_entries():
                existing_port = entry.options.get(CONF_PORT, entry.data.get(CONF_PORT))
                if existing_port == port:
                    errors[CONF_PORT] = "port_in_use"
                    break

            if not errors:
                return self.async_create_entry(
                    title=f"F1 25 Telemetry (Port {port})",
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
                    vol.Optional(CONF_FORWARD_ENABLED, default=False): bool,
                    vol.Optional(CONF_FORWARD_IP, default=""): str,
                    vol.Optional(CONF_FORWARD_PORT, default=DEFAULT_PORT): int,
                }
            ),
            errors=errors,
        )

    @staticmethod
    @config_entries.callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> OptionsFlowHandler:
        """Get the options flow for this handler."""
        return OptionsFlowHandler()


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for F1 25 Telemetry."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        errors: dict[str, str] = {}

        if user_input is not None:
            new_port = user_input[CONF_PORT]

            # Check for port conflicts with OTHER entries (not this one)
            for entry in self.hass.config_entries.async_entries(DOMAIN):
                if entry.entry_id == self.config_entry.entry_id:
                    continue
                existing_port = entry.options.get(CONF_PORT, entry.data.get(CONF_PORT))
                if existing_port == new_port:
                    errors[CONF_PORT] = "port_in_use"
                    break

            if not errors:
                return self.async_create_entry(title="", data=user_input)

        current_port = self.config_entry.options.get(
            CONF_PORT, self.config_entry.data.get(CONF_PORT, DEFAULT_PORT)
        )
        current_forward_enabled = self.config_entry.options.get(
            CONF_FORWARD_ENABLED, self.config_entry.data.get(CONF_FORWARD_ENABLED, False)
        )
        current_forward_ip = self.config_entry.options.get(
            CONF_FORWARD_IP, self.config_entry.data.get(CONF_FORWARD_IP, "")
        )
        current_forward_port = self.config_entry.options.get(
            CONF_FORWARD_PORT, self.config_entry.data.get(CONF_FORWARD_PORT, DEFAULT_PORT)
        )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_PORT, default=current_port): int,
                    vol.Optional(CONF_FORWARD_ENABLED, default=current_forward_enabled): bool,
                    vol.Optional(CONF_FORWARD_IP, default=current_forward_ip): str,
                    vol.Optional(CONF_FORWARD_PORT, default=current_forward_port): int,
                }
            ),
            errors=errors,
        )
