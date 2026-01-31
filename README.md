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

Set RGB color to blue for device `0`:

```bash
npm start color 0 0 255
# or explicitly
npm start color 0 0 255 0
```

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
  devices.js       # High-level helpers (on/off/brightness/color) for both protocols
  index.js         # CLI entry point (argument parsing + device selection)
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

---

## Notes / Limitations

- **Non-commercial use only** (per Govee developer program terms).
- Official APIs generally support core lighting controls:
  - on/off, brightness, RGB color

- **Speaker/audio controls and app-only music modes are not available** via these APIs.
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

---

## Roadmap Ideas (Optional)

- Add `--device <index>` style flags
- Add color temperature support
- Add blink/pulse effects
- Build a small Express server (`/lamp/on`, `/lamp/color`)
- Integrate with PC events (build status, notifications, etc.)
