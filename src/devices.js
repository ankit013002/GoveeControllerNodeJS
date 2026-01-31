function clampByte(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(255, Math.round(x)));
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.round(x)));
}

function rgbToInt(r, g, b) {
  r = clampByte(r);
  g = clampByte(g);
  b = clampByte(b);
  return (r << 16) | (g << 8) | b; // 0..16777215
}

function getOpenApiRange(d, instance, fallbackMin, fallbackMax) {
  const cap = Array.isArray(d.capabilities)
    ? d.capabilities.find(
        (c) => c?.instance === instance && c?.parameters?.range,
      )
    : null;

  const min = cap?.parameters?.range?.min ?? fallbackMin;
  const max = cap?.parameters?.range?.max ?? fallbackMax;
  return { min, max };
}

export function supportsColorTemperature(d) {
  if (!d) return false;
  if (d.protocol === "legacy") {
    return Array.isArray(d.supportCmds) && d.supportCmds.includes("colorTem");
  }
  return (
    Array.isArray(d.capabilities) &&
    d.capabilities.some((c) => c?.instance === "colorTemperatureK")
  );
}

export function supportsRgb(d) {
  if (!d) return false;
  if (d.protocol === "legacy") {
    return Array.isArray(d.supportCmds) && d.supportCmds.includes("color");
  }
  return (
    Array.isArray(d.capabilities) &&
    d.capabilities.some((c) => c?.instance === "colorRgb")
  );
}

/**
 * Kelvin -> RGB approximation (only used as fallback).
 */
export function kelvinToRgb(kelvin) {
  let k = Number(kelvin);
  if (!Number.isFinite(k)) k = 3000;
  k = Math.max(1000, Math.min(40000, k));

  const temp = k / 100;

  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
  };
}

export async function turnOn(client, d) {
  if (d.protocol === "legacy") {
    return client.controlLegacy(d.device, d.model, {
      name: "turn",
      value: "on",
    });
  }
  return client.controlOpenApi({
    sku: d.sku,
    device: d.device,
    capability: {
      type: "devices.capabilities.on_off",
      instance: "powerSwitch",
      value: 1,
    },
  });
}

export async function turnOff(client, d) {
  if (d.protocol === "legacy") {
    return client.controlLegacy(d.device, d.model, {
      name: "turn",
      value: "off",
    });
  }
  return client.controlOpenApi({
    sku: d.sku,
    device: d.device,
    capability: {
      type: "devices.capabilities.on_off",
      instance: "powerSwitch",
      value: 0,
    },
  });
}

export async function setBrightness(client, d, brightness) {
  const value = Math.max(1, Math.min(100, Math.round(brightness)));
  if (d.protocol === "legacy") {
    return client.controlLegacy(d.device, d.model, {
      name: "brightness",
      value,
    });
  }
  return client.controlOpenApi({
    sku: d.sku,
    device: d.device,
    capability: {
      type: "devices.capabilities.range",
      instance: "brightness",
      value,
    },
  });
}

export async function setColor(client, d, r, g, b) {
  if (d.protocol === "legacy") {
    return client.controlLegacy(d.device, d.model, {
      name: "color",
      value: { r, g, b },
    });
  }
  return client.controlOpenApi({
    sku: d.sku,
    device: d.device,
    capability: {
      type: "devices.capabilities.color_setting",
      instance: "colorRgb",
      value: rgbToInt(r, g, b),
    },
  });
}

export async function setColorTemperature(client, d, kelvin) {
  if (d.protocol === "legacy") {
    const min = d?.properties?.colorTem?.range?.min ?? 2000;
    const max = d?.properties?.colorTem?.range?.max ?? 9000;
    const value = clampInt(kelvin, min, max);

    return client.controlLegacy(d.device, d.model, {
      name: "colorTem",
      value,
    });
  }

  const { min, max } = getOpenApiRange(d, "colorTemperatureK", 2000, 9000);
  const value = clampInt(kelvin, min, max);

  return client.controlOpenApi({
    sku: d.sku,
    device: d.device,
    capability: {
      type: "devices.capabilities.color_setting",
      instance: "colorTemperatureK",
      value,
    },
  });
}
