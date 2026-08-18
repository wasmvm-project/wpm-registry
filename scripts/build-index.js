const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const outputFile = path.join(__dirname, '../index.json');

const entries = fs.readdirSync(packagesDir);
const registry = {
  version: '1.0.0',
  updated_at: new Date().toISOString(),
  packages: {},
};

for (const dir of entries) {
  const manifestPath = path.join(packagesDir, dir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      registry.packages[data.name] = data;
      console.log(`✓ Loaded package: ${data.name}@${data.version}`);
    } catch (e) {
      console.error(`✗ Failed to parse ${manifestPath}:`, e.message);
    }
  }
}

fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2) + '\n');
console.log(`\n🎉 Generated index.json with ${Object.keys(registry.packages).length} packages!`);
