# openclaw-memory-qdrant

OpenClaw local semantic memory plugin, based on Qdrant and Transformers.js for zero-config semantic search.

**📦 ClawHub**: https://clawhub.ai/skills/memory-qdrant

## Features

- 🧠 **Local semantic search** - generates embeddings locally using Transformers.js
- 💾 **In-memory mode** - zero configuration, no external services required
- 🔄 **Auto-capture** - automatically records important information via lifecycle hooks
- 🎯 **Smart recall** - automatically retrieves relevant memories based on context

## Installation

### Via ClawHub (recommended)

```bash
clawhub install memory-qdrant
```

### Manual installation

```bash
cd ~/.openclaw/plugins
git clone https://github.com/zuiho/openclaw-memory-qdrant.git memory-qdrant
cd memory-qdrant
npm install
```

### Requirements

**Before first run:**

1. **Node.js version**: requires Node.js ≥18.17
   ```bash
   node --version  # check version
   ```

2. **Build tools** (for compiling native dependencies):
   - **Windows**: Visual Studio Build Tools
     ```powershell
     npm install --global windows-build-tools
     ```
   - **macOS**: Xcode Command Line Tools
     ```bash
     xcode-select --install
     ```
   - **Linux**: build-essential
     ```bash
     sudo apt-get install build-essential  # Debian/Ubuntu
     sudo yum groupinstall "Development Tools"  # RHEL/CentOS
     ```

3. **Network access**:
   - Requires access to npmjs.com to download dependencies during installation
   - Downloads the embedding model (~25MB) from huggingface.co on first run
   - If an external Qdrant server is configured, that server must be reachable

4. **Native dependencies**:
   - `sharp`: image processing library (may require compilation)
   - `onnxruntime`: ML inference engine (may require compilation)
   - `undici`: HTTP client (pulled in via @qdrant/js-client-rest)

### Recommended installation

```bash
# Use npm ci for reproducible installs (recommended for production)
npm ci

# Or step-by-step (useful for debugging)
npm install --ignore-scripts  # skip post-install scripts
npm rebuild                    # then rebuild native modules
```

### Troubleshooting

**Problem: native module compilation failed**
- Ensure the appropriate build tools for your platform are installed
- Try clearing the cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

**Problem: model download failed**
- Check network connectivity and firewall settings
- Ensure huggingface.co is accessible
- The model is cached in `~/.cache/huggingface/`

**Problem: incompatible Node version**
- Upgrade to Node.js 18.17 or higher
- Use nvm to manage multiple Node versions: `nvm install 18 && nvm use 18`

## Configuration

Enable the plugin in your OpenClaw config file:

```json
{
  "plugins": {
    "memory-qdrant": {
      "enabled": true,
      "autoCapture": false,  // disabled by default, enable manually when needed
      "autoRecall": true,
      "captureMaxChars": 500
    }
  }
}
```

### Configuration options

- **qdrantUrl** (optional): external Qdrant server URL, leave empty to use in-memory mode
- **persistToDisk** (default true): save memories to disk in in-memory mode
  - Data is stored in `~/.openclaw-memory/` (or a custom path)
  - Data survives restarts
  - Set to false for pure in-memory mode (cleared on restart)
  - Only applies in in-memory mode (when qdrantUrl is not configured)
- **storagePath** (optional): custom storage directory
  - Leave empty to use the default path `~/.openclaw-memory/`
  - Supports `~` for the user home directory
  - Only applies when `persistToDisk: true`
- **autoCapture** (default false): automatically record conversation content
  - ⚠️ **Privacy protection**: by default, text containing PII (emails, phone numbers) is skipped even when autoCapture is enabled
  - Requires `allowPIICapture` to capture PII
- **allowPIICapture** (default false): allow capturing text containing PII
  - ⚠️ **Privacy risk**: only enable after understanding the privacy implications
  - Requires `autoCapture` to also be enabled
- **autoRecall** (default true): auto-inject relevant memories into conversations
- **captureMaxChars** (default 500): maximum characters per captured memory
- **maxMemorySize** (default 1000): maximum number of memories in in-memory mode
  - Only applies in in-memory mode (when qdrantUrl is not configured)
  - Oldest memories are automatically deleted when the limit is reached (LRU eviction)
  - Range: 100–1,000,000 entries
  - Set to 999999 for unlimited (old memories will not be auto-deleted)
  - ⚠️ Unlimited mode may exhaust memory — use with caution
  - External Qdrant mode is not subject to this limit

## Privacy & Security

### Data storage

- **Disk persistence** (default): data is saved to `~/.openclaw-memory/` and restored after restarts
  - Set `persistToDisk: false` to switch to pure in-memory mode (cleared on restart)
- **Qdrant mode**: if `qdrantUrl` is configured, data is sent to that server
  - ⚠️ Only configure trusted Qdrant servers
  - Recommended: use a local Qdrant instance or a dedicated service account

### Network access

- **First run**: Transformers.js downloads the model files from Hugging Face (~25MB)
- **Runtime**: in-memory mode makes no network requests; Qdrant mode connects to the configured server

### Auto-capture

- **autoCapture** is disabled by default and must be enabled manually
- **PII protection**: by default, text containing emails or phone numbers is automatically skipped even when autoCapture is enabled
- **allowPIICapture**: must be set to true to capture text containing PII
  - ⚠️ **Only enable after understanding the privacy risks**
  - Appropriate for: personal notes, test environments
  - Not appropriate for: shared environments, production, processing other people's data
- Recommended for personal environments only — avoid enabling in shared or production settings

### Recommendations

1. Test in an isolated environment before first use
2. Review `index.js` to understand the data handling logic
3. For sensitive environments, pin dependency versions (`npm ci`)
4. Periodically review stored memory content

## Usage

The plugin provides three tools:

### memory_store
Save important information to long-term memory:

```javascript
memory_store({
  text: "User prefers using Opus for complex tasks",
  category: "preference",
  importance: 0.8
})
```

### memory_search
Search relevant memories:

```javascript
memory_search({
  query: "workflow",
  limit: 5
})
```

### memory_forget
Delete a specific memory:

```javascript
memory_forget({
  memoryId: "uuid-here"
})
// or delete by search
memory_forget({
  query: "content to delete"
})
```

## Technical details

### Architecture

- **Vector database**: Qdrant (in-memory mode)
- **Embedding model**: Xenova/all-MiniLM-L6-v2 (runs locally)
- **Module system**: ES6 modules

### Key implementation

The plugin uses the **factory function pattern** to export tools, ensuring compatibility with OpenClaw's tool system:

```javascript
export default {
  name: 'memory-qdrant',
  version: '1.0.0',
  tools: [
    () => ({
      name: 'memory_search',
      description: '...',
      parameters: { ... },
      execute: async (params) => { ... }
    })
  ]
}
```

### FAQ

**Q: Why use the factory function pattern?**

A: OpenClaw's tool system calls `tool.execute()`. Exporting a plain object causes a `tool.execute is not a function` error. The factory function ensures a new tool instance is returned on each call.

**Q: Why use ES6 modules?**

A: OpenClaw's plugin loader expects ES6 module format. The `package.json` must include `"type": "module"`.

**Q: Where is data stored?**

A: In in-memory mode, data only persists for the lifetime of the process. After a restart, re-indexing is required. Future versions will support persistent storage.

## Development

```bash
# Install dependencies
npm install

# Test (requires OpenClaw environment)
openclaw gateway restart
```

## License

MIT

## Acknowledgements

- [Qdrant](https://qdrant.tech/) - vector database
- [Transformers.js](https://huggingface.co/docs/transformers.js) - local ML inference
- [OpenClaw](https://openclaw.ai/) - AI assistant framework
