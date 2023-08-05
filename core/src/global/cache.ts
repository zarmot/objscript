declare global {
  namespace ObjScript {
    type Cache<T> = T & { r: T }
  }
}
type Cache<T> = ObjScript.Cache<T>
export const CacheHandler: ProxyHandler<any> = {
  get: (t, p) => {
    if (p === "r") {
      return t.r
    } else {
      return t.r?.[p]
    }
  },
  set: (t, p, v) => {
    if (p === "r") {
      t.r = v
    } else {
      if (t.r) {
        t.r[p] = v
      }
    }
    return true
  }
}
export function Cache<T>(): Cache<T> {
  return new Proxy({ r: null as any }, CacheHandler) as any
}