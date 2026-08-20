const args = window.process ? window.process.argv.slice(2) : [];
const subCmd = args[0];
const pkg = args[1];

async function writeTextFileOPFS(path, text) {
  const root = await navigator.storage.getDirectory();
  const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  let curr = root;
  for (let i = 0; i < parts.length - 1; i++) {
    curr = await curr.getDirectoryHandle(parts[i], { create: true });
  }
  const fileHandle = await curr.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function readTextFileOPFS(path) {
  const root = await navigator.storage.getDirectory();
  const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  let curr = root;
  for (let i = 0; i < parts.length - 1; i++) {
    curr = await curr.getDirectoryHandle(parts[i]);
  }
  const fileHandle = await curr.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return await file.text();
}

async function existsOPFS(path) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
    let curr = root;
    for (let i = 0; i < parts.length - 1; i++) {
      curr = await curr.getDirectoryHandle(parts[i]);
    }
    await curr.getFileHandle(parts[parts.length - 1]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (subCmd === 'install' || subCmd === 'i' || subCmd === 'add') {
    if (!pkg) {
      console.error('pnpm: missing package name');
      return 1;
    }
    console.log(`[pnpm] Resolving ${pkg} via esm.sh...`);
    try {
      const res = await fetch(`https://esm.sh/${pkg}?bundle`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const code = await res.text();
      
      const pwd = '/home/user';
      const pkgPath = `${pwd}/node_modules/${pkg}.js`;
      await writeTextFileOPFS(pkgPath, code);
      console.log(`[pnpm] Downloaded ${pkg} to ${pkgPath}`);

      const importMapPath = `${pwd}/import_map.json`;
      let importMap = { imports: {} };
      if (await existsOPFS(importMapPath)) {
        try {
          const content = await readTextFileOPFS(importMapPath);
          importMap = JSON.parse(content);
        } catch(e) {}
      }
      
      if (!importMap.imports) importMap.imports = {};
      importMap.imports[pkg] = `/opfs${pkgPath}`;
      
      await writeTextFileOPFS(importMapPath, JSON.stringify(importMap, null, 2));
      console.log(`[pnpm] Updated import_map.json`);
      console.log(`[pnpm] Successfully installed ${pkg}!`);
    } catch(e) {
      console.error(`pnpm error: ${e.message}`);
    }
  } else {
    console.error(`pnpm: unknown command '${subCmd}'`);
  }
}

main();
