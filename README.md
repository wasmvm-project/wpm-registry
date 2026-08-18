# 📦 wpm-registry

The Official Package Registry for **[wasmvm](https://github.com/wasmvm-project/wasmvm)** (WebAssembly Package Manager).

---

## 💡 What is wpm?

`wpm` is a serverless, decentralized package manager for WebAssembly WASI tools.
Every package in `wpm` is a **standalone `.wasm` binary** that runs directly inside the browser at 0ms latency with native OPFS storage support.

---

## 🛠️ How to Add a New Package (Contribution Guide)

Adding your WebAssembly tool to `wpm` is as simple as creating a Pull Request with a single JSON file!

### Step 1: Fork and Clone this repository

```bash
git clone https://github.com/wasmvm-project/wpm-registry.git
cd wpm-registry
```

### Step 2: Create `packages/<your-tool>/manifest.json`

Create a folder under `packages/` with your tool's name:

```json
{
  "name": "my-tool",
  "version": "1.0.0",
  "description": "My awesome WASI CLI tool",
  "author": "Your Name",
  "category": "utilities",
  "size": "500 KB",
  "wasm_url": "https://github.com/your-username/my-tool/releases/download/v1.0.0/my-tool.wasm",
  "entrypoint": "_start"
}
```

### Step 3: Build & Validate

```bash
node scripts/build-index.js
```

### Step 4: Open a Pull Request!

Once merged, your package will be immediately discoverable and installable worldwide via:

```bash
# In wasmvm terminal:
wpm install my-tool
my-tool
```

---

## 📄 License

MIT License © 2026 [wasmvm-project](https://github.com/wasmvm-project)
