const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const failures = [];
const configOnly = process.argv.includes('--config-only');

function requireValue(condition, message) {
  if (!condition) failures.push(message);
}

function requireFile(relativePath) {
  requireValue(
    fs.existsSync(path.join(root, relativePath)),
    `Missing ${relativePath}`,
  );
}

function readDotEnv(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().replace(/^export\s+/, '');
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function isProductionClerkKey(value) {
  if (!value.startsWith('pk_live_') || value.includes('your_')) return false;
  try {
    const encoded = value.slice('pk_live_'.length)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    return decoded.endsWith('$') && decoded.slice(0, -1).includes('.');
  } catch {
    return false;
  }
}

requireValue(appConfig.name === 'Arcform', 'The iOS display name must be Arcform');
requireValue(
  appConfig.ios?.bundleIdentifier === 'com.arcform.mobile',
  'The bundle identifier must be com.arcform.mobile',
);
requireValue(/^\d+$/.test(appConfig.ios?.buildNumber ?? ''), 'The iOS build number must be numeric');
requireValue(
  appConfig.ios?.deploymentTarget === '17.0',
  'The iOS deployment target must be 17.0',
);
requireValue(
  appConfig.ios?.config?.usesNonExemptEncryption === false,
  'Export compliance must declare that Arcform does not use non-exempt encryption',
);

requireFile('ios/Arcform.xcodeproj/project.pbxproj');
requireFile('ios/Arcform/Info.plist');
requireFile('ios/Podfile');
requireFile('modules/arcform-vision/ios/ArcformVisionModule.swift');
requireFile('modules/arcform-vision/ios/ArcformVision.podspec');

const projectPath = path.join(root, 'ios/Arcform.xcodeproj/project.pbxproj');
if (fs.existsSync(projectPath)) {
  const project = fs.readFileSync(projectPath, 'utf8');
  requireValue(
    project.includes('PRODUCT_BUNDLE_IDENTIFIER = "com.arcform.mobile";'),
    'The generated Xcode target has the wrong bundle identifier',
  );
  requireValue(
    project.includes('IPHONEOS_DEPLOYMENT_TARGET = 17.0;'),
    'The generated Xcode target is not set to iOS 17.0',
  );
  requireValue(
    project.includes(`CURRENT_PROJECT_VERSION = ${appConfig.ios.buildNumber};`),
    'The generated Xcode build number does not match app.json',
  );
}

const infoPath = path.join(root, 'ios/Arcform/Info.plist');
if (fs.existsSync(infoPath)) {
  const info = fs.readFileSync(infoPath, 'utf8');
  requireValue(info.includes('NSCameraUsageDescription'), 'Camera privacy text is missing');
  requireValue(info.includes('NSMicrophoneUsageDescription'), 'Microphone privacy text is missing');
  requireValue(
    /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(info),
    'Export compliance must be false in the generated Info.plist',
  );
  requireValue(
    /<key>UIRequiresFullScreen<\/key>\s*<true\/>/.test(info),
    'Full-screen iPhone mode is missing from the generated Info.plist',
  );
  requireValue(
    info.includes(`<string>${appConfig.version}</string>`),
    'The generated Info.plist version does not match app.json',
  );
  requireValue(
    info.includes(`<string>${appConfig.ios.buildNumber}</string>`),
    'The generated Info.plist build number does not match app.json',
  );
}

const podfilePropertiesPath = path.join(root, 'ios/Podfile.properties.json');
if (fs.existsSync(podfilePropertiesPath)) {
  const podfileProperties = JSON.parse(fs.readFileSync(podfilePropertiesPath, 'utf8'));
  requireValue(
    podfileProperties['ios.deploymentTarget'] === '17.0',
    'Podfile.properties.json is not set to iOS 17.0',
  );
}

async function checkArchiveReadiness() {
  if (configOnly) return;

  const releaseEnvironment = readDotEnv('.env.local');
  requireValue(
    releaseEnvironment !== null,
    'Missing .env.local; Xcode must bundle the same release environment that preflight validates',
  );
  const domain = releaseEnvironment?.EXPO_PUBLIC_DOMAIN ?? '';
  const clerkKey = releaseEnvironment?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  requireValue(
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) && !domain.includes('example'),
    '.env.local EXPO_PUBLIC_DOMAIN must be a production hostname without https://',
  );
  requireValue(
    isProductionClerkKey(clerkKey),
    '.env.local EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid production Clerk publishable key',
  );

  const podfileLockPath = path.join(root, 'ios/Podfile.lock');
  const workspacePath = path.join(root, 'ios/Arcform.xcworkspace/contents.xcworkspacedata');
  requireFile('ios/Podfile.lock');
  requireFile('ios/Arcform.xcworkspace/contents.xcworkspacedata');
  if (fs.existsSync(podfileLockPath)) {
    const podfileLock = fs.readFileSync(podfileLockPath, 'utf8');
    requireValue(
      /-\s+ArcformVision\b/.test(podfileLock),
      'Podfile.lock does not include the ArcformVision pod',
    );
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    try {
      const response = await fetch(`https://${domain}/api/healthz`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      requireValue(
        response.status === 200,
        `Production API health check returned HTTP ${response.status}; remove browser password protection before TestFlight`,
      );
    } catch (error) {
      requireValue(false, `Production API health check failed: ${error.message}`);
    }
  }
}

async function main() {
  await checkArchiveReadiness();

  if (failures.length) {
    console.error('Arcform iOS release preflight failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    configOnly
      ? 'Arcform iOS release configuration passed.'
      : 'Arcform iOS archive preflight passed.',
  );
}

void main();