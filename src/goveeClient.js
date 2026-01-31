import { randomUUID } from "crypto";

const LEGACY_BASE = "https://developer-api.govee.com/v1";
const OPENAPI_BASE = "https://openapi.api.govee.com/router/api/v1";

export class GoveeClient {
  constructor(apiKey) {
    if (!apiKey) throw new Error("Missing GOVEE_API_KEY in .env");
    this.apiKey = apiKey;
  }

  async request(url, method = "GET", body) {
    const res = await fetch(url, {
      method,
      headers: {
        "Govee-API-Key": this.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.msg || `HTTP ${res.status}`);
    }
    return data;
  }

  // ---------- Legacy API ----------
  async getDevicesLegacy() {
    const data = await this.request(`${LEGACY_BASE}/devices`);
    const list = data?.data?.devices ?? [];
    return list.map((d) => ({
      protocol: "legacy",
      device: d.device,
      model: d.model,
      name: d.deviceName ?? null,
      supportCmds: d.supportCmds ?? [],
      // include properties so we can read colorTem min/max when present
      properties: d.properties ?? null,
    }));
  }

  async controlLegacy(device, model, cmd) {
    return this.request(`${LEGACY_BASE}/devices/control`, "PUT", {
      device,
      model,
      cmd,
    });
  }

  // ---------- New OpenAPI ----------
  async getDevicesOpenApi() {
    const data = await this.request(`${OPENAPI_BASE}/user/devices`);
    const list =
      data?.data ??
      data?.payload?.devices ??
      data?.payload ??
      (Array.isArray(data) ? data : []);

    if (!Array.isArray(list)) return [];

    return list.map((d) => ({
      protocol: "openapi",
      device: d.device,
      sku: d.sku,
      name: d.deviceName ?? null,
      capabilities: d.capabilities ?? [],
    }));
  }

  async controlOpenApi({ sku, device, capability }) {
    return this.request(`${OPENAPI_BASE}/device/control`, "POST", {
      requestId: randomUUID(),
      payload: { sku, device, capability },
    });
  }

  // ---------- Convenience ----------
  async getDevicesAny() {
    const [legacy, openapi] = await Promise.allSettled([
      this.getDevicesLegacy(),
      this.getDevicesOpenApi(),
    ]);

    const a = legacy.status === "fulfilled" ? legacy.value : [];
    const b = openapi.status === "fulfilled" ? openapi.value : [];

    const seen = new Set();
    const all = [...a, ...b].filter((d) => {
      const key = `${d.protocol}:${d.device}:${d.model ?? d.sku ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return all;
  }
}
