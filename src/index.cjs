"use strict";

const SERIES = ["iQ-R", "iQ-F", "MX-R", "MX-F", "CR800"];

const IQ_R_MODELS = [
  "R00CPU", "R01CPU", "R02CPU", "R04CPU", "R04ENCPU", "R08CPU", "R08ENCPU",
  "R16CPU", "R16ENCPU", "R32CPU", "R32ENCPU", "R120CPU", "R120ENCPU"
];
const IQ_F_MODELS = ["FX5S", "FX5UJ", "FX5U", "FX5UC"];
const MX_R_MODELS = ["MXR300-16", "MXR300-32", "MXR300-64", "MXR500-128", "MXR500-256"];
const MX_F_MODELS = [
  "MXF100-8-N32", "MXF100-8-P32", "MXF100-16-N32", "MXF100-16-P32", "MXF100-X32",
  "MXF100-Y32N", "MXF100-Y32P", "MXF100-H32N", "MXF100-H32P", "MXF100-Y16R"
];
const CR800_MODELS = ["CR800-R", "CR800-D", "CR800-Q"];

const MODEL_LISTS = {
  "iQ-R": IQ_R_MODELS,
  "iQ-F": IQ_F_MODELS,
  "MX-R": MX_R_MODELS,
  "MX-F": MX_F_MODELS,
  CR800: CR800_MODELS
};

const BIT_PREFIXES = new Set(["X", "DX", "Y", "DY", "M", "L", "B", "F", "SB", "V", "S", "SM", "FX", "FY"]);
const WORD_BIT_IQF = new Set(["D", "SD", "W", "SW", "R", "G"]);
const WORD_BIT_R = new Set(["D", "SD", "W", "SW", "R", "ZR", "RD", "G", "JW", "JSW"]);
const TIMER_ALIAS = {
  TS: ["T", "contact"], TC: ["T", "coil"], TN: ["T", "current"],
  STS: ["ST", "contact"], STC: ["ST", "coil"], STN: ["ST", "current"],
  LTS: ["LT", "contact"], LTC: ["LT", "coil"], LTN: ["LT", "current"],
  LSTS: ["LST", "contact"], LSTC: ["LST", "coil"], LSTN: ["LST", "current"],
  CS: ["C", "contact"], CC: ["C", "coil"], CN: ["C", "current"],
  LCS: ["LC", "contact"], LCC: ["LC", "coil"], LCN: ["LC", "current"]
};

const IQF_MAX_COMMON = {
  X: 0o1777, Y: 0o1777, M: 32767, L: 32767, B: 0x7fff, F: 32767, SB: 0x7fff,
  S: 4095, T: 1023, ST: 1023, C: 1023, LC: 1023, D: 7999, W: 0x7fff,
  SW: 0x7fff, R: 32767, ER: 32767, SM: 9999, SD: 9999, Z: 23, LZ: 11, N: 14
};
const IQF_MAX_UJ = {
  ...IQF_MAX_COMMON,
  M: 7679, L: 7679, B: 0x7ff, F: 127, SB: 0x7ff, T: 511, ST: 15,
  C: 255, LC: 63, W: 0x3ff, SW: 0x3ff, Z: 19, LZ: 1
};

const IQR_DEFAULT_LOW = {
  X: 0x1fff, Y: 0x1fff, M: 8191, B: 0x1fff, F: 2047, SB: 0x7ff, V: 2047,
  S: -1, T: 2047, ST: -1, LT: -1, LST: -1, C: 1023, LC: -1, D: 12287,
  W: 0x1fff, SW: 0x7ff, L: 8191, FX: 0xf, FY: 0xf, FD: 4, SM: 4095, SD: 4095,
  Z: 19, LZ: 1, R: -1, ZR: -1, RD: 524287, N: 14, P: 8191, I: 1023, BL: 127, TR: -1
};
const IQR_DEFAULT_HIGH = {
  ...IQR_DEFAULT_LOW,
  X: 0x2fff, Y: 0x2fff, M: 12287, T: 1023, LT: 1023, C: 511, LC: 511,
  D: 18431, BL: 319
};
const IQR_MAX = {
  X: 0x2fff, Y: 0x2fff, M: 161882111, B: 0x9a61fff, F: 32767, SB: 0x9a61fff,
  V: 32767, S: 16383, T: 8993439, ST: 8993439, LT: 2529407, LST: 2529407,
  C: 8993439, LC: 4761215, D: 10117631, W: 0x9a61ff, SW: 0x9a61ff, L: 32767,
  FX: 0xf, FY: 0xf, FD: 4, SM: 4095, SD: 4095, Z: 23, LZ: 11,
  R: 32767, ZR: 10117631, RD: 1048575, N: 14, P: 32767, I: 1023, BL: 319, TR: 0
};

const MXR_DEFAULT = {
  X: 0x2fff, Y: 0x2fff, M: 65535, B: 0x7fff, F: 2047, SB: 0x7ff, V: 2047,
  T: 1023, ST: -1, LT: 4095, LST: -1, C: 511, LC: 511, D: 65535,
  W: 0x7fff, SW: 0x7ff, L: 8191, FX: 0xf, FY: 0xf, FD: 4, SM: 4495, SD: 4495,
  Z: 23, LZ: 11, R: -1, ZR: -1, RD: 1048575, N: 14, P: 8191, I: 1023
};
const MXR_MAX = {
  ...MXR_DEFAULT,
  M: 167747583, B: 0x9ff9fff, F: 32767, SB: 0x9ff9fff, V: 32767,
  T: 9319295, ST: 9319295, LT: 2621055, LST: 2621055, C: 9319295,
  LC: 4933727, D: 10484223, W: 0x9ff9ff, SW: 0x9ff9ff, L: 32767,
  R: 32767, ZR: 10484223, RD: 4194303, P: 16383
};

const MXF_DEFAULT = {
  X: 0x2fff, Y: 0x2fff, M: 65535, B: 0x7fff, F: 2047, SB: 0x7ff, V: 2047,
  T: 1023, ST: -1, LT: 4095, LST: -1, C: 511, LC: 511, D: 65535,
  W: 0x7fff, SW: 0x7ff, L: 8191, FX: 0xf, FY: 0xf, FD: 4, SM: 9999, SD: 9999,
  Z: 23, LZ: 11, R: -1, ZR: -1, RD: 131071, N: 14, P: 8191, I: 255
};
const MXF_MAX = {
  ...MXF_DEFAULT,
  M: 67084287, B: 0x3ff9fff, F: 32767, SB: 0x3ff9fff, V: 32767,
  T: 3726879, ST: 3726879, LT: 1048191, LST: 1048191, C: 3726879,
  LC: 1973055, D: 4192767, W: 0x3ff9ff, SW: 0x3ff9ff, L: 32767,
  R: 32767, ZR: 4192767, RD: 262143, P: 16383
};

const RADIX = {
  X: "series-x", DX: "series-x", Y: "series-x", DY: "series-x", B: 16, SB: 16, W: 16, SW: 16, FX: 16, FY: 16,
  M: 10, L: 10, F: 10, V: 10, S: 10, T: 10, ST: 10, LT: 10, LST: 10,
  C: 10, LC: 10, D: 10, R: 10, ER: 10, ZR: 10, RD: 10, SM: 10, SD: 10,
  FD: 10, Z: 10, LZ: 10, N: 10, P: 10, I: 10, BL: 10, TR: 10
};

const CONFIGURABLE = new Set([
  "M", "L", "B", "F", "SB", "V", "S", "T", "ST", "LT", "LST", "C", "LC",
  "D", "W", "SW", "R", "ZR", "RD", "Z", "LZ", "P", "BL", "TR"
]);

const SOURCES = {
  "iQ-F": { manual: "JY997D54301AF", pages: [57, 69, 70, 76, 89] },
  "iQ-R": { manual: "SH-082487-J", pages: [65, 408, 409, 410, 435, 436] },
  "MX-R": { manual: "SH-082640-D", pages: [350, 351, 352, 380, 381] },
  "MX-F": { manual: "SH-082633-E", pages: [277, 416, 417, 418] },
  CR800: { manual: "BFP-A3477-AB", pages: [489, 490, 491, 618, 619, 654, 655, 656, 657] }
};

const CR800_RULES = {
  "CR800-R": {
    direct: { X: [0, 0xfff], Y: [0, 0xfff], M: [0, 18431], D: [0, 5119], SM: [0, 4095], SD: [0, 4095] },
    cpu: { G: { units: [0, 1, 2, 3], range: [0, 524287] }, HG: { units: [0, 1, 2, 3], range: [0, 12287] } }
  },
  "CR800-D": {
    direct: { X: [0, 0x1fff], Y: [0, 0x1fff], D: [0, 5119], SM: [0, 4095], SD: [0, 4095] },
    cpu: { HG: { units: [0, 1], range: [0, 2047] } }
  },
  "CR800-Q": {
    direct: { X: [0, 0xfff], Y: [0, 0xfff], M: [0, 18431], D: [0, 5119], SM: [0, 2047], SD: [0, 2047] },
    cpu: { G: { units: [0, 1, 2, 3], range: [10000, 24335] } }
  }
};

const CR800_FEATURE_NAMES = new Set([
  "qxyread", "iqmem", "parallelIoUnit", "parallelIoInterface", "gotLink",
  "profibus", "ccLink", "ccLinkIef"
]);

const CR800_ALLOCATION_LABELS = {
  qxyread: "sequencer I/O unit direct control (QXYREAD)",
  iqmem: "CPU/shared-memory extension (IQMEM)",
  ddevvl: "sequencer device allocation (DDEVVL*)",
  parallelIoUnit: "parallel I/O unit",
  parallelIoInterface: "parallel I/O interface",
  gotLink: "GOT link",
  profibus: "PROFIBUS",
  ccLink: "CC-Link",
  ccLinkIef: "CC-Link IE Field"
};

class MelDeviceError extends Error {
  constructor(message, result) {
    super(message);
    this.name = "MelDeviceError";
    this.code = result.code;
    this.result = result;
  }
}

function canonicalSeries(value) {
  if (typeof value !== "string") return null;
  const compact = value.normalize("NFKC").trim().toUpperCase().replace(/[\s_-]/g, "");
  return ({ IQR: "iQ-R", IQF: "iQ-F", MXR: "MX-R", MXF: "MX-F", CR800: "CR800", CR800R: "CR800", CR800D: "CR800", CR800Q: "CR800" })[compact] || null;
}

function cr800ModelFromSeries(value) {
  if (typeof value !== "string") return null;
  const compact = value.normalize("NFKC").trim().toUpperCase().replace(/[\s_-]/g, "");
  return ({ CR800R: "CR800-R", CR800D: "CR800-D", CR800Q: "CR800-Q" })[compact] || null;
}

function normalizeModel(series, value) {
  const s = canonicalSeries(series);
  if (!s) return null;
  if (s === "CR800" && value == null) return cr800ModelFromSeries(series);
  if (typeof value !== "string") return null;
  const model = value.normalize("NFKC").trim().toUpperCase().replace(/\s+/g, "");
  if (s === "iQ-R") {
    const match = /^R(00|01|02|04|08|16|32|120)(EN)?(?:CPU)?$/.exec(model);
    if (!match) return null;
    const canonical = `R${match[1]}${match[2] || ""}CPU`;
    return IQ_R_MODELS.includes(canonical) ? canonical : null;
  }
  if (s === "iQ-F") {
    for (const family of ["FX5UC", "FX5UJ", "FX5U", "FX5S"]) {
      if (model === family || model.startsWith(`${family}-`)) return family;
    }
    return null;
  }
  if (s === "MX-R") {
    if (model === "MXR300" || model === "MXR500") return model;
    return MX_R_MODELS.includes(model) ? model : null;
  }
  if (s === "CR800") {
    const compact = String(value).normalize("NFKC").trim().toUpperCase().replace(/[\s_-]/g, "");
    return ({ R: "CR800-R", D: "CR800-D", Q: "CR800-Q", CR800R: "CR800-R", CR800D: "CR800-D", CR800Q: "CR800-Q" })[compact] || null;
  }
  if (model === "MXF100") return model;
  return MX_F_MODELS.includes(model) ? model : null;
}

function getSupportedModels(series) {
  const s = canonicalSeries(series);
  const inferred = cr800ModelFromSeries(series);
  if (inferred) return [inferred];
  return s ? [...MODEL_LISTS[s]] : [];
}

function normalizeDevice(value) {
  if (typeof value !== "string") return null;
  return value.normalize("NFKC").trim().replace(/[¥￥]/g, "\\").toUpperCase();
}

function invalid(input, series, model, mode, code, message, extra = {}) {
  return {
    valid: false,
    input,
    normalized: extra.normalized ?? null,
    series: series ?? null,
    model: model ?? null,
    mode,
    code,
    message,
    configurationDependent: false,
    source: series ? SOURCES[series] : null,
    ...extra
  };
}

function radixFor(series, prefix) {
  const radix = RADIX[prefix];
  if (radix === "series-x") return series === "iQ-F" ? 8 : 16;
  return radix || 10;
}

function parseNumber(text, radix) {
  const pattern = radix === 16 ? /^[0-9A-F]+$/ : radix === 8 ? /^[0-7]+$/ : /^\d+$/;
  if (!pattern.test(text)) return null;
  const value = Number.parseInt(text, radix);
  return Number.isSafeInteger(value) ? value : null;
}

function parseDirect(text, series) {
  const timerPrefixes = Object.keys(TIMER_ALIAS).sort((a, b) => b.length - a.length);
  for (const alias of timerPrefixes) {
    if (!text.startsWith(alias)) continue;
    const addressText = text.slice(alias.length);
    const address = parseNumber(addressText, 10);
    if (address !== null) {
      const [prefix, timerPart] = TIMER_ALIAS[alias];
      return { kind: "direct", prefix, notationPrefix: alias, address, addressText, radix: 10, timerPart };
    }
  }
  const prefixes = Object.keys(RADIX).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (!text.startsWith(prefix)) continue;
    const addressText = text.slice(prefix.length);
    const radix = radixFor(series, prefix);
    const address = parseNumber(addressText, radix);
    if (address !== null) return { kind: "direct", prefix, notationPrefix: prefix, address, addressText, radix };
  }
  return null;
}

function parseBase(text, series) {
  let match = /^U3E([0-9A-F]+)\\(HG|G)(\d+)$/.exec(text);
  if (match) return {
    kind: "cpu-buffer", prefix: match[2] === "HG" ? "HG" : "G", cpu: Number.parseInt(match[1], 16),
    address: Number.parseInt(match[3], 10), addressText: match[3], radix: 10
  };
  match = /^U([0-9A-F]+)\\G(\d+)$/.exec(text);
  if (match) return {
    kind: "unit", prefix: "G", unit: Number.parseInt(match[1], 16), address: Number.parseInt(match[2], 10),
    addressText: match[2], radix: 10
  };
  match = /^J(\d+)\\(SB|SW|X|Y|B|W)([0-9A-F]+)$/.exec(text);
  if (match) return {
    kind: "link", prefix: `J${match[2]}`, network: Number.parseInt(match[1], 10),
    address: Number.parseInt(match[3], 16), addressText: match[3], radix: 16
  };
  return parseDirect(text, series);
}

function parseDevice(value, options = {}) {
  const series = canonicalSeries(options.series);
  if (!series || typeof value !== "string") return null;
  const inputMode = options.inputMode || "exact";
  const normalized = inputMode === "friendly" ? normalizeDevice(value) : value;
  if (!normalized || (inputMode === "exact" && normalized !== normalizeDevice(normalized))) return null;
  if (/\s/.test(normalized)) return null;

  let rest = normalized;
  let local = false;
  let digit = null;
  let indirect = false;
  if (rest.startsWith("#")) { local = true; rest = rest.slice(1); }
  const digitMatch = /^K([1-8])/.exec(rest);
  if (digitMatch) { digit = Number.parseInt(digitMatch[1], 10); rest = rest.slice(2); }
  if (rest.startsWith("@")) { indirect = true; rest = rest.slice(1); }

  let parsed = parseBase(rest, series);
  let bit = null;
  let index = null;
  let indexOrder = null;

  if (!parsed) {
    const candidates = [
      [/^(.+?)(LZ|Z)(\d+)\.([0-9A-F])$/, "index-bit"],
      [/^(.+?)\.([0-9A-F])(LZ|Z)(\d+)$/, "bit-index"],
      [/^(.+?)\.([0-9A-F])$/, "bit"],
      [/^(.+?)(LZ|Z)(\d+)$/, "index"]
    ];
    for (const [pattern, order] of candidates) {
      const match = pattern.exec(rest);
      if (!match) continue;
      let baseText;
      if (order === "index-bit") {
        baseText = match[1]; index = { type: match[2], number: Number.parseInt(match[3], 10) }; bit = Number.parseInt(match[4], 16);
      } else if (order === "bit-index") {
        baseText = match[1]; bit = Number.parseInt(match[2], 16); index = { type: match[3], number: Number.parseInt(match[4], 10) };
      } else if (order === "bit") {
        baseText = match[1]; bit = Number.parseInt(match[2], 16);
      } else {
        baseText = match[1]; index = { type: match[2], number: Number.parseInt(match[3], 10) };
      }
      parsed = parseBase(baseText, series);
      if (parsed) { indexOrder = order; break; }
      bit = null; index = null;
    }
  }
  if (!parsed) return null;
  return { ...parsed, input: value, normalized, local, digit, indirect, bit, index, indexOrder };
}

function limitsFor(series, model, mode) {
  if (series === "iQ-F") {
    const max = model === "FX5UJ" ? IQF_MAX_UJ : IQF_MAX_COMMON;
    const defaults = mode === "maximum" ? max : { ...max, Z: 19, LZ: 1 };
    return { limits: defaults, maximum: max, defaultKnown: false };
  }
  if (series === "iQ-R") {
    const low = ["R00CPU", "R01CPU", "R02CPU"].includes(model);
    const maximum = {
      ...IQR_MAX,
      X: low ? 0x1fff : 0x2fff,
      Y: low ? 0x1fff : 0x2fff,
      P: model.startsWith("R120") ? 32767 : 16383
    };
    return { limits: mode === "maximum" ? maximum : (low ? IQR_DEFAULT_LOW : IQR_DEFAULT_HIGH), maximum, defaultKnown: true };
  }
  if (series === "MX-R") {
    const is500 = model === "MXR500" || model.startsWith("MXR500-");
    const defaults = { ...MXR_DEFAULT, P: is500 ? 16383 : 8191 };
    const maximum = { ...MXR_MAX, P: is500 ? 32767 : 16383 };
    return { limits: mode === "maximum" ? maximum : defaults, maximum, defaultKnown: true };
  }
  return { limits: mode === "maximum" ? MXF_MAX : MXF_DEFAULT, maximum: MXF_MAX, defaultKnown: true };
}

function validateModifiers(parsed, series, limits) {
  if (parsed.local && (series === "iQ-F" || !["M", "L", "B", "F", "V", "S", "T", "ST", "LT", "LST", "C", "LC", "D", "W", "R", "ZR", "Z", "LZ", "P"].includes(parsed.prefix))) {
    return ["LOCAL_NOT_SUPPORTED", "This device cannot use the local-device # prefix."];
  }
  if (parsed.digit !== null && (!BIT_PREFIXES.has(parsed.prefix) || parsed.bit !== null || parsed.indirect)) {
    return ["DIGIT_MODIFIER_NOT_SUPPORTED", "K1-K8 digit designation is only valid for a bit device."];
  }
  const wordBitSet = series === "iQ-F" ? WORD_BIT_IQF : WORD_BIT_R;
  if (parsed.bit !== null && !wordBitSet.has(parsed.prefix)) {
    return ["BIT_SELECTION_NOT_SUPPORTED", `.${parsed.bit.toString(16).toUpperCase()} bit selection is not supported for ${parsed.prefix}.`];
  }
  if (parsed.indirect && parsed.digit !== null) return ["MODIFIER_COMBINATION", "Digit and indirect modifiers cannot be combined."];
  if (parsed.indirect && !wordBitSet.has(parsed.prefix)) return ["INDIRECT_NOT_SUPPORTED", "@ indirect addressing requires a supported word device."];
  if (parsed.index) {
    const indexLimit = limits[parsed.index.type];
    if (indexLimit === undefined || parsed.index.number > indexLimit) return ["INDEX_OUT_OF_RANGE", `${parsed.index.type}${parsed.index.number} is outside the selected mode range.`];
    if (series === "iQ-F" && parsed.index.type === "LZ" && !["G"].includes(parsed.prefix)) {
      return ["INDEX_NOT_SUPPORTED", "For iQ-F, LZ indexing is limited to unit access devices (and constants, which this package does not classify as devices)."];
    }
  }
  return null;
}

function configuredLimit(prefix, options) {
  const points = options.configuredPoints && options.configuredPoints[prefix];
  return Number.isInteger(points) && points >= 0 ? points - 1 : null;
}

function validateCr800Features(features) {
  if (features === undefined) return null;
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return "cr800Features must be an object when supplied.";
  }
  for (const [name, state] of Object.entries(features)) {
    if (name === "ddevvl") {
      if (!["disabled", "program-external", "status", "mixed"].includes(state)) {
        return "cr800Features.ddevvl must be disabled, program-external, status, or mixed.";
      }
      continue;
    }
    if (!CR800_FEATURE_NAMES.has(name)) return `Unknown CR800 feature: ${name}.`;
    if (typeof state !== "boolean") return `cr800Features.${name} must be boolean.`;
  }
  return null;
}

function inRange(address, start, end) {
  return address >= start && address <= end;
}

function cr800Access(parsed, model, features = {}) {
  const rules = [];
  const warnings = [];
  const addReadOnly = (allocation, state) => rules.push({ allocation, state, readOnly: true });
  const addReadWrite = (allocation, state) => rules.push({ allocation, state, readOnly: false });
  const feature = (name, readOnly = true) => {
    const state = features[name];
    (readOnly ? addReadOnly : addReadWrite)(CR800_ALLOCATION_LABELS[name], state);
  };

  if (parsed.kind === "direct") {
    const { prefix, address } = parsed;

    if ((model === "CR800-R" || model === "CR800-Q") && ["X", "Y"].includes(prefix)) {
      feature("qxyread");
    }
    if (prefix === "X" && inRange(address, 0x384, 0x38b)) {
      addReadOnly("hand I/O (always active)", true);
    }

    if (model === "CR800-D") {
      if (["X", "Y"].includes(prefix) && inRange(address, 0, 0xff)) feature("parallelIoUnit");
      if (["X", "Y"].includes(prefix) && inRange(address, 0, 0x3f)) feature("parallelIoInterface");
      if (prefix === "X" && inRange(address, 0, 0xff)) feature("gotLink", false);
      if (prefix === "Y" && inRange(address, 0, 0xff)) feature("gotLink");
      if (prefix === "X" && inRange(address, 0x320, 0x327)) addReadOnly("STOP/SKIP I/O (always active)", true);
      if (["X", "Y"].includes(prefix) && inRange(address, 0x7d0, 0x13cf)) feature("profibus");
      if (["X", "Y"].includes(prefix) && inRange(address, 0x1770, 0x1f6f)) {
        feature("ccLink");
        feature("ccLinkIef");
      }
      if (prefix === "D" && inRange(address, 0, 511)) feature("ccLink");
      if (prefix === "D" && inRange(address, 0, 2047)) feature("ccLinkIef");
    }

    if (prefix === "D" && inRange(address, 4096, 5119)) {
      const state = features.ddevvl;
      if (state === "status") addReadOnly(CR800_ALLOCATION_LABELS.ddevvl, true);
      else if (state === "program-external") addReadWrite(CR800_ALLOCATION_LABELS.ddevvl, true);
      else if (state === "mixed") {
        rules.push({ allocation: CR800_ALLOCATION_LABELS.ddevvl, state: undefined, readOnly: true });
        warnings.push("DDEVVL* contains mixed variable types; program external variables are read/write and status variables are read-only.");
      } else if (state === undefined) {
        rules.push({ allocation: CR800_ALLOCATION_LABELS.ddevvl, state: undefined, readOnly: true });
      }
    }
  }

  if (parsed.kind === "cpu-buffer") {
    const { prefix, cpu, address } = parsed;
    if (model === "CR800-R" && prefix === "HG") {
      if (cpu >= 1 && cpu <= 3 && inRange(address, 0, 511)) {
        addReadOnly("sequencer link input (always active)", true);
      }
      if (cpu >= 1 && cpu <= 3 && inRange(address, 512, 1023)) feature("iqmem");
    }
    if (model === "CR800-D" && prefix === "HG" && cpu === 1) {
      if (inRange(address, 0, 511)) addReadOnly("sequencer link input (always active)", true);
      if (inRange(address, 512, 1023)) feature("iqmem");
    }
    if (model === "CR800-Q" && prefix === "G" && cpu >= 1 && cpu <= 3) {
      if (inRange(address, 10000, 10511)) addReadOnly("sequencer link input (always active)", true);
      if (inRange(address, 10512, 11023) && features.iqmem !== false) {
        rules.push({ allocation: CR800_ALLOCATION_LABELS.iqmem, state: undefined, readOnly: true });
        warnings.push("Table 6-16 prints U3En\\G512-G1023 for this IQMEM read-only area, while tables 6-13, 5-3/5-4 and 6-4 use the G10000-based CR800-Q map. Access is therefore reported as configuration-dependent instead of inferred as read-only.");
      }
    }
  }

  const active = rules.filter(rule => rule.state === true);
  const possible = rules.filter(rule => rule.state === undefined);
  const activeReadOnly = active.filter(rule => rule.readOnly);
  const possibleReadOnly = possible.filter(rule => rule.readOnly);
  let access = "read-write";
  if (activeReadOnly.length) access = "read-only";
  else if (possibleReadOnly.length) access = "configuration-dependent";

  return {
    access,
    activeAllocations: [...new Set(active.map(rule => rule.allocation))],
    possibleAllocations: [...new Set(possible.map(rule => rule.allocation))],
    warnings
  };
}

function analyzeCr800(value, parsed, series, model, mode, normalized, operation, features) {
  const rules = CR800_RULES[model];
  const hasModifier = parsed.local || parsed.digit !== null || parsed.indirect || parsed.bit !== null || parsed.index !== null;
  if (hasModifier) {
    return invalid(value, series, model, mode, "MODIFIER_NOT_SUPPORTED", "The CR800 device table defines direct device notation without bit, digit, indirect, index, or local modifiers.", { normalized, parsed });
  }

  if (parsed.kind === "direct") {
    const range = rules.direct[parsed.prefix];
    if (!range) return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", `${parsed.prefix} is not supported by ${model}.`, { normalized, parsed });
    if (mode !== "syntax" && (parsed.address < range[0] || parsed.address > range[1])) {
      return invalid(value, series, model, mode, "ADDRESS_OUT_OF_RANGE", `${parsed.notationPrefix}${parsed.addressText} is outside the fixed ${model} range.`, { normalized, parsed });
    }
  } else {
    if (parsed.kind !== "cpu-buffer") {
      return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", `${parsed.kind} device notation is not listed for ${model}.`, { normalized, parsed });
    }
    const cpuRule = rules.cpu[parsed.prefix];
    if (!cpuRule) return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", `U3En\\${parsed.prefix} is not supported by ${model}.`, { normalized, parsed });
    if (!cpuRule.units.includes(parsed.cpu)) {
      return invalid(value, series, model, mode, "CPU_NUMBER_OUT_OF_RANGE", `U3E${parsed.cpu.toString(16).toUpperCase()} is not a supported CPU selector for ${model}.`, { normalized, parsed });
    }
    if (mode !== "syntax" && (parsed.address < cpuRule.range[0] || parsed.address > cpuRule.range[1])) {
      const qTableConflict = model === "CR800-Q" && parsed.prefix === "G"
        && parsed.cpu >= 1 && parsed.cpu <= 3 && inRange(parsed.address, 512, 1023);
      return invalid(value, series, model, mode, qTableConflict ? "MANUAL_RANGE_CONFLICT" : "ADDRESS_OUT_OF_RANGE",
        qTableConflict
          ? "Table 6-16 prints this IQMEM allocation, but it is outside the fixed CR800-Q range in table 6-13 and conflicts with the G10000-based maps in sections 5.2.1 and 6.2.2; it is conservatively rejected."
          : `G/HG address is outside the fixed ${model} range ${cpuRule.range[0]}-${cpuRule.range[1]}.`,
        { normalized, parsed });
    }
  }

  if (mode === "syntax") {
    return {
      valid: true, input: value, normalized, series, model, mode, operation, code: "VALID",
      message: "Valid CR800 device syntax; range and access were not evaluated in syntax mode.",
      configurationDependent: false, access: "not-evaluated", operationAllowed: null,
      activeAllocations: [], possibleAllocations: [], warnings: [], parsed, source: SOURCES[series]
    };
  }

  const allocation = cr800Access(parsed, model, features);
  const operationAllowed = operation === "read"
    ? true
    : operation === "write"
      ? allocation.access === "read-write" ? true : allocation.access === "read-only" ? false : null
      : null;
  const warnings = [...allocation.warnings];
  if (allocation.access === "read-only") {
    warnings.push(`The active allocation is read-only: ${allocation.activeAllocations.join(", ")}. Writes are ignored.`);
  } else if (allocation.access === "configuration-dependent") {
    warnings.push(`Write access depends on the controller configuration: ${allocation.possibleAllocations.join(", ")}.`);
  }
  return {
    valid: true, input: value, normalized, series, model, mode, operation, code: "VALID",
    message: operation === "write" && operationAllowed === false
      ? "Valid device notation and fixed range, but this address is read-only for the active CR800 allocation."
      : operation === "write" && operationAllowed === null
        ? "Valid device notation and fixed range; write access depends on the CR800 feature configuration."
        : "Valid within the fixed CR800 device range.",
    configurationDependent: allocation.access === "configuration-dependent",
    access: allocation.access,
    operationAllowed,
    activeAllocations: allocation.activeAllocations,
    possibleAllocations: allocation.possibleAllocations,
    warnings,
    parsed,
    source: SOURCES[series]
  };
}

function analyzeDevice(value, options = {}) {
  const mode = options.mode || "default";
  const inputMode = options.inputMode || "exact";
  const operation = options.operation || "either";
  if (!["syntax", "default", "maximum", "configured"].includes(mode)) {
    return invalid(value, null, null, mode, "INVALID_MODE", "mode must be syntax, default, maximum, or configured.");
  }
  if (!["exact", "friendly"].includes(inputMode)) {
    return invalid(value, null, null, mode, "INVALID_INPUT_MODE", "inputMode must be exact or friendly.");
  }
  if (!["read", "write", "either"].includes(operation)) {
    return invalid(value, null, null, mode, "INVALID_OPERATION", "operation must be read, write, or either.");
  }
  const series = canonicalSeries(options.series);
  if (!series) return invalid(value, null, null, mode, "UNSUPPORTED_SERIES", `Supported series: ${SERIES.join(", ")}.`);
  const seriesModel = cr800ModelFromSeries(options.series);
  const model = normalizeModel(options.series, options.model ?? seriesModel);
  if (!model) return invalid(value, series, null, mode, "UNSUPPORTED_MODEL", `Unsupported ${series} model: ${String(options.model)}.`);
  if (seriesModel && model !== seriesModel) return invalid(value, series, model, mode, "MODEL_SERIES_MISMATCH", `${String(options.series)} conflicts with model ${model}.`);
  if (series === "CR800") {
    const featureError = validateCr800Features(options.cr800Features);
    if (featureError) return invalid(value, series, model, mode, "INVALID_CR800_FEATURES", featureError);
  }
  const parsed = parseDevice(value, { series, inputMode });
  const normalized = inputMode === "friendly" ? normalizeDevice(value) : (typeof value === "string" ? value : null);
  if (!parsed) return invalid(value, series, model, mode, "INVALID_SYNTAX", "The value is not a supported MELSEC/MELFA device notation.", { normalized });

  if (series === "CR800") return analyzeCr800(value, parsed, series, model, mode, normalized, operation, options.cr800Features);

  if (series === "iQ-F" && ["V", "LT", "LST", "ZR", "RD", "FX", "FY", "FD"].includes(parsed.prefix)) {
    return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", `${parsed.prefix} is not listed as an iQ-F device in the attached manual.`, { normalized, parsed });
  }
  if (series === "iQ-F" && model === "FX5S" && parsed.kind === "unit") {
    return invalid(value, series, model, mode, "MODEL_NOT_SUPPORTED", "FX5S does not support the U\\G unit access device.", { normalized, parsed });
  }
  if (series === "iQ-F" && parsed.kind === "cpu-buffer") {
    return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", "CPU buffer access notation is not listed for iQ-F in the attached manual.", { normalized, parsed });
  }

  const { limits, maximum, defaultKnown } = limitsFor(series, model, mode);
  const modifierError = validateModifiers(parsed, series, limits);
  if (modifierError) return invalid(value, series, model, mode, modifierError[0], modifierError[1], { normalized, parsed });

  if (parsed.kind === "link") {
    if (series === "iQ-F") return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", "Link direct Jn\\ devices are not listed in the iQ-F device table.", { normalized, parsed });
    if (parsed.network < 1 || parsed.network > 239) return invalid(value, series, model, mode, "NETWORK_OUT_OF_RANGE", "Network number must be 1-239.", { normalized, parsed });
    const maxBySeries = series === "iQ-R"
      ? { JX: 0x27fff, JY: 0x27fff, JB: 0x9ffff, JSB: 0x13ff, JW: 0x27ffff, JSW: 0x13ff }
      : series === "MX-F"
        ? { JX: 0xa175, JY: 0xa175, JB: -1, JSB: 0x51ff, JW: 0xa7ff, JSW: 0x51ff }
        : { JX: 0x27fff, JY: 0x27fff, JB: 0x9ffff, JSB: 0x13ff, JW: 0x27ffff, JSW: 0x13ff };
    if (parsed.address > maxBySeries[parsed.prefix]) return invalid(value, series, model, mode, "ADDRESS_OUT_OF_RANGE", "Link-direct address exceeds the controller-level maximum documented for this series.", { normalized, parsed });
    return { valid: true, input: value, normalized, series, model, mode, code: "VALID", message: "Valid link-direct device notation; the actual range depends on the configured network.", configurationDependent: true, parsed, source: SOURCES[series] };
  }

  if (parsed.kind === "unit" || parsed.kind === "cpu-buffer") {
    const maxAddress = parsed.kind === "cpu-buffer"
      ? series === "MX-R" ? 524287 : series === "MX-F" ? 16809983 : 268435455
      : 268435455;
    if (parsed.address > maxAddress) return invalid(value, series, model, mode, "ADDRESS_OUT_OF_RANGE", `Buffer-memory address must be 0-${maxAddress}.`, { normalized, parsed });
    return { valid: true, input: value, normalized, series, model, mode, code: "VALID", message: "Valid access-device notation; existence and actual range depend on the installed unit or CPU buffer.", configurationDependent: true, parsed, source: SOURCES[series] };
  }

  if (mode === "syntax") {
    return { valid: true, input: value, normalized, series, model, mode, code: "VALID", message: "Valid syntax for the selected series and model.", configurationDependent: CONFIGURABLE.has(parsed.prefix), parsed, source: SOURCES[series] };
  }

  const rangePrefix = parsed.prefix === "DX" ? "X" : parsed.prefix === "DY" ? "Y" : parsed.prefix;
  let limit = limits[rangePrefix];
  if (limit === undefined) return invalid(value, series, model, mode, "DEVICE_NOT_SUPPORTED", `${parsed.prefix} is not supported for ${series}.`, { normalized, parsed });
  if (mode === "configured" && CONFIGURABLE.has(rangePrefix)) {
    const configured = configuredLimit(rangePrefix, options);
    if (configured === null) return invalid(value, series, model, mode, "MISSING_CONFIGURATION", `configuredPoints.${rangePrefix} is required in configured mode.`, { normalized, parsed });
    const absolute = maximum[rangePrefix];
    if (absolute !== undefined && configured > absolute) return invalid(value, series, model, mode, "INVALID_CONFIGURATION", `configuredPoints.${rangePrefix} exceeds the documented maximum.`, { normalized, parsed });
    limit = configured;
  }
  if (parsed.address > limit || limit < 0) {
    const potentiallyConfigurable = mode === "default" && maximum[rangePrefix] >= parsed.address && CONFIGURABLE.has(rangePrefix);
    return invalid(value, series, model, mode, potentiallyConfigurable ? "REQUIRES_CONFIGURATION" : "ADDRESS_OUT_OF_RANGE",
      potentiallyConfigurable
        ? `${parsed.notationPrefix || parsed.prefix}${parsed.addressText} is outside the default range but within the documented configurable maximum.`
        : `${parsed.notationPrefix || parsed.prefix}${parsed.addressText} is outside the selected mode range.`,
      { normalized, parsed, configurationDependent: potentiallyConfigurable, suggestedMode: potentiallyConfigurable ? "maximum" : undefined });
  }
  const configurationDependent = mode === "maximum" && CONFIGURABLE.has(rangePrefix)
    || mode === "default" && series === "iQ-F" && CONFIGURABLE.has(rangePrefix) && !defaultKnown;
  return {
    valid: true,
    input: value,
    normalized,
    series,
    model,
    mode,
    code: "VALID",
    message: configurationDependent
      ? "Valid within the documented model/maximum range; confirm the project device-point configuration."
      : "Valid for the selected mode.",
    configurationDependent,
    parsed,
    source: SOURCES[series]
  };
}

function isValidDevice(value, options) {
  return analyzeDevice(value, options).valid;
}

function assertValidDevice(value, options) {
  const result = analyzeDevice(value, options);
  if (!result.valid) throw new MelDeviceError(result.message, result);
  return result;
}

module.exports = {
  MelDeviceError,
  analyzeDevice,
  assertValidDevice,
  getSupportedModels,
  isValidDevice,
  normalizeDevice,
  normalizeModel,
  parseDevice
};
