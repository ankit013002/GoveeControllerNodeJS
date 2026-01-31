import "dotenv/config";
import { GoveeClient } from "./goveeClient.js";
import {
  turnOn,
  turnOff,
  setBrightness,
  setColor,
  setColorTemperature,
  supportsColorTemperature,
  supportsRgb,
  kelvinToRgb,
} from "./devices.js";

const client = new GoveeClient(process.env.GOVEE_API_KEY);

function usage() {
  console.log(`
Usage:
  npm start list
  npm start on [index]
  npm start off [index]
  npm start brightness <1-100> [index]
  npm start color <r> <g> <b> [index]
  npm start sunrise [index]

Examples:
  npm start list
  npm start on 0
  npm start brightness 35 0
  npm start color 255 120 10 0
  npm start sunrise 0
`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Makes sunrise feel more "yellow/orange":
 * - First ~35%: force a warm amber using RGB (if supported)
 * - Then transition into Kelvin "sunlight" as brightness increases
 */
async function setSunriseColor(client, d, t, kelvin) {
  const hasTemp = supportsColorTemperature(d);
  const hasRgb = supportsRgb(d);

  const ORANGE_PHASE = 0.35;

  if (hasRgb && t <= ORANGE_PHASE) {
    const u = t / ORANGE_PHASE; // 0..1

    // Deep amber -> golden sunrise (tuned to look more orange early)
    const r = 255;
    const g = Math.round(60 + 150 * u); // 60 -> 210
    const b = Math.round(0 + 20 * u); // 0  -> 20

    return setColor(client, d, r, g, b);
  }

  // After orange phase: prefer Kelvin if available
  if (hasTemp) {
    return setColorTemperature(client, d, kelvin);
  }

  // Fallback: approximate Kelvin via RGB
  const { r, g, b } = kelvinToRgb(kelvin);
  return setColor(client, d, r, g, b);
}

async function sunriseMode(client, d) {
  // 5 minutes total. 15s steps + 2 requests/step (color + brightness)
  // => ~8.4 requests/min, below the common device-control limit.
  const DURATION_MS = 5 * 60 * 1000;
  const STEP_MS = 15 * 1000;
  const steps = Math.floor(DURATION_MS / STEP_MS) + 1;

  // Your OpenAPI docs show colorTemperatureK range 2000..9000.
  // We'll end slightly warm so it feels like "morning sun" not harsh office light.
  const START_K = 2000;
  const END_K = 5200;

  const MIN_BRI = 1;
  const MAX_BRI = 100;

  console.log(
    `Starting sunrise on ${d.name ?? "(unnamed)"} | sku=${d.sku ?? d.model} | device=${d.device}`,
  );
  console.log(
    `Duration: 5 minutes | Steps: ${steps} | Step interval: ${STEP_MS / 1000}s`,
  );

  await turnOn(client, d);

  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1);

    // Brightness: smooth S-curve
    const e = easeInOutCubic(t);

    // Kelvin: stay warmer longer, then shift faster near the end
    const kelvinT = Math.pow(t, 1.7);
    const kelvin = START_K + (END_K - START_K) * kelvinT;

    const bri = MIN_BRI + (MAX_BRI - MIN_BRI) * e;

    // Color first, then brightness
    await setSunriseColor(client, d, t, kelvin);
    await sleep(150);
    await setBrightness(client, d, bri);

    const pct = Math.round(t * 100);
    console.log(
      `Sunrise ${pct}% | ~${Math.round(kelvin)}K | ${Math.round(bri)}%`,
    );

    if (i < steps - 1) await sleep(STEP_MS);
  }

  console.log("Sunrise complete.");
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  const devices = await client.getDevicesAny();

  if (!cmd || cmd === "help" || cmd === "-h") {
    usage();
    return;
  }

  if (cmd === "list") {
    console.log("Found devices:");
    devices.forEach((d, i) => {
      console.log(
        `[${i}] ${d.name ?? "(no name)"} | ${d.protocol} | device=${d.device} | model/sku=${d.model ?? d.sku}`,
      );
    });
    return;
  }

  if (devices.length === 0) {
    console.log("No devices returned. Run: npm start list");
    return;
  }

  const requiredArgsCount = (() => {
    switch (cmd) {
      case "on":
      case "off":
      case "sunrise":
        return 0;
      case "brightness":
        return 1;
      case "color":
        return 3;
      default:
        return 0;
    }
  })();

  const hasExplicitIndex = args.length > requiredArgsCount;
  const index = hasExplicitIndex ? Number(args[args.length - 1]) : 0;

  if (!Number.isInteger(index) || index < 0) {
    console.log("Invalid device index. Run: npm start list");
    return;
  }

  const d = devices[index];

  if (!d) {
    console.log(`Device index ${index} not found. Run: npm start list`);
    return;
  }

  switch (cmd) {
    case "on":
      await turnOn(client, d);
      console.log("OK: on");
      break;

    case "off":
      await turnOff(client, d);
      console.log("OK: off");
      break;

    case "brightness": {
      const value = Number(args[0]);
      if (!Number.isFinite(value)) return usage();
      await setBrightness(client, d, value);
      console.log(`OK: brightness ${value}`);
      break;
    }

    case "color": {
      const r = Number(args[0]);
      const g = Number(args[1]);
      const b = Number(args[2]);
      if (![r, g, b].every(Number.isFinite)) return usage();
      await setColor(client, d, r, g, b);
      console.log(`OK: color rgb(${r},${g},${b})`);
      break;
    }

    case "sunrise":
      await sunriseMode(client, d);
      break;

    default:
      usage();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exitCode = 1;
});
