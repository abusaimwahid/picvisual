const NON_PRODUCTION_CLOUDINARY_ENVIRONMENTS = new Set([
  "development",
  "test",
  "qa",
  "staging",
]);

/**
 * Safety gate for disposable provider-mutating QA tooling only.
 * Normal application uploads intentionally do not use this guard.
 */
export function isNonProductionCloudinary(
  value = process.env.CLOUDINARY_ENVIRONMENT,
) {
  return NON_PRODUCTION_CLOUDINARY_ENVIRONMENTS.has(
    value?.trim().toLowerCase() ?? "",
  );
}

export function assertNonProductionCloudinary(
  value = process.env.CLOUDINARY_ENVIRONMENT,
) {
  if (!isNonProductionCloudinary(value)) {
    throw new Error(
      "Provider-mutating QA requires CLOUDINARY_ENVIRONMENT to be explicitly set to development, test, qa, or staging.",
    );
  }
}
