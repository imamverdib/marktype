import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, "../extension/package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version;

function parseSemver(v) {
  const [maj, min, patch] = (v || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
  return { maj, min, patch };
}

function compareSemver(a, b) {
  const sa = parseSemver(a);
  const sb = parseSemver(b);
  if (sa.maj !== sb.maj) return sa.maj - sb.maj;
  if (sa.min !== sb.min) return sa.min - sb.min;
  return sa.patch - sb.patch;
}

async function checkAndBump() {
  try {
    const res = await fetch("https://open-vsx.org/api/imamverdib/marktype/versions");
    if (!res.ok) {
      console.log(`Could not fetch Open VSX versions (status ${res.status}). Keeping ${currentVersion}.`);
      return;
    }
    const data = await res.json();
    const publishedVersions = Object.keys(data.versions || {});
    if (publishedVersions.length === 0) {
      console.log("No published versions found on Open VSX. Keeping current version.");
      return;
    }

    publishedVersions.sort(compareSemver);
    const highestPublished = publishedVersions[publishedVersions.length - 1];
    console.log(`Local version: ${currentVersion} | Highest Open VSX version: ${highestPublished}`);

    if (compareSemver(currentVersion, highestPublished) <= 0) {
      const hp = parseSemver(highestPublished);
      const bumped = `${hp.maj}.${hp.min}.${hp.patch + 1}`;
      console.log(`Bumping extension version from ${currentVersion} to ${bumped}`);
      pkg.version = bumped;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    } else {
      console.log(`Local version ${currentVersion} is already greater than published ${highestPublished}.`);
    }
  } catch (error) {
    console.error("Error checking Open VSX version:", error);
  }
}

await checkAndBump();
