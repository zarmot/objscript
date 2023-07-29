import { watch } from "fs"
import { readdir, mkdir, writeFile } from "fs/promises"
import { extname, dirname } from "path"

import Event from "./event.js"

declare global {
  var Adata: typeof MOD
}
const MOD = {
  data: undefined as any,
  event: {
    script: Event<(name: string) => void>(),
    finish: Event<(name: string) => void>(),
    result: Event<(name: string, data: any) => void>(),
  },
  config: {
    log: true
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
    await _load(`file://${gpath}/${dirent.name}/index.js`)
  }
}

//congif
const config = await _load(`file://${process.cwd()}/.build/config.js`)
config?.init?.()

//watch
let task: Promise<void> | null = null
const spath = `${process.cwd()}/.build/scripts`
const debounce: { [name: string]: number | undefined } = {}
watch(spath, { recursive: true }, async (_, name) => {
  if (name && extname(name) === ".js") {
    const t = async () => {
      const last = debounce[name]
      if (!last || Date.now() - last > 500) {
        debounce[name] = Date.now()
        MOD.data = null
        MOD.event.script.dispatch(name)
        await _load(`file://${spath}/${name}?t=${Date.now()}`)
        MOD.event.finish.dispatch(name)
        if (MOD.data) {
          await mkdir(`${process.cwd()}/data/${dirname(name)}`, { recursive: true })
          await writeFile(`${process.cwd()}/data/${name.replace(".js", ".json")}`, JSON.stringify(MOD.data))
          MOD.event.result.dispatch(name, MOD.data)
          if (MOD.config.log) {
            console.log(`[${name}]`)
            console.log(MOD.data)
          }
        }
      }
    }
    if (task) {
      await task
    }
    task = t()
  }
})