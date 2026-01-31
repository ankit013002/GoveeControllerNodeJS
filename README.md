# Govee Node.js Controller

A personal Node.js CLI tool to control Govee smart lighting using an official Govee API key.

This project supports **both**:

- **Legacy Developer API** (`https://developer-api.govee.com/v1`)
- **New OpenAPI Router** (`https://openapi.api.govee.com/router/api/v1`)

It automatically checks both APIs, merges the results, and gives you a single normalized device list to control.

---

## Features

- List devices on your Govee account (Legacy + OpenAPI)
- Turn devices **on/off**
- Set **brightness** (1–100)
- Set **RGB color** (0–255 per channel)
- Set **color temperature (Kelvin)** when supported
- **Sunrise mode** (5-minute warm sunrise ramp)
  - Starts **orange/amber** using RGB (when supported)
  - Transitions into **Kelvin sunlight** as brightness increases

- CLI interface with optional device index selection

---

## Requirements

- **Node.js 18+** (uses native `fetch`)
- A **Govee Developer API key**
- Govee device connected to the same account as the key (Wi‑Fi devices show up reliably)

---

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   GOVEE_API_KEY=your_api_key_here
   ```

3. Confirm your setup by listing devices:

   ```bash
   npm start list
   ```

---

## CLI Usage

```bash
npm start list
npm start on [index]
npm start off [index]
npm start brightness <1-100> [index]
npm start color <r> <g> <b> [index]
npm start sunrise [index]
```

### Examples

List devices:

```bash
npm start list
```

Turn on the first device (defaults to index `0`):

```bash
npm start on
```

Turn off device `0` explicitly:

```bash
npm start off 0
```

Set brightness to `35` for device `0`:

```bash
npm start brightness 35
# or
npm start brightness 35 0
```

Set RGB color to a warm orange for device `0`:

```bash
npm start color 255 120 10
# or explicitly
npm start color 255 120 10 0
```

Run sunrise mode on device `0`:

```bash
npm start sunrise
# or explicitly
npm start sunrise 0
```

---

## Sunrise Mode Details

`npm start sunrise` runs a **5-minute sunrise** with smooth transitions:

- Brightness ramps up on a smooth curve (starts dim, ends bright).
- Color begins **more sunrise-like (yellow/orange)**:
  - The first ~35% uses an RGB amber tone (if the device supports `colorRgb`).

- Then it transitions to **Kelvin “sunlight”**:
  - Uses `colorTemperatureK` when available (OpenAPI devices commonly support 2000–9000K).
  - Ends around **~5200K** to feel like warm morning daylight (not harsh office light).

If your device does not support color temperature, the code will fall back to approximating Kelvin using RGB.

---

## Device Index Rules

This CLI defaults to device index **0** unless you explicitly provide an index.

For commands that require arguments:

- `brightness` requires **1** argument
- `color` requires **3** arguments

An index is only treated as an index if it is an **extra trailing argument** beyond what the command requires.

Examples:

- `npm start color 0 0 255` → uses device **0**
- `npm start color 0 0 255 1` → uses device **1**
- `npm start brightness 20` → uses device **0**
- `npm start brightness 20 2` → uses device **2**

---

## Project Structure

```text
src/
  goveeClient.js   # HTTP client + Legacy/OpenAPI device discovery + control methods
  devices.js       # High-level helpers (on/off/brightness/color/temp) for both protocols
  index.js         # CLI entry point (argument parsing + device selection + sunrise mode)
```

---

## How It Works

### Device Discovery

When you run `npm start list`, the tool:

1. Requests devices from the **Legacy API** (`/v1/devices`)
2. Requests devices from the **OpenAPI Router** (`/user/devices`)
3. Normalizes and merges results
4. Prints a unified list with indexes you can use in commands

### Controlling Devices

The helpers in `src/devices.js` automatically send the correct payload format depending on whether the device is:

- `protocol: "legacy"` (uses `PUT /v1/devices/control`)
- `protocol: "openapi"` (uses `POST /router/api/v1/device/control`)

The CLI (`src/index.js`) chooses which control path to use based on the device’s protocol and capabilities.

---

## Notes / Limitations

- **Non-commercial use only** (per Govee developer program terms).
- Some capabilities are device-specific and only appear if the device reports them (especially on OpenAPI).
- The APIs generally support core lighting controls:
  - on/off, brightness, RGB, and sometimes color temperature

- Some devices only appear through the **OpenAPI** endpoint — this project supports that automatically.

---

## Security

- Treat your API key like a password.
- Do **not** commit `.env` files.
- Rotate your key immediately if it is ever shared or exposed.

---

## Troubleshooting

### `Found devices: []`

Common causes:

- The device is not connected to Wi‑Fi (Bluetooth-only devices may not appear)
- You are logged into a different Govee account than the one tied to your API key
- Temporary API/account sync issue (try again after reopening the Govee app)

### `Device index X not found`

Run:

```bash
npm start list
```

Then use an index shown in the output:

```bash
npm start on 0
```

### `429 Too Many Requests`

You’re hitting Govee API rate limits.

- Try again after a short pause.
- Avoid spamming rapid repeated commands.
- Sunrise mode is designed to use spaced-out steps to reduce request rate.

---

## Roadmap Ideas (Optional)

- Add flags like `--device <index>` and `--duration <minutes>` for sunrise
- Add `sunset` mode (reverse sunrise)
- Add blink/pulse effects
- Build a small Express server (`/lamp/on`, `/lamp/color`, `/lamp/sunrise`)
- Add a “capabilities” command to print a device’s supported controls
