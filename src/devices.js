function clampByte(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(255, Math.round(x)));
}

function rgbToInt(r, g, b) {
  r = clampByte(r);
  g = clampByte(g);
  b = clampByte(b);
  return (r << 16) | (g << 8) | b; // 0..16777215
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
