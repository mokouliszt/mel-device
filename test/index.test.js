import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  MelDeviceError,
  analyzeDevice,
  assertValidDevice,
  getSupportedModels,
  isValidDevice,
  normalizeDevice,
  normalizeModel,
  parseDevice
} from "../dist/index.js";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");

test("normalizes model aliases and exact target names", () => {
  assert.equal(normalizeModel("iQ-R", "R00"), "R00CPU");
  assert.equal(normalizeModel("iq_f", "FX5U-32MT/ES"), "FX5U");
  assert.equal(normalizeModel("MX-R", "MXR500-256"), "MXR500-256");
  assert.equal(normalizeModel("MX-F", "MXF100"), "MXF100");
  assert.equal(normalizeModel("iQ-R", "R03"), null);
  assert.ok(getSupportedModels("iQ-R").includes("R120ENCPU"));
  assert.equal(normalizeModel("CR800", "R"), "CR800-R");
  assert.equal(normalizeModel("CR800-D"), "CR800-D");
  assert.deepEqual(getSupportedModels("CR800-Q"), ["CR800-Q"]);
});

test("supports both ESM and CommonJS", () => {
  const options = { series: "iQ-R", model: "R00" };
  assert.equal(isValidDevice("X0", options), true);
  assert.equal(cjs.isValidDevice("X0", options), true);
});

test("uses octal X/Y for iQ-F and hexadecimal X/Y for other series", () => {
  assert.equal(isValidDevice("X1777", { series: "iQ-F", model: "FX5U" }), true);
  assert.equal(isValidDevice("X1780", { series: "iQ-F", model: "FX5U" }), false);
  assert.equal(isValidDevice("X2FFF", { series: "iQ-R", model: "R04" }), true);
  assert.equal(isValidDevice("DX2FFF", { series: "iQ-R", model: "R04" }), true);
  assert.equal(isValidDevice("DY1777", { series: "iQ-F", model: "FX5U" }), true);
});

test("applies FX5UJ-specific limits", () => {
  assert.equal(isValidDevice("M7679", { series: "iQ-F", model: "FX5UJ" }), true);
  assert.equal(isValidDevice("M7680", { series: "iQ-F", model: "FX5UJ" }), false);
  assert.equal(isValidDevice("B7FF", { series: "iQ-F", model: "FX5UJ" }), true);
  assert.equal(isValidDevice("B800", { series: "iQ-F", model: "FX5UJ" }), false);
});

test("validates word bit selection and timer component notation", () => {
  const options = { series: "iQ-F", model: "FX5S" };
  assert.equal(isValidDevice("D0.A", options), true);
  assert.equal(isValidDevice("D0.F", options), true);
  assert.equal(isValidDevice("D0.10", options), false);
  assert.equal(isValidDevice("M0.0", options), false);
  assert.equal(isValidDevice("TS0", options), true);
  assert.equal(parseDevice("LCS12", options).timerPart, "contact");
});

test("default and maximum modes expose configuration boundaries", () => {
  const base = { series: "iQ-R", model: "R00" };
  assert.equal(isValidDevice("D12287", base), true);
  const outsideDefault = analyzeDevice("D12288", base);
  assert.equal(outsideDefault.valid, false);
  assert.equal(outsideDefault.code, "REQUIRES_CONFIGURATION");
  const maximum = analyzeDevice("D12288", { ...base, mode: "maximum" });
  assert.equal(maximum.valid, true);
  assert.equal(maximum.configurationDependent, true);
  assert.equal(isValidDevice("D18431", { series: "iQ-R", model: "R04" }), true);
});

test("configured mode treats point count as count, not final address", () => {
  const options = { series: "MX-F", model: "MXF100", mode: "configured", configuredPoints: { D: 100 } };
  assert.equal(isValidDevice("D99", options), true);
  assert.equal(isValidDevice("D100", options), false);
  const missing = analyzeDevice("M0", { series: "MX-F", model: "MXF100", mode: "configured" });
  assert.equal(missing.code, "MISSING_CONFIGURATION");
});

test("MX default and maximum ranges differ", () => {
  assert.equal(isValidDevice("D65535", { series: "MX-R", model: "MXR300-16" }), true);
  assert.equal(isValidDevice("D65536", { series: "MX-R", model: "MXR300-16" }), false);
  assert.equal(isValidDevice("D65536", { series: "MX-R", model: "MXR300-16", mode: "maximum" }), true);
  assert.equal(isValidDevice("SM4495", { series: "MX-R", model: "MXR300-16" }), true);
  assert.equal(isValidDevice("SM4496", { series: "MX-R", model: "MXR300-16" }), false);
  assert.equal(isValidDevice("P8191", { series: "MX-R", model: "MXR300-16" }), true);
  assert.equal(isValidDevice("P8192", { series: "MX-R", model: "MXR300-16" }), false);
  assert.equal(isValidDevice("P16383", { series: "MX-R", model: "MXR500-128" }), true);
});

test("fixed iQ-R X/Y ranges do not expand in maximum mode", () => {
  assert.equal(isValidDevice("X1FFF", { series: "iQ-R", model: "R00", mode: "maximum" }), true);
  assert.equal(isValidDevice("X2000", { series: "iQ-R", model: "R00", mode: "maximum" }), false);
});

test("friendly input normalization is opt-in", () => {
  const exact = { series: "iQ-F", model: "FX5U" };
  assert.equal(isValidDevice("d0.a", exact), false);
  assert.equal(isValidDevice("  d０．ａ  ", { ...exact, inputMode: "friendly" }), true);
  assert.equal(normalizeDevice(" u1￥g0 "), "U1\\G0");
});

test("validates unit and link access with model conditions", () => {
  assert.equal(isValidDevice("U1\\G0", { series: "iQ-F", model: "FX5S" }), false);
  const unit = analyzeDevice("U1\\G0", { series: "iQ-F", model: "FX5U" });
  assert.equal(unit.valid, true);
  assert.equal(unit.configurationDependent, true);
  assert.equal(isValidDevice("J1\\W0", { series: "iQ-R", model: "R08" }), true);
  assert.equal(isValidDevice("J0\\W0", { series: "iQ-R", model: "R08" }), false);
});

test("separates the CPU buffer G area from the HG cyclic-transmission area", () => {
  const options = { series: "iQ-R", model: "R08CPU" };
  assert.equal(isValidDevice("U3E0\\G268435455", options), true);
  assert.equal(isValidDevice("U3E0\\G268435456", options), false);
  assert.equal(isValidDevice("U3E0\\HG12287", options), true);
  assert.equal(analyzeDevice("U3E0\\HG12288", options).code, "ADDRESS_OUT_OF_RANGE");
  assert.equal(analyzeDevice("U3E0\\HG268435455", options).code, "ADDRESS_OUT_OF_RANGE");
});

test("restricts CPU buffer selectors to the documented CPU numbers", () => {
  const iqr = { series: "iQ-R", model: "R08CPU" };
  assert.equal(isValidDevice("U3E3\\G0", iqr), true);
  assert.equal(analyzeDevice("U3E4\\G0", iqr).code, "CPU_NUMBER_OUT_OF_RANGE");
  assert.equal(analyzeDevice("U3EF\\HG0", iqr).code, "CPU_NUMBER_OUT_OF_RANGE");

  const mxr = { series: "MX-R", model: "MXR300-16" };
  assert.equal(isValidDevice("U3E0\\G524287", mxr), true);
  assert.equal(isValidDevice("U3E0\\G524288", mxr), false);
  assert.equal(analyzeDevice("U3E1\\G0", mxr).code, "CPU_NUMBER_OUT_OF_RANGE");

  const mxf = { series: "MX-F", model: "MXF100" };
  assert.equal(isValidDevice("U3E0\\G16809983", mxf), true);
  assert.equal(analyzeDevice("U3E1\\G0", mxf).code, "CPU_NUMBER_OUT_OF_RANGE");
});

test("rejects the HG area for series whose manuals do not list it", () => {
  assert.equal(analyzeDevice("U3E0\\HG0", { series: "MX-R", model: "MXR300-16" }).code, "DEVICE_NOT_SUPPORTED");
  assert.equal(analyzeDevice("U3E0\\HG0", { series: "MX-F", model: "MXF100" }).code, "DEVICE_NOT_SUPPORTED");
});

test("validates documented unit access head I/O numbers", () => {
  assert.equal(isValidDevice("UFF\\G0", { series: "iQ-R", model: "R08CPU" }), true);
  assert.equal(analyzeDevice("U100\\G0", { series: "iQ-R", model: "R08CPU" }).code, "UNIT_NUMBER_OUT_OF_RANGE");
  assert.equal(isValidDevice("UFE\\G0", { series: "MX-F", model: "MXF100" }), true);
  assert.equal(analyzeDevice("UFF\\G0", { series: "MX-F", model: "MXF100" }).code, "UNIT_NUMBER_OUT_OF_RANGE");
  assert.equal(analyzeDevice("U0\\G0", { series: "MX-F", model: "MXF100" }).code, "UNIT_NUMBER_OUT_OF_RANGE");
  // The iQ-F manual does not state a unit-number range, so it stays unchecked.
  assert.equal(isValidDevice("U1\\G0", { series: "iQ-F", model: "FX5U" }), true);
});

test("parses supported modifier combinations", () => {
  const options = { series: "MX-R", model: "MXR500" };
  assert.equal(isValidDevice("K4M100Z2", options), true);
  assert.equal(isValidDevice("D10Z2.0", options), true);
  assert.equal(isValidDevice("D10.8Z2", options), true);
  assert.equal(isValidDevice("@D10.8", options), true);
  assert.equal(isValidDevice("#M0", options), true);
  assert.equal(isValidDevice("#P0", options), true);
  assert.equal(isValidDevice("K4D0", options), false);
});

test("assertValidDevice throws a structured error", () => {
  assert.throws(
    () => assertValidDevice("D8000", { series: "iQ-F", model: "FX5U" }),
    error => error instanceof MelDeviceError && error.code === "ADDRESS_OUT_OF_RANGE"
  );
});

test("rejects invalid modes, models and constants", () => {
  assert.equal(analyzeDevice("D0", { series: "Q", model: "Q03" }).code, "UNSUPPORTED_SERIES");
  assert.equal(analyzeDevice("D0", { series: "iQ-R", model: "R03" }).code, "UNSUPPORTED_MODEL");
  assert.equal(isValidDevice("K100", { series: "iQ-R", model: "R04" }), false);
});

test("validates fixed CR800-R device ranges", () => {
  const options = { series: "CR800-R" };
  assert.equal(isValidDevice("XFFF", options), true);
  assert.equal(isValidDevice("X1000", options), false);
  assert.equal(isValidDevice("M18431", options), true);
  assert.equal(isValidDevice("M18432", options), false);
  assert.equal(isValidDevice("D5119", options), true);
  assert.equal(isValidDevice("SM4095", options), true);
  assert.equal(isValidDevice("U3E3\\G524287", options), true);
  assert.equal(isValidDevice("U3E0\\G524288", options), false);
  assert.equal(isValidDevice("U3E2\\HG12287", options), true);
  assert.equal(isValidDevice("U3E4\\HG0", options), false);
});

test("validates CR800-D ranges and distinguishes fixed from IQMEM access", () => {
  const options = { series: "CR800", model: "D" };
  assert.equal(isValidDevice("X1FFF", options), true);
  assert.equal(isValidDevice("X2000", options), false);
  assert.equal(isValidDevice("M0", options), false);
  assert.equal(isValidDevice("U3E0\\HG2047", options), true);
  assert.equal(isValidDevice("U3E1\\HG2047", options), true);
  assert.equal(isValidDevice("U3E2\\HG0", options), false);
  assert.equal(isValidDevice("U3E0\\G0", options), false);
  const write = analyzeDevice("U3E1\\HG100", { ...options, operation: "write" });
  assert.equal(write.valid, true);
  assert.equal(write.configurationDependent, false);
  assert.equal(write.access, "read-only");
  assert.equal(write.operationAllowed, false);
  assert.equal(write.warnings.length, 1);

  const unknownIqmem = analyzeDevice("U3E1\\HG600", { ...options, operation: "write" });
  assert.equal(unknownIqmem.access, "configuration-dependent");
  assert.equal(unknownIqmem.operationAllowed, null);
  assert.equal(analyzeDevice("U3E1\\HG600", {
    ...options, operation: "write", cr800Features: { iqmem: false }
  }).access, "read-write");
  assert.equal(analyzeDevice("U3E1\\HG600", {
    ...options, operation: "write", cr800Features: { iqmem: true }
  }).access, "read-only");
  assert.equal(analyzeDevice("U3E1\\HG1500", { ...options, operation: "write" }).access, "read-write");
});

test("validates the lower-bounded CR800-Q CPU shared-memory range", () => {
  const options = { series: "CR800-Q" };
  assert.equal(isValidDevice("SM2047", options), true);
  assert.equal(isValidDevice("SM2048", options), false);
  assert.equal(isValidDevice("U3E0\\G9999", options), false);
  assert.equal(isValidDevice("U3E0\\G10000", options), true);
  assert.equal(isValidDevice("U3E3\\G24335", options), true);
  assert.equal(isValidDevice("U3E3\\G24336", options), false);
  assert.equal(isValidDevice("U3E0\\HG10000", options), false);
  assert.equal(analyzeDevice("U3E1\\G512", options).code, "MANUAL_RANGE_CONFLICT");
});

test("evaluates CR800 allocation access without changing device validity", () => {
  const unknownQxy = analyzeDevice("X100", { series: "CR800-R", operation: "write" });
  assert.equal(unknownQxy.valid, true);
  assert.equal(unknownQxy.access, "configuration-dependent");
  assert.equal(unknownQxy.operationAllowed, null);

  const disabledQxy = analyzeDevice("X100", {
    series: "CR800-R", operation: "write", cr800Features: { qxyread: false }
  });
  assert.equal(disabledQxy.access, "read-write");
  assert.equal(disabledQxy.operationAllowed, true);

  const enabledQxy = analyzeDevice("X100", {
    series: "CR800-R", operation: "write", cr800Features: { qxyread: true }
  });
  assert.equal(enabledQxy.access, "read-only");
  assert.equal(enabledQxy.operationAllowed, false);

  const hand = analyzeDevice("X384", {
    series: "CR800-R", operation: "write", cr800Features: { qxyread: false }
  });
  assert.equal(hand.access, "read-only");
  assert.equal(hand.operationAllowed, false);

  assert.equal(analyzeDevice("X320", {
    series: "CR800-D", operation: "write", cr800Features: {
      parallelIoUnit: false, parallelIoInterface: false, gotLink: false
    }
  }).access, "read-only");
});

test("evaluates CR800 sequencer links and DDEVVL allocations", () => {
  const qInput = analyzeDevice("U3E1\\G10000", { series: "CR800-Q", operation: "write" });
  assert.equal(qInput.access, "read-only");
  assert.equal(qInput.operationAllowed, false);
  assert.equal(analyzeDevice("U3E0\\G10000", { series: "CR800-Q", operation: "write" }).access, "read-write");

  const qConflict = analyzeDevice("U3E1\\G10512", {
    series: "CR800-Q", operation: "write", cr800Features: { iqmem: true }
  });
  assert.equal(qConflict.access, "configuration-dependent");
  assert.match(qConflict.warnings[0], /Table 6-16/);
  assert.equal(analyzeDevice("U3E1\\G10512", {
    series: "CR800-Q", operation: "write", cr800Features: { iqmem: false }
  }).access, "read-write");

  assert.equal(analyzeDevice("D4096", {
    series: "CR800-R", operation: "write", cr800Features: { ddevvl: "status" }
  }).access, "read-only");
  assert.equal(analyzeDevice("D4096", {
    series: "CR800-R", operation: "write", cr800Features: { ddevvl: "program-external" }
  }).access, "read-write");
});

test("keeps CR800 validation conservative and fixed", () => {
  assert.equal(isValidDevice("D0.A", { series: "CR800-R" }), false);
  assert.equal(isValidDevice("@D0", { series: "CR800-R" }), false);
  assert.equal(isValidDevice("D999999", { series: "CR800-R", mode: "syntax" }), true);
  assert.equal(isValidDevice("D5120", { series: "CR800-R", mode: "maximum" }), false);
  assert.equal(isValidDevice("D5120", { series: "CR800-R", mode: "configured", configuredPoints: { D: 99999 } }), false);
  assert.equal(analyzeDevice("D0", { series: "CR800-R", model: "CR800-D" }).code, "MODEL_SERIES_MISMATCH");
  assert.equal(isValidDevice(" ｕ３ｅ０￥ｇ１００００ ", { series: "CR800-Q", inputMode: "friendly" }), true);
  assert.equal(analyzeDevice("D0", {
    series: "CR800-R", cr800Features: { iqmem: "yes" }
  }).code, "INVALID_CR800_FEATURES");
  assert.equal(analyzeDevice("D0", { series: "CR800-R" }).source.manual, "BFP-A3477-AB");
});
