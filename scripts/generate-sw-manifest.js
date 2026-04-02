import fs from 'fs';
import path from 'path';

const distDir = './dist';

function getAllFiles(dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      files.push('/' + relativePath.replace(/\\/g, '/'));
    }
  }
  return files;
}

function generateManifest() {
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const assets = getAllFiles(distDir);
  const manifest = {
    version: Date.now(),
    files: assets
  };

  fs.writeFileSync(
    path.join(distDir, 'sw-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Generated sw-manifest.json with ${assets.length} files`);
  console.log('Files:', assets);
}

generateManifest();
