import { watch as fsw } from "fs"
import { readdir, mkdir, writeFile } from "fs/promises"
import { extname, dirname } from "path"

export async function load_global() {
  const gpath = `${process.cwd()}/.build/global`;
  const dirents = await readdir(gpath, { withFileTypes: true })
  for (let i = 0; i < dirents.length; i++) {
    const dirent = dirents[i]
    if (dirent.isDirectory()) {
      try { await import(`file://${gpath}/${dirent.name}/index.js`) } catch { }
    }
  }
}

type Options = {
  nolog: boolean
  loader: ((name: string) => Promise<any>) | undefined
  on_result: ((name: string, data: any) => void) | undefined
  savepath: string
}
export async function watch(path: string, options?: Partial<Options>) {
  const spath = `${process.cwd()}/.build/${path}`
  const debounce: { [name: string]: number | undefined } = {}
  fsw(spath, { recursive: true }, async (_, name) => {
    if (name && extname(name) === ".js") {
      const last = debounce[name]
      if (!last || Date.now() - last > 500) {
        debounce[name] = Date.now()

        let data
        if (options?.loader) {
          data = await options.loader(name)
        } else {
          try { 
            const mod = await import(`file://${path}/${name}?t=${Date.now()}`) 
            data = mod?.data
          } catch { }
        }
        if (data) {
          options?.on_result?.(name, data)
          const spath = options?.savepath ? `${options.savepath}/${name}`.replace(".js", ".json") : `.adata/${path}/${name}`.replace(".js", ".json")
          await mkdir(`${process.cwd()}/${dirname(spath)}`, { recursive: true })
          await writeFile(`${process.cwd()}/${spath}`, JSON.stringify(data))
          if (!options?.nolog) {
            console.log(`[${name}]`)
            console.log(data)
          }
        }
      }
    }
  })
}