// Graceful no-op on non-Linux (dev / macOS). Only active on Raspberry Pi.
type GpioClass = { new(pin: number, dir: 'out'): { writeSync(val: 0 | 1): void; unexport(): void } };

let GpioImpl: GpioClass | null = null;
try {
  // Dynamic import so the server starts even if onoff is not available
  const mod = await import('onoff');
  GpioImpl = (mod as { Gpio: GpioClass }).Gpio ?? null;
} catch {
  // Not on Linux or onoff not installed — silent no-op
}

const pins: Map<number, ReturnType<GpioClass['prototype']['constructor']>> = new Map();

function getPin(pin: number) {
  if (!GpioImpl) return null;
  if (!pins.has(pin)) {
    try { pins.set(pin, new GpioImpl(pin, 'out')); } catch { return null; }
  }
  return pins.get(pin) ?? null;
}

export function setGpioLevel(pin: number, value: 0 | 1): void {
  getPin(pin)?.writeSync(value);
}

export function releaseAll(): void {
  for (const [, gpio] of pins) {
    try { gpio.unexport(); } catch { /* ignore */ }
  }
  pins.clear();
}
