function readTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set in the environment.`);
  }

  return value;
}

function readNumberEnv(name: string) {
  const value = readTrimmedEnv(name);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return parsed;
}

export { readNumberEnv, readTrimmedEnv };
