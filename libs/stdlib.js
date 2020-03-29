export const isset = (o) => ('undefined' !== typeof o);
export const isstr = (s) => ('string' === typeof s);
export const isarray = (a) => Array.isArray(a);
export const isfunc = (f) => ('function' === typeof f);
export const stdFloat = (f) => parseFloat(f || 0);
export const dist = (a, b) => Math.sqrt((a * a) + (b * b));
export const pointDist = (a, b) => dist((a[0] - b[0]), (a[1] - b[1]));
export const objMap = (o, f, t = o) => Object.keys(o).reduce((r, p) => ({ ...r, [p]: f.bind(t)(o[p], p, o) }), {});