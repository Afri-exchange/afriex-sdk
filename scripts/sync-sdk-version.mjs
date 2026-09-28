// Writes the version of @afriex/core into packages/core/src/version.ts, so the
// User-Agent header carries the version that is published.
//
// Runs after `changeset version`, as part of `pnpm run version`.
import { readFileSync, writeFileSync } from "node:fs";

const packageJsonPath = new URL(
  "../packages/core/package.json",
  import.meta.url
);
const versionFilePath = new URL(
  "../packages/core/src/version.ts",
  import.meta.url
);

const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const source = readFileSync(versionFilePath, "utf8");
const pattern = /export const SDK_VERSION = "[^"]*";/;

if (!pattern.test(source)) {
  throw new Error("SDK_VERSION was not found in packages/core/src/version.ts");
}

const updated = source.replace(
  pattern,
  `export const SDK_VERSION = "${version}";`
);

if (updated === source) {
  console.log(`SDK_VERSION is already ${version}`);
} else {
  writeFileSync(versionFilePath, updated);
  console.log(`SDK_VERSION set to ${version}`);
}
