# E-Ink HASS Frame

This add-on packages the configurator and firmware build pipeline for the
M5PaperS3 e-ink dashboard project in this repository.

## What it does

- Runs the Next.js dashboard inside Home Assistant via ingress
- Lets the dashboard browse Home Assistant entities through the Supervisor proxy
- Builds firmware with PlatformIO inside the add-on container
- Stores generated firmware artifacts under `/data/eink-hass-frame`

## Install locally

1. Copy or clone this repository into a subfolder of `/addons`, for example
   `/addons/eink-hass-frame`.
2. Restart Home Assistant or reload the local add-on repository.
3. Open the Add-on Store and install `E-Ink HASS Frame`.

The add-on manifest points at the published image
`ghcr.io/holnburger/{arch}-eink-hass-frame-addon`, so Home Assistant pulls the
image tag that matches the add-on `version` instead of rebuilding the container
locally each time.

If your Home Assistant host should pull the image without registry credentials,
make the GHCR package public after the first publish.

## Options

Required options:

- `device_home_assistant_url`
  LAN URL, hostname, or IP that the device can reach directly, for example
  `http://homeassistant.local:8123` or `192.168.1.20`
- `device_home_assistant_token`
  Long-lived access token embedded into firmware for device-side API access

## Notes

- Inside the dashboard, entity search and preview use the add-on's internal
  Home Assistant connection automatically.
- The required `device_*` settings are only used for firmware builds, because
  the device itself cannot use the Supervisor proxy.
- In add-on mode, set a LAN-reachable Home Assistant address for the device in
  the add-on configuration. Use a local hostname or IP rather than a public
  domain if the display cannot reliably resolve or reach the external address.
- Wi-Fi is provisioned during the USB flashing flow and then stored on the
  device, so the add-on does not need Wi-Fi settings.
- Firmware builds fail validation if the required device Home Assistant
  settings are missing.
- Port `8099` is disabled by default. You can enable it if you want to open the
  UI directly instead of through ingress.
- This add-on currently targets `amd64` and `aarch64`.
- If you want to force a local source build while debugging, temporarily remove
  the `image:` entry from `config.yaml`.
