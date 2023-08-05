declare global {
  namespace ObjSchema {
    type DefineObj = {
      Name: string,
      Types: Array<Type>,
      Fields: Array<Field>,
      EnvFns: Array<EnvFn>,
      LinedEnvFns: string[],
      LinedChianFns: string[],
    }
    type DefineEnv = ReturnType<typeof Define>
    type EnvFn = {
      Name: string
      CurrentSet?: string
      CurrentType?: string

      TargetType?: string
      TargetArray?: string
      TargetCurrent?: string
      TargetFn?: string
    }
    type EnvFnArgs = 
      | [name: string, type: TypeHandler, array: string, current?: string]
      | [name: string, target: string, fn: string, current?: string, ctype?: string]
    type FieldArgs =
      | [name: string, type: "extern", etype: string | TypeHandler, required?: boolean]
      | [name: string, type: "bool"]
      | [name: string, type: "bool", required: boolean, defv?: boolean]
      | [name: string, type: "number"]
      | [name: string, type: "number", required: boolean, defv?: number]
      | [name: string, type: "string"]
      | [name: string, type: "string", required: boolean, defv?: string]
    type FieldType = typeof FieldTypes[number]
  }
}
type Cache<T> = ObjScript.Cache<T>
export const DefineEnv = {
  LinedEnvFns: ["t", "tf"],
  LinedChianFns: ["f"],
}
export function Define() {
  const envref = {} as any
  const obj: ObjSchema.DefineObj = { 
    Name: `Obj`,
    Types: [],
    Fields: [],
    EnvFns: [],
    LinedEnvFns: [],
    LinedChianFns: [],
  }
  const ctx = {
    current: {
      t: <TypeHandler | null>null,
      tf: <FieldHandler | null>null,
    }
  }
  const c = {
    get f() {
      return ObjScript.Cache<FieldHandler>()
    },
    get t() {
      return ObjScript.Cache<TypeHandler>()
    },
  }
  function sname(value: string) {
    obj.Name = value
  }
  function t(...args: ConstructorParameters<typeof Type>) {
    const o = new Type(...args)
    const oh = new TypeHandler(o, envref)
    ctx.current.t = oh
    obj.Types.push(o)
    return oh
  }
  function tf(...args: Parameters<Exclude<typeof ctx.current.t, null>["f"]>) {
    const _t = ctx.current.t
    if (_t) {
      const o = _t.f(...args)
      ctx.current.tf = o
      return o
    } else {
      return undefined as any as ReturnType<Exclude<typeof ctx.current.t, null>["f"]>
    }
  }

  //extend
  function sfield(...args: ObjSchema.FieldArgs) {
    const field = FieldHandler.f(...args)
    obj.Fields.push(field)
    return new FieldHandler(field, envref)
  }
  function slinedcfn(type: TypeHandler, fn: string) {
    type.obj.LinedFns.push(fn)
    obj.LinedChianFns.push(fn)
  }
  function senvfn(...args: ObjSchema.EnvFnArgs) {
    if (typeof(args[1]) === "string") {
      const [Name, TargetCurrent, TargetFn, CurrentSet, CurrentType] = args
      obj.EnvFns.push({ Name, TargetCurrent, TargetFn, CurrentSet, CurrentType })
    } else {
      const [Name, Type, TargetArray, CurrentSet] = args
      obj.EnvFns.push({ Name, TargetType: Type.obj.Name, TargetArray, CurrentSet })
    }
    return {
      withline() {
        obj.LinedEnvFns.push(args[0])
      }
    }
  }

  //lined
  function t_lined(line: number, ...args: Parameters<typeof t>) {
    const obj = t(...args)
    obj.obj.__OBJSLine = line
    return obj
  }
  function tf_lined(line: number, ...args: Parameters<typeof tf>) {
    const obj = tf(...args)
    obj.obj.__OBJSLine = line
    return obj
  }

  const env = {
    obj,
    ctx,
    c,
    t,
    tf,
    sname,
    sfield,
    slinedcfn,
    senvfn,
    t_lined,
    tf_lined,
  }
  envref.r = env
  return env
}
export class Type extends ObjScript.WithLineNumber {
  constructor(
    public Name: string,
    public FnName?: string,
  ) { super() }
  Fields: Array<Field> = []
  WithLineNumber?: boolean
  LinedFns: string[] = []
}
export class TypeHandler {
  constructor(
    public obj: Type,
    public env: ObjScript.Ref<ObjSchema.DefineEnv>,
  ) {}
  c(cache: ObjScript.Cache<TypeHandler>) {
    cache.r = this
    return this
  }
  withline(flag: boolean | undefined = true) {
    this.obj.WithLineNumber = flag
    return this
  }

  //extend
  public f(...args: ObjSchema.FieldArgs) {
    const field = FieldHandler.f(...args)
    this.obj.Fields.push(field)
    return new FieldHandler(field, this.env)
  }

  //lined
  private f_lined(line: number, ...args: Parameters<typeof this.f>) {
    const obj = this.f(...args)
    obj.obj.__OBJSLine = line
    return obj
  }
}
export class Field extends ObjScript.WithLineNumber {
  constructor(
    public Name: string,
    public Type: ObjSchema.FieldType,
  ) { super() }
  TypeName?: string
  Required?: boolean
  DefaultValue?: boolean | number | string
  ArrayFlag?: boolean
  ChainName?: string
  PubCtor?: string
  ManualSet?: boolean
}
export class FieldHandler {
  constructor(
    public obj: Field,
    public env: ObjScript.Ref<ObjSchema.DefineEnv>,
  ) {}
  c(cache: ObjScript.Cache<FieldHandler>) {
    cache.r = this
    return this
  }
  array(flag: boolean | undefined = true) {
    this.obj.ArrayFlag = flag
    return this
  }
  manual(flag: boolean | undefined = true) {
    this.obj.ManualSet = flag
    return this
  }

  //extend
  chain(name?: string) {
    this.obj.ChainName = name ?? this.obj.Name
    return this
  }
  pctor(name?: string) {
    this.obj.PubCtor = name ?? this.obj.Name
    return this
  }
  static f(...args: ObjSchema.FieldArgs) {
    const [name, type] = args
    const field = new Field(name, type)
    if (args[1] === "extern") {
      const etype = args[2]
      if (etype instanceof TypeHandler) {
        field.TypeName = etype.obj.Name
      } else if ((etype as any as Cache<TypeHandler>).r instanceof TypeHandler) {
        field.TypeName = (etype as any as Cache<TypeHandler>).r.obj.Name
      } else {
        field.TypeName = etype
      }
      if (args[3]) {
        field.Required = true
      }
    } else {
      if (args[2]) {
        field.Required = true
        const defv = args[3]
        field.DefaultValue = defv
      }
    }
    return field
  }
}

export const FieldBasicTypes = [
  "bool",
  "number",
  "string",
  "extern",
] as const
export const FieldAdvanceTypes = [
  "i32",
  "f32",
] as const
export const FieldTypes = [
  ...FieldBasicTypes,
  // ...FieldAdvanceTypes,
] as const