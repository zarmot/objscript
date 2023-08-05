import { watch as fsw } from "fs"
import { readdir, readFile, mkdir, writeFile } from "fs/promises"
import { extname, dirname } from "path"

import * as lib from "./global/index.js"
declare global {
  var ObjScript: typeof lib
}
global.ObjScript = lib

export async function load_esm(path: string, dynamic = false) {
  let mod
  let err
  try {
    const dyn = dynamic ? `?t=${Date.now()}` : ""
    mod = await import(`file://${path}${dyn}`)
  } catch (e) {
    err = e
  }
  return { mod, err }
}

export type EvalOptions = {
  WithLine: boolean
}
export async function eval_script(src: string, options?: Partial<EvalOptions>) {
  if (options?.WithLine) {
    const srcls = src.split("\n")
    const psrc = `
    () => {
      ${srcls[0].replace("()", "Env")}
      return env
    }`
    const penv = eval(psrc)()
    for (let i = 1; i < srcls.length; i++) {
      let srcl = srcls[i]
      penv?.LinedEnvFns?.forEach((fn: string) => {
        srcl = srcl.replaceAll(`${fn}(`, `${fn}_lined(${i + 1}, `)
      })
      penv?.LinedChianFns?.forEach((fn: string) => {
        srcl = srcl.replaceAll(`.${fn}(`, `["${fn}_lined"](${i + 1}, `)
      })
      srcls[i] = srcl
    }

    const srcx = `
    async () => {
      ${srcls[0]}
      const { ${penv?.LinedEnvFns?.map((fn: string) => `${fn}_lined`).join(", ")} } = env
      ${srcls.slice(1).join("\n")}
      return env.obj
    }`
    return await eval(srcx)()
  } else {
    const srcx = `
    async () => {
      ${src}
      return env.obj
    }`
    return await eval(srcx)()
  }
}

export async function load_schemas(path: string) {
  const dirents = await readdir(path, { withFileTypes: true })
  for (let i = 0; i < dirents.length; i++) {
    const dirent = dirents[i]
    if (dirent.isDirectory()) {
      const { mod } = await load_esm(`${path}/${dirent.name}/index.js`)
      if (!mod) {
        await load_esm(`${path}/${dirent.name}/gen/index.js`)
      }
    }
  }
}

export type WatchOptions = {
  nolog: boolean
  savepath: string
  eval: Partial<EvalOptions>
  onresult: ((name: string, data: any) => void)
}
export async function watch(path: string, options?: Partial<WatchOptions>) {
  const debounce: { [name: string]: number | undefined } = {}
  fsw(path, { recursive: true }, async (_, name) => {
    if (name && extname(name) === ".js") {
      const last = debounce[name]
      if (!last || Date.now() - last > 500) {
        debounce[name] = Date.now()

        let src: string | null = null
        try { src = await readFile(`${path}/${name}`, { encoding: "utf8" }) } catch { }
        if (src) {
          const data = await eval_script(src, options?.eval)
          if (data) {
            options?.onresult?.(name, data)
            if (options?.savepath) {
              const spath = `${options.savepath}/${name}`.replace(".js", ".json")
              await mkdir(`${dirname(spath)}`, { recursive: true })
              await writeFile(`${spath}`, JSON.stringify(data))
            }
            if (!options?.nolog) {
              console.log(`[${name}]`)
              console.log(data)
            }
          }
        }
      }
    }
  })
}

export const default_init_options = {
  path_output: "output",
  path_schemas: "schemas",
  path_scripts: "scripts",
  path_built: ".built",
}
export type InitOptions = Partial<typeof default_init_options> & Partial<{
  manually: boolean
  manually_watch: boolean
  watch: Partial<WatchOptions>
}>
export async function init(options?: InitOptions) {
  const opt = { ...default_init_options, ...options }

  const _cwd = process.cwd()
  const apath = (rpath: string, built?: boolean) => {
    return built ? `${_cwd}/${opt.path_built}/${rpath}` : `${_cwd}/${rpath}`
  }

  const fns = {
    eval_script,

    apath,

    load_esm(rpath: string, dynamic = false) {
      return load_esm(apath(rpath, true), dynamic)
    },
    load_schemas(rpath: string) {
      return load_schemas(apath(rpath, true))
    },
    watch(rpath: string, options?: Partial<WatchOptions>) {
      if (options?.savepath) {
        options.savepath = apath(options.savepath)
      }
      return watch(apath(rpath), options)
    }
  }

  if (!opt.manually) {
    await fns.load_schemas(opt.path_schemas)
    if (!opt.manually_watch) {
      await fns.watch(opt.path_scripts, opt.watch ?? {
        savepath: opt.path_output,
      })
    }
  }

  return fns
}