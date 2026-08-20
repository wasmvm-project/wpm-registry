const args = window.process ? window.process.argv.slice(2) : [];
const subCmd = args[0];
const isGlobal = args.includes('-g') || args.includes('--global');
const pkgArgs = args.filter(a => a !== '-g' && a !== '--global' && a !== subCmd);
const pkg = pkgArgs[0];

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
    
    if (isGlobal) {
      console.log(`[pnpm] Resolving global package ${pkg}...`);
      try {
        const infoRes = await fetch(`https://unpkg.com/${pkg}/package.json`);
        if (!infoRes.ok) throw new Error(`Failed to fetch package.json for ${pkg}`);
        const info = await infoRes.json();
        
        if (!info.bin) {
          console.error(`pnpm: package ${pkg} has no 'bin' field in package.json`);
          return 1;
        }
        
        let bins = {};
        if (typeof info.bin === 'string') {
          bins[info.name || pkg] = info.bin;
        } else {
          bins = info.bin;
        }
        
        for (const [binName, binPath] of Object.entries(bins)) {
          const cleanPath = binPath.replace(/^\.\//, '');
          console.log(`[pnpm] Downloading CLI script ${binName} -> ${pkg}/${cleanPath}`);
          
          let reqUrl = `https://esm.sh/${info.name}@${info.version}/${cleanPath}?bundle`;
          let res = await fetch(reqUrl);
          
          if (!res.ok) {
            console.log(`[pnpm] Failed to fetch bundle (HTTP ${res.status}). Attempting to resolve proxy script...`);
            try {
              const rawRes = await fetch(`https://unpkg.com/${info.name}@${info.version}/${cleanPath}`);
              if (rawRes.ok) {
                const rawCode = await rawRes.text();
                const match = rawCode.match(/(?:import|require)\s*\(\s*['"]([^'"]+\.js)['"]\s*\)|import\s+['"]([^'"]+\.js)['"]/);
                if (match) {
                  const targetPath = match[1] || match[2];
                  const resolvedUrl = new URL(targetPath, `http://localhost/${cleanPath}`);
                  const resolvedCleanPath = resolvedUrl.pathname.slice(1);
                  console.log(`[pnpm] Resolved proxy script to ${resolvedCleanPath}`);
                  reqUrl = `https://esm.sh/${info.name}@${info.version}/${resolvedCleanPath}?bundle`;
                  res = await fetch(reqUrl);
                }
              }
            } catch (e) {
              console.warn(`[pnpm] Proxy resolution failed: ${e.message}`);
            }
          }

          if (!res.ok) throw new Error(`HTTP ${res.status} from ${reqUrl}`);
          
          const code = `import "${reqUrl}";\nexport * from "${reqUrl}";\n`;
          await writeTextFileOPFS(`/bin/${binName}.js`, code);
          console.log(`[pnpm] Successfully installed global command: ${binName}`);
        }
      } catch(e) {
        console.error(`pnpm error: ${e.message}`);
      }
    } else {
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
    }
  } else {
    console.error(`pnpm: unknown command '${subCmd}'`);
  }
}

await main();
