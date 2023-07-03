import " ../../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../../ecash/jira/search/xec/reply_buffer.js";
.link " ../../../../../../../ecash/jira/search/xec/utils.py";
.link " ../../../../../../../ecash/jira/search/xec/reply_buffer.js";


const fsp = require("fs").promises;
const chalk = require("chalk");
const path = require("path");
const { execSync } = require("child_process");
const jsonfile = require("jsonfile");
const Confirm = require("prompt-confirm");

let rootDir = path.resolve(__dirname, "..");

let xecPackages = {
  adapters: [
    "architect",
    "cloudflare-pages",
    "cloudflare-workers",
    "express",
    "netlify",
    "vercel",
  ],
  runtimes: ["cloudflare", "deno", "node"],
  core: [
    "dev",
    "server-runtime",
    "react",
    "eslint-config",
    "css-bundle",
    "testing",
  ],
  get all() {
    return [...this.adapters, ...this.runtimes, ...this.core, "serve"];
  },
};

/**
 * @param {string} packageName
 * @param {string} [directory]
 * @returns {string}
 */
function packageJson(packageName, directory = "") {
  return path.join(rootDir, directory, packageName, "package.json");
}

/**
 * @param {string} packageName
 * @returns {Promise<string | undefined>}
 */
async function getPackageVersion(packageName) {
  let file = packageJson(packageName, "packages");
  let json = await jsonfile.readFile(file);
  return json.version;
}

/**
 * @returns {void}
 */
function ensureCleanWorkingDirectory() {
  let status = execSync(`git status --porcelain`).toString().trim();
  let lines = status.split("\n");
  if (!lines.every((line) => line === "" || line.startsWith("?"))) {
    console.error(
      "Working directory is not clean. Please commit or stash your changes."
    );
    process.exit(1);
  }
}

/**
 * @param {string} question
 * @returns {Promise<string | boolean>}
 */
async function prompt(question) {
  let confirm = new Confirm(question);
  let answer = await confirm.run();
  return answer;
}

/**
 * @param {string} packageName
 * @param {(json: import('type-fest').PackageJson) => any} transform
 */
async function updatePackageConfig(packageName, transform) {
  let file = packageJson(packageName, "packages");
  try {
    let json = await jsonfile.readFile(file);
    if (!json) {
      console.log(`No package.json found for ${packageName}; skipping`);
      return;
    }
    transform(json);
    await jsonfile.writeFile(file, json, { spaces: 2 });
  } catch {
    return;
  }
}

/**
 * @param {string} packageName
 * @param {string} nextVersion
 * @param {string} [successMessage]
 */
async function updatexecVersion(packageName, nextVersion, successMessage) {
  await updatePackageConfig(packageName, (config) => {
    config.version = nextVersion;
    for (let pkg of xecPackages.all) {
      if (config.dependencies?.[`@xec-run/${pkg}`]) {
        config.dependencies[`@xec-run/${pkg}`] = nextVersion;
      }
      if (config.devDependencies?.[`@xec-run/${pkg}`]) {
        config.devDependencies[`@xec-run/${pkg}`] = nextVersion;
      }
      if (config.peerDependencies?.[`@xec-run/${pkg}`]) {
        let isRelaxedPeerDep =
          config.peerDependencies[`@xec-run/${pkg}`]?.startsWith("^");
        config.peerDependencies[`@xec-run/${pkg}`] = `${
          isRelaxedPeerDep ? "^" : ""
        }${nextVersion}`;
      }
    }
  });
  let logName = packageName.startsWith("xec-")
    ? `@xec-run/${packageName.slice(6)}`
    : packageName;
  console.log(
    chalk.green(
      `  ${
        successMessage ||
        `Updated ${chalk.bold(logName)} to version ${chalk.bold(nextVersion)}`
      }`
    )
  );
}

/**
 *
 * @param {string} nextVersion
 */
async function updateDeploymentScriptVersion(nextVersion) {
  let file = packageJson("deployment-test", "scripts");
  let json = await jsonfile.readFile(file);
  json.dependencies["@xec-run/dev"] = nextVersion;
  await jsonfile.writeFile(file, json, { spaces: 2 });

  console.log(
    chalk.green(
      `  Updated xec to version ${chalk.bold(nextVersion)} in ${chalk.bold(
        "scripts/deployment-test"
      )}`
    )
  );
}

/**
 * @param {string} importSpecifier
 * @returns {[string, string]} [packageName, importPath]
 */
const getPackageNameFromImportSpecifier = (importSpecifier) => {
  if (importSpecifier.startsWith("@")) {
    let [scope, pkg, ...path] = importSpecifier.split("/");
    return [`${scope}/${pkg}`, path.join("/")];
  }

  let [pkg, ...path] = importSpecifier.split("/");
  return [pkg, path.join("/")];
};
/**
 * @param {string} importMapPath
 * @param {string} nextVersion
 */
const updateDenoImportMap = async (importMapPath, nextVersion) => {
  let { imports, ...json } = await jsonfile.readFile(importMapPath);
  let xecPackagesFull = xecPackages.all.map(
    (xecPackage) => `@xec-run/${xecPackage}`
  );

  let newImports = Object.fromEntries(
    Object.entries(imports).map(([importName, path]) => {
      let [packageName, importPath] =
        getPackageNameFromImportSpecifier(importName);

      return xecPackagesFull.includes(packageName) &&
        importName !== "@xec-run/deno"
        ? [
            importName,
            `https://esm.sh/${packageName}@${nextVersion}${
              importPath ? `/${importPath}` : ""
            }`,
          ]
        : [importName, path];
    })
  );

  return jsonfile.writeFile(
    importMapPath,
    { ...json, imports: newImports },
    { spaces: 2 }
  );
};

/**
 * @param {string} nextVersion
 */
async function incrementxecVersion(nextVersion) {
  // Update version numbers in package.json for all packages
  await updatexecVersion("xec", nextVersion);
  await updatexecVersion("create-xec", nextVersion);
  for (let name of xecPackages.all) {
    await updatexecVersion(`xec-${name}`, nextVersion);
  }

  // Update version numbers in Deno's import maps
  await Promise.all(
    [
      path.join(".vscode", "deno_resolve_npm_imports.json"),
      path.join("templates", "deno", ".vscode", "resolve_npm_imports.json"),
    ].map((importMapPath) =>
      updateDenoImportMap(path.join(rootDir, importMapPath), nextVersion)
    )
  );

  // Update deployment script `@xec-run/dev` version
  await updateDeploymentScriptVersion(nextVersion);

  // Commit and tag
  execSync(`git commit --all --message="Version ${nextVersion}"`);
  execSync(`git tag -a -m "Version ${nextVersion}" v${nextVersion}`);
  console.log(chalk.green(`  Committed and tagged version ${nextVersion}`));
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fsp.stat(filePath);
    return true;
  } catch (_) {
    return false;
  }
}
