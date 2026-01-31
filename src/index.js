import "dotenv/config";
import { GoveeClient } from "./goveeClient.js";
import { turnOn, turnOff, setBrightness, setColor } from "./devices.js";

const client = new GoveeClient(process.env.GOVEE_API_KEY);

function usage() {
  console.log(`
Usage:
  npm start list
  npm start on [index]
  npm start off [index]
  npm start brightness <1-100> [index]
  npm start color <r> <g> <b> [index]

Examples:
  npm start list
  npm start on 0
  npm start brightness 35 0
  npm start color 0 128 255 0
`);
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

  // default to device 0 unless index provided (only if args include an extra trailing number)
  const requiredArgsCount = (() => {
    switch (cmd) {
      case "on":
      case "off":
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

    default:
      usage();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exitCode = 1;
});
