import * as fflate from 'https://esm.sh/fflate';

const args = window.process ? window.process.argv.slice(2) : [];
const subCmd = args[0];
const pkg = args[1];

async function writeBufferOPFS(path, uint8Array) {
  const root = await navigator.storage.getDirectory();
  const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  let curr = root;
  for (let i = 0; i < parts.length - 1; i++) {
    curr = await curr.getDirectoryHandle(parts[i], { create: true });
  }
  const fileHandle = await curr.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(uint8Array);
  await writable.close();
}

async function mkdirOPFS(path) {
  const root = await navigator.storage.getDirectory();
  const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  let curr = root;
  for (let i = 0; i < parts.length; i++) {
    curr = await curr.getDirectoryHandle(parts[i], { create: true });
  }
}

async function main() {
  if (subCmd === 'install') {
    if (!pkg) {
      console.error('pip: missing package name');
      return 1;
    }
    console.log(`[pip] Resolving ${pkg} via PyPI...`);
    try {
      const res = await fetch(`https://pypi.org/pypi/${pkg}/json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const releases = data.urls || [];
      const wheel = releases.find((r) => r.packagetype === 'bdist_wheel' && (r.python_version === 'source' || r.python_version === 'py3' || r.python_version === 'py2.py3' || r.filename.includes('none-any.whl')));
      
      if (!wheel) {
        console.error(`pip: no suitable pure python wheel found for ${pkg}`);
        return 1;
      }
      
      console.log(`[pip] Downloading ${wheel.filename} (${Math.round(wheel.size / 1024)} KB)...`);
      const whlRes = await fetch(wheel.url);
      const whlBuf = await whlRes.arrayBuffer();
      const whlUint8 = new Uint8Array(whlBuf);
      
      console.log(`[pip] Extracting into /lib/python3.12/site-packages...`);
      const sitePackages = '/lib/python3.12/site-packages';
      await mkdirOPFS(sitePackages);
      
      const unzipped = fflate.unzipSync(whlUint8);
      let fileCount = 0;
      
      for (const [filename, fileData] of Object.entries(unzipped)) {
        if (!filename.endsWith('/')) {
          const fullPath = `${sitePackages}/${filename}`;
          await writeBufferOPFS(fullPath, fileData);
          fileCount++;
        }
      }
      
      console.log(`[pip] Successfully installed ${pkg} (${fileCount} files)`);
    } catch(e) {
      console.error(`pip error: ${e.message}`);
    }
  } else {
    console.error(`pip: unknown command '${subCmd}'`);
  }
}

main();
