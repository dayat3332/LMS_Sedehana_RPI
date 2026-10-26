import os from "node:os";

function getLocalDevOrigins() {
  const origins = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.0.150",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
  ]);

  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === "IPv4" && iface.address) {
        origins.add(iface.address);
      }
    }
  }

  return Array.from(origins);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
};

export default nextConfig;
