/**
 * Compares two semantic version strings
 * @param {string} v1 First version string (e.g., "1.0.0")
 * @param {string} v2 Second version string (e.g., "1.0.1")
 * @returns {number} -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export const compareVersions = (v1, v2) => {
  const v1Parts = v1.split(".").map(Number);
  const v2Parts = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }

  return 0;
};

/**
 * Checks if the current app version needs an update
 * @param {string} currentVersion The installed app version
 * @param {Array} availableVersions Array of available versions from API
 * @returns {Object|null} The latest version object if update is needed, null otherwise
 */
export const checkForUpdate = (currentVersion, availableVersions) => {
  if (!availableVersions || availableVersions.length === 0) return null;

  // Sort versions in descending order (newest first)
  const sortedVersions = [...availableVersions].sort((a, b) =>
    compareVersions(b.version, a.version)
  );

  // Get the latest version
  const latestVersion = sortedVersions[0];

  // Check if current version is older than the latest version
  if (compareVersions(currentVersion, latestVersion.version) < 0) {
    return latestVersion;
  }

  return null;
};
