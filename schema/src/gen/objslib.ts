import type * as S from "../schema.js"

function tab(n: number) {
  return "  ".repeat(n)
}
export default function GenObjScriptLib(namespace: string, schema: ObjSchema.DefineObj) {
  function ts(f: S.Field, item: boolean = false, prefix?: string) {
    if (!item && f.ArrayFlag) {
      if (f.Type === "bool") {
        return "boolean[]"
      } else if (f.Type === "number") {
        return "number[]"
      } else if (f.Type === "string") {
        return "string[]"
      } else if (f.TypeName) {
        return `Array<${f.TypeName}>`
      } else {
        return "any"
      }
    } else {
      if (f.Type === "bool") {
        return "boolean"
      } else if (f.Type === "number") {
        return "number"
      } else if (f.Type === "string") {
        return "string"
      } else if (f.TypeName) {
        return f.TypeName
      } else {
        return "any"
      }
    }
  }
  function vs(f: S.Field): string {
    if (f.Type === "bool") {
      return f.DefaultValue ? "true" : "false"
    } else if (f.Type === "number") {
      return f.DefaultValue!.toString()
    } else if (f.Type === "string") {
      return `\`${f.DefaultValue}\``
    } else {
      return "undefined"
    }
  }
  function al(buffer: string[]) {
    function a(s: string, t?: number) {
      t ? buffer.push(`${tab(t)}${s}`) : buffer.push(s)
    }
    function l(s?: string, t?: number) {
      if (s) {
        t ? buffer.push(`${tab(t)}${s}\r\n`) : buffer.push(`${s}\r\n`)
      } else {
        buffer.push(`\r\n`)
      }
    }
    return [a, l] as const
  }
  const envb: string[] = []
  const envxb: string[] = []
  const typesb: string[] = []
  const typesxb: string[] = []
  const typeseb: string[] = []
  const enval = al(envb)
  const envxal = al(envxb)
  const typesal = al(typesb)
  const typesxal = al(typesxb)
  const typeseal = al(typeseb)

  type AL = typeof enval
  let a: AL[0] = enval[0]
  let l: AL[1] = enval[1]
  function use(al: AL) {
    a = al[0]
    l = al[1]
  }

  //gen/typesx.ts-head
  use(typesxal)
  l(`export * from "../types.js"`)
  l(`import * as Ext from "../types.js"`)

  //types.ts-head
  use(typeseal)
  l(`export * from "./gen/types.js"`)
  l(`import * as Base from "./gen/types.js"`)
  l()

  const its: string[] = []
  schema.Types.forEach((t) => {
    its.push(t.Name)
    its.push(`${t.Name}Handler`)

    const ctor: S.Field[] = []
    const ctor_o: S.Field[] = []
    const nctor: S.Field[] = []
    const chain: S.Field[] = []
    const pctor: S.Field[] = []
    t.Fields.forEach((f) => {
      if (f.ArrayFlag) {
        if (f.ChainName) {
          nctor.push(f)
          chain.push(f)
        } else if (f.Type === "extern" && f.TypeName && f.PubCtor) {
          nctor.push(f)
          pctor.push(f)
        } else if (f.ManualSet) {
          nctor.push(f)
        } else {
          if (f.Required) {
            ctor.push(f)
          } else {
            ctor_o.push(f)
          }
        }
      } else {
        if (f.Required && f.DefaultValue === undefined) {
          ctor.push(f)
        } else {
          if (f.ChainName) {
            nctor.push(f)
            chain.push(f)
          } else if (f.Type === "extern" && f.TypeName && f.PubCtor) {
            nctor.push(f)
            pctor.push(f)
          } else if (f.ManualSet) {
            nctor.push(f)
          } else {
            ctor_o.push(f)
          }
        }
      }
    })

    //gen/types.ts
    {
      use(typesal)
      l(`export class ${t.Name} {`)
      if (t.WithLineNumber) {
        l(`OBJSLine?: number`, 1)
      }
      l(`constructor(`, 1)
      ctor.forEach((f) => {
        l(`public ${f.Name}: ${ts(f)},`, 2)
      })
      ctor_o.forEach((f) => {
        l(`public ${f.Name}?: ${ts(f)},`, 2)
      })
      l(`) {}`, 1)
      nctor.forEach((f) => {
        a(f.Name, 1)
        !f.Required && a("?")
        a(`: ${ts(f)}`)
        if (f.ArrayFlag) {
          f.Required && a(` = []`)
        } else {
          f.DefaultValue !== undefined && a(` = ${vs(f)}`)
        }
        l()
      })
      l(`}`)

      //handler
      l(`export class ${t.Name}Handler {`)
      l(`constructor(`, 1)
      l(`public obj: ${t.Name},`, 2)
      l(`public envref: ObjScript.Ref<${namespace}.${schema.Name}Env>,`, 2)
      l(`) {}`, 1)
      l(`get env() {`, 1)
      l(`return this.envref.r`, 2)
      l(`}`, 1)
      l(`c(cache: ObjScript.Cache<${t.Name}Handler>) {`, 1)
      l(`cache.r = this`, 2)
      l(`return this`, 2)
      l(`}`, 1)
      chain.forEach((f) => {
        if (f.ArrayFlag) {
          l(`${f.ChainName}(item: ${ts(f, true)}) {`, 1)
          if (!f.Required) {
            l(`if (!this.obj.${f.Name}) {`, 2)
            l(`this.obj.${f.Name} = []`, 3)
            l(`}`, 2)
          }
          l(`this.obj.${f.Name}.push(item)`, 2)
          l(`return this`, 2)
          l(`}`, 1)
        } else if (f.Type === "bool") {
          l(`${f.ChainName}(flag: boolean${f.Required ? "" : " | undefined"} = ${(f.DefaultValue) ? "false" : "true"}) {`, 1)
          l(`this.obj.${f.Name} = flag`, 2)
          l(`return this`, 2)
          l(`}`, 1)
        } else {
          l(`${f.ChainName}(value${f.Required ? "" : "?"}: ${ts(f)}) {`, 1)
          l(`this.obj.${f.Name} = value`, 2)
          l(`return this`, 2)
          l(`}`, 1)
        }
      })
      pctor.forEach((f) => {
        l(`${f.PubCtor}(...args: ConstructorParameters<${namespace}.${schema.Name}Env["${f.TypeName}"]>) {`, 1)
        l(`const o = new this.env.${f.TypeName}(...args)`, 2)
        l(`const oh = new this.env.${f.TypeName}Handler(o, this.envref)`, 2)
        l(`this.obj.${f.Name}.push(o)`, 2)
        l(`return oh`, 2)
        l(`}`, 1)
      })

      l(`}`, 0)
    }

    //gen/typesx.ts
    {
      use(typesxal)
      if (t.WithLineNumber && t.LinedFns.length > 0) {
        l(`export class ${t.Name}Handler extends Ext.${t.Name}Handler {`)
        t.LinedFns.forEach((fn) => {
          l(`private ${fn}_lined(line: number, ...args: Parameters<typeof this.${fn}>) {`, 1)
          l(`const obj = this.${fn}(...args)`, 2)
          l(`obj.obj.OBJSLine = line`, 2)
          l(`return obj`, 2)
          l(`}`, 1)
        })
        l(`}`)
      }
    }

    //types.ts-head
    {
      use(typeseal)
      l(`export class ${t.Name}Handler extends Base.${t.Name}Handler {`)
      l(`}`)
    }
  })

  //gen/env.ts
  {
    use(enval)
    l(`export * from "./typesx.js"`)
    l(`import { ${its.join(", ")} } from "./typesx.js"`)

    //d
    l(`declare global {`)
    l(`namespace ${namespace} {`, 1)
    l(`type ${schema.Name}Obj = {`, 2)
    schema.Fields.forEach((f) => {
      a(f.Name, 3)
      !f.Required && a("?")
      a(`: `)
      a(`${ts(f)}`)
      l()
    })
    l(`}`, 2)
    l(`}`, 1)
    l(`}`)

    l(`export default function ${schema.Name}() {`)
    l(`const envref = {} as any`, 1)

    //obj
    l(`const obj: ${namespace}.${schema.Name}Obj = {`, 1)
    schema.Fields.forEach((f) => {
      if (f.ArrayFlag || f.DefaultValue) {
        a(f.Name, 2)
        !f.Required && a("?")
        if (f.ArrayFlag) {
          f.Required && a(`: []`)
        } else {
          f.DefaultValue && a(`: ${vs(f)}`)
        }
        l(`,`)
      }
    })
    l(`}`, 1)

    //ctx
    l(`const ctx = {`, 1)

    l(`current: {`, 2)
    schema.EnvFns.forEach((fn) => {
      if (fn.CurrentSet) {
        if (fn.TargetType) {
          l(`${fn.CurrentSet}: <${fn.TargetType}Handler | null>null,`, 3)
        } else if (fn.TargetCurrent && fn.TargetCurrent) {
          l(`${fn.CurrentSet}: <${fn.CurrentType ? `${fn.CurrentType} | null` : "any"}>null,`, 3)
        }
      }
    })
    l(`}`, 2)

    l(`}`, 1)

    //cache
    l(`const c = {`, 1)
    schema.Types.forEach((t) => {
      if (t.FnName) {
        l(`get ${t.FnName}() {`, 2)
        l(`return ObjScript.Cache<${t.Name}Handler>()`, 3)
        l(`},`, 2)
      }
    })
    l(`}`, 1)

    //chain
    const chainfns: string[] = []
    schema.Fields.forEach((f) => {
      if (f.ChainName) {
        if (f.ArrayFlag) {
          l(`function ${f.ChainName}(item: ${ts(f, true)}) {`, 1)
          l(`obj.${f.Name}.push(item)`, 2)
          l(`}`, 1)
        } else if (f.Type === "bool") {
          l(`function ${f.ChainName}(flag: boolean${f.Required ? "" : " | undefined"} = ${(f.DefaultValue) ? "false" : "true"}) {`, 1)
          l(`obj.${f.Name} = flag`, 2)
          l(`}`, 1)
        } else {
          l(`function ${f.ChainName}(value${f.Required ? "" : "?"}: ${ts(f)}) {`, 1)
          l(`obj.${f.Name} = value`, 2)
          l(`}`, 1)
        }
        chainfns.push(f.ChainName)
      }
    })

    //envfn
    const envfns: string[] = []
    schema.EnvFns.forEach((fn) => {
      if (fn.TargetType) {
        l(`function ${fn.Name}(...args: ConstructorParameters<typeof ${fn.TargetType}>) {`, 1)
        l(`const o = new ${fn.TargetType}(...args)`, 2)
        l(`const oh = new ${fn.TargetType}Handler(o, envref)`, 2)
        fn.CurrentSet && l(`ctx.current.${fn.CurrentSet} = oh`, 2)
        fn.TargetArray && l(`obj.${fn.TargetArray}.push(o)`, 2)
        l(`return oh`, 2)
        l("}", 1)
        envfns.push(fn.Name)
      } else if (fn.TargetCurrent && fn.TargetFn) {
        l(`function ${fn.Name}(...args: Parameters<Exclude<typeof ctx.current.${fn.TargetCurrent}, null>["${fn.TargetFn}"]>) {`, 1)
        l(`const _t = ctx.current.${fn.TargetCurrent}`, 2)
        l(`if (_t) {`, 2)
        l(`const o = _t.${fn.TargetFn}(...args)`, 3)
        fn.CurrentSet && l(`ctx.current.${fn.CurrentSet} = o`, 3)
        l(`return o`, 3)
        l(`} else {`, 2)
        l(`return undefined as any as ReturnType<Exclude<typeof ctx.current.${fn.TargetCurrent}, null>["${fn.TargetFn}"]>`, 3)
        l(`}`, 2)
        l(`}`, 1)
        envfns.push(fn.Name)
      }
    })

    l(`return {`, 1)
    schema.Types.forEach((t) => {
      l(`${t.Name},`, 2)
      l(`${t.Name}Handler,`, 2)
    })
    l(`envref,`, 2)
    l(`obj,`, 2)
    l(`c,`, 2)
    chainfns.forEach((fn) => {
      l(`${fn},`, 2)
    })
    envfns.forEach((fn) => {
      l(`${fn},`, 2)
    })
    l(`}`, 1)

    l(`}`)
  }

  //gen/envx.ts
  {
    use(envxal)
    l(`import Ext from "../env.js"`)

    //d
    l(`declare global {`)
    l(`namespace ${namespace} {`, 1)
    l(`type ${schema.Name}Env = ReturnType<typeof ${schema.Name}>`, 2)
    l(`}`, 1)
    l(`}`)

    //env
    l(`export const ${schema.Name}Env = {`)
    a(`LinedEnvFns: [`, 1)
    a(schema.LinedEnvFns.map(fn => `"${fn}"`).join(", "))
    l(`],`)
    a(`LinedChianFns: [`, 1)
    a(schema.LinedChianFns.map(fn => `"${fn}"`).join(", "))
    l(`],`)
    l("}")

    l(`export function ${schema.Name}() {`)
    l(`const ext = Ext()`, 1)

    schema.LinedEnvFns.forEach((fn) => {
      l(`function ${fn}_lined(line: number, ...args: Parameters<typeof ext.${fn}>) {`, 1)
      l(`const obj = ext.${fn}(...args)`, 2)
      l(`obj.obj.OBJSLine = line`, 2)
      l(`return obj`, 2)
      l(`}`, 1)
    })

    l(`const env = {`, 1)
    l(`...ext,`, 2)
    schema.LinedEnvFns.forEach((fn) => {
      l(`${fn}_lined,`, 2)
    })
    l(`}`, 1)
    l(`ext.envref.r = env`, 1)
    l(`return env`, 1)
    l(`}`)
  }

  return {
    env: envb.join(""),
    envx: envxb.join(""),
    types: typesb.join(""),
    typesx: typesxb.join(""),
    index: `import * as Lib from "./envx.js"
declare global {
  var ${namespace}: typeof Lib
}
global.${namespace} = Lib`,
    typese: typeseb.join(""),
    enve: `import Base from "./gen/env.js"
declare global {
  namespace ${namespace} {
  }
}
export default function ${schema.Name}() {
  const base = Base()
  return {
    ...base,
  }
}`,
  }
}