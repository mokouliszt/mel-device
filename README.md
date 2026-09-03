# @mokouliszt/mel-device

[日本語](README.ja.md)

A dependency-free npm package for validating Mitsubishi Electric MELSEC/MX controller, MELFA robot controller and FR inverter sequence-function device notation against a specified series and CPU/controller/inverter model.

Supported series are iQ-R, iQ-F, MX-R, MX-F, CR800-R/D/Q, and the FR-A800/A800 Plus/F800/E800 inverter sequence function. The package supports both ES Modules and CommonJS.

## Installation

```bash
npm install @mokouliszt/mel-device
```

## Basic usage

```js
import { isValidDevice, analyzeDevice } from "@mokouliszt/mel-device";

isValidDevice("X0", {
  series: "iQ-R",
  model: "R00"
}); // true (normalized to R00CPU)

isValidDevice("D0.A", {
  series: "iQ-F",
  model: "FX5S"
}); // true

analyzeDevice("D12288", {
  series: "iQ-R",
  model: "R00",
  mode: "default"
});
// {
//   valid: false,
//   code: "REQUIRES_CONFIGURATION",
//   suggestedMode: "maximum",
//   ...
// }

isValidDevice("U3E0\\G524287", {
  series: "CR800-R"
}); // true (model inferred from series)
```

Instead of returning only `true` or `false`, `analyzeDevice` reports the normalized model, parsed device, reason for failure, referenced manual and page, and whether the result depends on the actual hardware configuration. It is the recommended API for validating user input.

The `model` option may be omitted when `series` is set directly to a single-model shorthand such as `CR800-R`, `CR800-D`, `CR800-Q`, `FR-A800`, `FR-F800`, or `FR-E800`. A model must still be specified for `iQ-R`, `iQ-F`, `MX-R`, `MX-F`, `CR800`, and `FR800`.

## Validation modes

The number of available points for PLC devices such as M and D can be changed in the CPU parameters, so the valid range on actual hardware cannot always be determined from the model alone. This package makes that distinction explicit through validation modes.

| `mode` | Use case | Behavior |
| --- | --- | --- |
| `default` | Conservative general-purpose validation (default) | Validates against the default point counts stated in the manuals. Because the referenced iQ-F manuals do not include a default point-count table, iQ-F devices are checked against the model-specific usage range and return `configurationDependent: true`. |
| `maximum` | Design and configuration screens | Validates against the maximum configurable limits stated in the manuals. Actual limits may be lower depending on memory, label usage, expansion SRAM, and other factors. |
| `configured` | Exact validation for an actual project | Validates against the actual point counts supplied in `configuredPoints`. Returns `MISSING_CONFIGURATION` if the point count for a configurable device is omitted. |
| `syntax` | In-progress editor input and syntax checking | Checks only whether the model supports the device syntax and ignores point-count ranges. |

The device ranges for CR800-R/D/Q and for the FR inverter sequence function are fixed in the manuals, so `configuredPoints` is ignored for those series. `maximum` still differs for the inverters, because it opts into the SERIAL-dependent 32-point T/ST/C extension described below.

```js
isValidDevice("D99", {
  series: "MX-F",
  model: "MXF100",
  mode: "configured",
  configuredPoints: { D: 100 }
}); // true

isValidDevice("D100", {
  series: "MX-F",
  model: "MXF100",
  mode: "configured",
  configuredPoints: { D: 100 }
}); // false (100 points cover D0 through D99)
```

## Input modes

`inputMode: "exact"` is the default. It requires uppercase, half-width characters, and the `\` separator used in the manuals.

For user-entered UI input, `friendly` is convenient. It normalizes leading and trailing whitespace, lowercase characters, full-width alphanumeric characters, and `¥` / `￥`.

```js
analyzeDevice("  u1￥g0  ", {
  series: "iQ-F",
  model: "FX5U",
  inputMode: "friendly"
}).normalized; // "U1\\G0"
```

## Main supported notation

- Direct devices: `X0`, `DX0`, `DY0`, `M0`, `D0`, `W0`, `SM400`
- Bit specification for word devices: `D0.A`
- Timer/counter contacts, coils, and current values: `TS0`, `TC0`, `TN0`, `LCS0`, etc.
- Module access: `U1\G0`
- CPU buffer memory access: `U3E0\G0`, `U3E0\HG0`
- Link direct devices: `J1\X0`, `J1\W0`
- Digit specification: `K4M100`
- Indirect specification: `@D10`, `@D10.8`
- Index modification: `D10Z2.0`, `D10.8Z2`, `D0LZ0`
- Local devices: `#M0` (supported series/devices only)

### Module and CPU buffer access limits

The head I/O number, the CPU selector, and the address are all validated against the ranges printed in the manuals. The `G` buffer-memory area and the `HG` cyclic-transmission area have separate limits, and the `HG` area is not listed for MX-R or MX-F at all.

| Series | `Un\G` head I/O number | `U3En\G` | `U3En\HG` |
| --- | --- | --- | --- |
| iQ-R | `U00`-`UFF` | `U3E0`-`U3E3`, address `0`-`268435455` | `U3E0`-`U3E3`, address `0`-`12287` |
| iQ-F | not stated in the manual (unchecked) | not supported | not supported |
| MX-R | `U00`-`UFF` | `U3E0`, address `0`-`524287` | not listed in the manual |
| MX-F | `U01`-`UFE` | `U3E0`, address `0`-`16809983` | not listed in the manual |

CR800 uses its own fixed table; see the section below.

## MELFA CR800

The recommended notation separates the parent series from the controller type.

```js
analyzeDevice("U3E1\\HG100", {
  series: "CR800",
  model: "CR800-D",
  operation: "write"
});
// valid: true (valid as device notation)
// access: "read-only"
// operationAllowed: false (this area is an always-enabled sequencer link input)
```

The shorthand series values `"CR800-R"`, `"CR800-D"`, and `"CR800-Q"` are also accepted; `model` may be omitted in that form. The model may also be specified as `R`, `D`, or `Q`.

| Model | Supported devices and fixed ranges |
| --- | --- |
| CR800-R | `X0-XFFF`, `Y0-YFFF`, `M0-M18431`, `D0-D5119`, `SM0-SM4095`, `SD0-SD4095`, `U3E0-U3E3\G0-G524287`, `U3E0-U3E3\HG0-HG12287` |
| CR800-D | `X0-X1FFF`, `Y0-Y1FFF`, `D0-D5119`, `SM0-SM4095`, `SD0-SD4095`, `U3E0/U3E1\HG0-HG2047` |
| CR800-Q | `X0-XFFF`, `Y0-YFFF`, `M0-M18431`, `D0-D5119`, `SM0-SM2047`, `SD0-SD2047`, `U3E0-U3E3\G10000-G24335` |

### Read/write attribute validation

Tables 6-14 through 6-16 of the instruction manual identify areas that become read-only while particular functions are assigned, even when the addresses remain within the fixed device ranges. Writes to these areas are ignored. `isValidDevice` validates the device notation and fixed range, while `analyzeDevice` separately returns the following fields:

- `access`: `read-write` / `read-only` / `configuration-dependent`
- `operationAllowed`: `true` or `false` for `operation: "read" | "write"`; `null` when the configuration is unknown
- `activeAllocations`, `possibleAllocations`, `warnings`: allocations used as the basis for the result

If the actual hardware configuration is known, pass it through `cr800Features`. Omitted properties are treated as unknown and conservatively return `configuration-dependent`.

```js
analyzeDevice("U3E1\\HG600", {
  series: "CR800-D",
  operation: "write",
  cr800Features: { iqmem: false }
}).operationAllowed; // true (freely readable/writable when the expansion is disabled)

analyzeDevice("U3E1\\HG600", {
  series: "CR800-D",
  operation: "write",
  cr800Features: { iqmem: true }
}).operationAllowed; // false
```

The following settings are supported:

| `cr800Features` | Applies to | Meaning |
| --- | --- | --- |
| `qxyread` | R/Q | Direct control of sequencer I/O units |
| `iqmem` | R/D/Q | CPU buffer/shared-memory expansion |
| `ddevvl` | R/D/Q | `"disabled"`, `"program-external"`, `"status"`, `"mixed"` |
| `parallelIoUnit`, `parallelIoInterface`, `gotLink` | D | Parallel I/O and GOT link |
| `profibus`, `ccLink`, `ccLinkIef` | D | Network functions |

Examples of always-enabled areas include `U3E1\HG0-HG511` on CR800-D, `U3E1-U3E3\HG0-HG511` on CR800-R, and `U3E1-U3E3\G10000-G10511` on CR800-Q. These areas are read-only from external devices. Hand inputs `X384-X38B` are also read-only. In contrast, areas for disabled or unassigned functions may be freely read and written as described in the manual notes.

The `U3En\G512-G1023` range in Table 6-16 for CR800-Q conflicts with the fixed `G10000-G24335` range in Table 6-13 and with the correspondence tables in Sections 5.2.1 and 6.2.2. To avoid false-positive validation, this package treats that notation as invalid with `MANUAL_RANGE_CONFLICT`. It also does not make a definitive claim about the IQMEM read/write attributes of the `G10512-G11023` range, instead reporting them as `configuration-dependent`.

Bit specifications, digit specifications, indirect specifications, index modifications, and local specifications that are not listed in Tables 6-11 through 6-13 are conservatively treated as invalid for CR800.

Constants (`K100`, `HFF`, real numbers, and strings) are outside the validation scope because they are not devices. Labels, structure members, and SLMP binary device codes are also outside the scope.

## FR inverter sequence function

The FR-A800/A800 Plus/F800/E800 sequence function has one fixed device table, so the series is `FR800` and the inverter family is the model. Single-family shorthands are accepted as `series`, in which case `model` may be omitted.

```js
isValidDevice("X8F", { series: "FR-A800" }); // true (X is hexadecimal, 144 points)
isValidDevice("X90", { series: "FR-A800" }); // false

analyzeDevice("P100", { series: "FR-E800" });
// valid: true, configurationDependent: true (the P device depends on the SERIAL production month)

analyzeDevice("P100", { series: "FR-A800" }).code; // "DEVICE_NOT_SUPPORTED"
```

| Device | FR-A800 / FR-A800 Plus / FR-F800 | FR-E800 | Radix |
| --- | --- | --- | --- |
| X, Y | `X0-X8F`, `Y0-Y8F` (144 points each) | same | hexadecimal |
| M | `M0-M127` | same | decimal |
| L | no points (a latch range can be set but nothing latches) | same | - |
| T, ST, C | `0-15`, or `0-31` with the extension below | `0-15` | decimal |
| D | `D0-D255` | same | decimal |
| P | not listed | `P0-P127`, `P2048-P2175` | decimal |
| SM, SD | `0-2047` (not every number has a function) | same | decimal |
| N | `N0-N14` (MC/MCR nesting) | same | decimal |

### SERIAL-dependent features

The manual lists two device features whose availability depends on the inverter production month printed on the SERIAL plate. Because the model name alone cannot decide them, they are reported separately instead of being silently allowed.

```js
analyzeDevice("T16", { series: "FR-A800" });
// valid: false, code: "REQUIRES_SERIAL_SUPPORT", suggestedMode: "maximum"

isValidDevice("T16", { series: "FR-A800", mode: "maximum" });                       // true (configurationDependent)
isValidDevice("T16", { series: "FR-A800", frFeatures: { extendedTimerPoints: true } });  // true (asserted)
isValidDevice("T16", { series: "FR-A800", frFeatures: { extendedTimerPoints: false } }); // false
```

| `frFeatures` | Applies to | Meaning |
| --- | --- | --- |
| `extendedTimerPoints` | FR-A800, FR-A800-CRN, FR-A800-LC, FR-F800 | 32-point T/ST/C extension |
| `pointerDevice` | FR-E800 family | 256-point P pointer device |

Setting a feature to `true` for a model the manual does not list returns `INVALID_FR_FEATURES` rather than quietly widening the range.

### Digit designation and input devices

Digit designation is documented for the bit devices X, Y, and M only, and the package also checks that the designated points fit inside the device range.

```js
isValidDevice("K4X80", { series: "FR-A800" });            // true (X80-X8F)
analyzeDevice("K4X8C", { series: "FR-A800" }).code;       // "DIGIT_RANGE_OVERFLOW"
analyzeDevice("K4D0", { series: "FR-A800" }).code;        // "DIGIT_MODIFIER_NOT_SUPPORTED"
```

Input device X is refreshed from the terminal or network on every scan, so a program cannot drive it. `analyzeDevice` reports this through the same fields used for CR800:

```js
analyzeDevice("X0", { series: "FR-A800", operation: "write" });
// valid: true, access: "read-only", operationAllowed: false
// warnings: use SM1200/SM1255 and SD1148/SD1149 for inverter operation control
```

X/Y addresses from `30H` upward belong to the CC-Link remote area (`30H-3FH`) and the Ethernet inverter-to-inverter link area (`40H-8FH`), so they return `configurationDependent: true` with a warning naming the area.

Bit selection, indirect specification, index modification, local devices, module access, and the `TS`/`TC`/`TN` style contact/coil/current notation are not documented for the inverter sequence function and are conservatively rejected.

## API

### `isValidDevice(value, options): boolean`

Returns a simple Boolean validation result.

### `analyzeDevice(value, options): DeviceAnalysis`

Returns a detailed validation result. The main fields are `valid`, `code`, `message`, `normalized`, `parsed`, `configurationDependent`, and `source`.

### `assertValidDevice(value, options): DeviceAnalysis`

Throws `MelDeviceError` when the device is invalid.

### `parseDevice(value, options): ParsedDevice | null`

Parses the notation into its components. It does not validate ranges for a series or model.

### `normalizeDevice(value): string | null`

Normalizes human-entered notation.

### `normalizeModel(series, model): string | null`

Normalizes a model name for validation, such as `R00` → `R00CPU` or a specific iQ-F model name → `FX5U`.

### `getSupportedModels(series): string[]`

Returns the list of models covered by the manuals.

## Supported models

- iQ-R: R00CPU, R01CPU, R02CPU, R04/R08/R16/R32/R120 CPUs, and ENCPUs
- iQ-F: FX5S, FX5UJ, FX5U, and FX5UC (specific I/O model names are normalized to their families)
- MX-R: MXR300-16/-32/-64 and MXR500-128/-256
- MX-F: the 10 models covered by the MXF100-series manual (`MXF100` is accepted as a family alias)
- MELFA CR800: CR800-R, CR800-D, and CR800-Q
- FR inverters (`FR800`): FR-A800, FR-A800-P, FR-A800-CRN, FR-A800-LC, FR-A800-Plus, FR-F800, FR-E800, FR-E800-E, FR-E800-SCE, FR-E800-NC, and FR-E806

## References

The validation tables and their supporting manual numbers, editions, and page references are documented in the bundled [manual-evidence.md](docs/manual-evidence.md).

## License

MIT
