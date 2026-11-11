// 武俠小鎮 W0：鍵排序的 JSON（狀態 hash 用）。
// 規則：物件鍵依 UTF-16 排序；undefined 欄位省略（跟 Convex 存檔一致）；陣列保留順序；
// ArrayBuffer／TypedArray 不允許（historicalLocations 這類畫面用的緩衝區先剔除再算）。

export function canonicalJson(value: unknown): string {
  return encode(value);
}

function encode(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) {
        throw new Error(`canonicalJson: non-finite number ${value}`);
      }
      return JSON.stringify(value);
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'bigint':
      return JSON.stringify(`${value.toString()}n`);
    case 'object': {
      if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        throw new Error('canonicalJson: binary values are not hashed; strip them first');
      }
      if (Array.isArray(value)) {
        return `[${value.map((v) => (v === undefined ? 'null' : encode(v))).join(',')}]`;
      }
      if (value instanceof Map) {
        throw new Error('canonicalJson: serialize Maps before hashing');
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${encode(obj[k])}`).join(',')}}`;
    }
    default:
      throw new Error(`canonicalJson: unsupported type ${typeof value}`);
  }
}
