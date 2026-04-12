function readTrimmedEnv(name: string, defaultValue?: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`${name} must be set in the environment.`);
  }

  return value;
}

function readNumberEnv(name: string, defaultValue?: number) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`${name} must be set in the environment.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return parsed;
}

export { readNumberEnv, readTrimmedEnv };
