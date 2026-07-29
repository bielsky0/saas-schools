const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function getLatestSdkVersion() {
  try {
    console.log("Getting latest @chaibuilder/sdk version...");
    const output = execSync("npm view @chaibuilder/sdk version", { encoding: "utf8" });
    return output.trim();
  } catch (error) {
    console.error("Failed to get latest SDK version:", error.message);
    process.exit(1);
  }
}

async function updatePackageJson() {
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Store original SDK dependency for later restoration
  if (!packageJson._originalSdkDependency) {
    packageJson._originalSdkDependency = packageJson.dependencies["@chaibuilder/sdk"];
  }

  // Get latest version
  const latestVersion = await getLatestSdkVersion();
  console.log(`Updating @chaibuilder/sdk to version ${latestVersion}`);

  // Replace link dependency with latest version
  packageJson.dependencies["@chaibuilder/sdk"] = latestVersion;

  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  console.log("Updated package.json with latest SDK version");
}

async function installDependencies() {
  try {
    console.log("Installing dependencies...");
    execSync("pnpm install --no-frozen-lockfile", { stdio: "inherit", cwd: path.join(__dirname, "..") });
    console.log("Dependencies installed successfully");
  } catch (error) {
    console.error("Failed to install dependencies:", error.message);
    process.exit(1);
  }
}

async function main() {
  console.log("Starting prebuild script...");
  await updatePackageJson();
  await installDependencies();
  console.log("Prebuild script completed successfully");
}

main().catch((error) => {
  console.error("Prebuild script failed:", error);
  process.exit(1);
});
