const positiveValues = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const negativeValues = new Set(['0', 'false', 'no', 'off', 'disabled']);

type FeatureFlagName = 'assistant' | 'widgets';

type RuntimeFlags = Partial<Record<FeatureFlagName, boolean>>;

declare global {
  interface Window {
    __portalFlags?: RuntimeFlags;
  }
}

function normalize(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return undefined;
}

function parseFlag(value: unknown, fallback: boolean): boolean {
  const normalized = normalize(value);
  if (!normalized) {
    return fallback;
  }
  if (positiveValues.has(normalized)) {
    return true;
  }
  if (negativeValues.has(normalized)) {
    return false;
  }
  return fallback;
}

const isDevRuntime = Boolean(
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
);

const defaults: Record<FeatureFlagName, boolean> = {
  assistant: isDevRuntime,
  widgets: isDevRuntime,
};

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  const runtimeOverride =
    typeof window !== 'undefined' ? window.__portalFlags?.[flag] : undefined;
  if (typeof runtimeOverride === 'boolean') {
    return runtimeOverride;
  }

  const envValue = (import.meta.env as Record<string, unknown>)[
    `VITE_FLAG_${flag.toUpperCase()}`
  ];
  return parseFlag(envValue, defaults[flag]);
}

export type { FeatureFlagName };
