import { watch } from "fs"
import { readdir, mkdir, writeFile } from "fs/promises"
import { extname, dirname } from "path"
import { WebSocket, WebSocketServer } from "ws"

declare global {
  var Adata: typeof MOD
}
const MOD = {
  config: {
    ws: false,
    port: 13551,
  }
}
global.Adata = MOD

async function _load(path: string) {
  let mod: any
  try { mod = await import(path) } catch { }
  return mod
}

//global
const gpath = `${process.cwd()}/.build/global`;
const dirents = await readdir(gpath, { withFileTypes: true })
for (let i = 0; i < dirents.length; i++) {
  const dirent = dirents[i]
  if (dirent.isDirectory()) {
    _load(`file://${gpath}/${dirent.name}/index.js`)
  }
}

//congif
const config = await _load(`file://${process.cwd()}/.build/config.js`)
config?.init?.()

//server
const results: { [name: string]: any | undefined } = {}
let wss: WebSocketServer | undefined
if (Adata.config.ws) {
  wss = new WebSocketServer({ port: Adata.config.port })
}

//watch
const spath = `${process.cwd()}/.build/scripts`
const debounce: { [name: string]: number | undefined } = {}
watch(spath, { recursive: true }, async (_, name) => {
  if (name && extname(name) === ".js") {
    const last = debounce[name]
    if (!last || Date.now() - last > 500) {
      debounce[name] = Date.now()
      const script = await _load(`file://${spath}/${name}?t=${Date.now()}`)
      const data = await script?.data?.()
      if (data) {
        await mkdir(`${process.cwd()}/data/${dirname(name)}`, { recursive: true })
        await writeFile(`${process.cwd()}/data/${name.replace(".js", ".json")}`, JSON.stringify(data))
        results[name] = data
        if (wss) {
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify([name, data]));
            }
          })
        }
        console.log(`[${name}]`)
        console.log(data)
      }
    }
  }
})