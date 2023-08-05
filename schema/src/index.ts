import { readdir, readFile, mkdir, writeFile } from "fs/promises"
import { basename } from "path"

import { eval_script } from "@objscript/core"

import GenObjScriptLib from "./gen/objslib.js"

import * as lib from "./schema.js"
declare global {
  var ObjSchema: typeof lib
}
global.ObjSchema = lib

export const DefaultConfig = {
  path_schemas: "schemas",
  name_schema: "schema.js",
}
export type Config = Partial<typeof DefaultConfig>
export default class Generator {
  readonly #cfg
  constructor(
    config?: Config
  ) {
    this.#cfg = { ...DefaultConfig, ...config }
  }

  async gen_schema(path: string, name?: string) {
    let schema: string | null = null
    try { schema = await readFile(`${path}/${name ?? this.#cfg.name_schema}`, { encoding: "utf8" }) } catch { }
    if (schema) {
      const sobj = await eval_script(schema, { WithLine: true }) as ObjSchema.DefineObj
      await mkdir(`${path}/gen`, { recursive: true })
      await writeFile(`${path}/gen/schema.json`, JSON.stringify(sobj))
      const objslib = GenObjScriptLib(basename(path), sobj)
      await writeFile(`${path}/gen/env.ts`, objslib.env)
      await writeFile(`${path}/gen/envx.ts`, objslib.envx)
      await writeFile(`${path}/gen/types.ts`, objslib.types)
      await writeFile(`${path}/gen/typesx.ts`, objslib.typesx)
      await writeFile(`${path}/gen/index.ts`, objslib.index)
      try { await writeFile(`${path}/env.ts`, objslib.enve, { flag: "wx" }) } catch {}
      try { await writeFile(`${path}/types.ts`, objslib.typese, { flag: "wx" }) } catch {}
    }
  }
  async gen_schemas(xpath?: string) {
    const path = xpath ?? `${process.cwd()}/${this.#cfg.path_schemas}`
    const dirents = await readdir(path, { withFileTypes: true })
    for (let i = 0; i < dirents.length; i++) {
      const dirent = dirents[i]
      if (dirent.isDirectory()) {
        await this.gen_schema(`${path}/${dirent.name}`)
      }
    }
  }
}