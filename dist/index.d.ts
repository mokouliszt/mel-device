export type MelSeries =
  | "iQ-R" | "iQ-F" | "MX-R" | "MX-F"
  | "CR800" | "CR800-R" | "CR800-D" | "CR800-Q"
  | "FR800"
  | "FR-A800" | "FR-A800-P" | "FR-A800-CRN" | "FR-A800-LC" | "FR-A800-Plus"
  | "FR-F800"
  | "FR-E800" | "FR-E800-E" | "FR-E800-SCE" | "FR-E800-NC" | "FR-E806";
export type ValidationMode = "syntax" | "default" | "maximum" | "configured";
export type InputMode = "exact" | "friendly";
export type DeviceOperation = "read" | "write" | "either";
export type DeviceAccess = "read-write" | "read-only" | "configuration-dependent" | "not-evaluated";

export interface Cr800Features {
  /** CR800-R/Q sequencer I/O unit direct control (parameter QXYREAD). */
  qxyread?: boolean;
  /** CPU/shared-memory extension (parameter IQMEM). */
  iqmem?: boolean;
  /** Sequencer device allocation (parameters DDEVVL1-DDEVVL32). */
  ddevvl?: "disabled" | "program-external" | "status" | "mixed";
  /** CR800-D parallel I/O unit is connected. */
  parallelIoUnit?: boolean;
  /** CR800-D parallel I/O interface is connected. */
  parallelIoInterface?: boolean;
  /** CR800-D GOT link is active. */
  gotLink?: boolean;
  /** CR800-D PROFIBUS option is connected. */
  profibus?: boolean;
  /** CR800-D CC-Link is active. */
  ccLink?: boolean;
  /** CR800-D CC-Link IE Field is active. */
  ccLinkIef?: boolean;
}

export interface FrFeatures {
  /**
   * 32-point T/ST/C extension. Listed only for FR-A800 (excluding FR-A800-P),
   * FR-A800 Plus (FR-A800-CRN/LC) and FR-F800, from the January 2021
   * production month onward. Omit when the SERIAL plate has not been checked.
   */
  extendedTimerPoints?: boolean;
  /**
   * 256-point P pointer device. Listed only for FR-E800, from the January 2021
   * production month onward.
   */
  pointerDevice?: boolean;
}

export interface DeviceOptions {
  series: MelSeries | string;
  model?: string;
  mode?: ValidationMode;
  inputMode?: InputMode;
  operation?: DeviceOperation;
  configuredPoints?: Partial<Record<string, number>>;
  /** Known CR800 feature states. Omitted properties are treated as unknown. */
  cr800Features?: Cr800Features;
  /** Known inverter feature states. Omitted properties are treated as unknown. */
  frFeatures?: FrFeatures;
}

export interface ParsedDevice {
  kind: "direct" | "unit" | "cpu-buffer" | "link";
  prefix: string;
  notationPrefix?: string;
  address: number;
  addressText: string;
  radix: 8 | 10 | 16;
  input: string;
  normalized: string;
  local: boolean;
  digit: number | null;
  indirect: boolean;
  bit: number | null;
  index: { type: "Z" | "LZ"; number: number } | null;
  indexOrder: "index-bit" | "bit-index" | "bit" | "index" | null;
  timerPart?: "contact" | "coil" | "current";
  unit?: number;
  cpu?: number;
  network?: number;
}

export interface DeviceAnalysis {
  valid: boolean;
  input: unknown;
  normalized: string | null;
  series: MelSeries | null;
  model: string | null;
  mode: ValidationMode | string;
  code: string;
  message: string;
  configurationDependent: boolean;
  operation?: DeviceOperation;
  access?: DeviceAccess;
  /** true/false when the requested read/write is known; null when not requested or configuration-dependent. */
  operationAllowed?: boolean | null;
  activeAllocations?: string[];
  possibleAllocations?: string[];
  warnings?: string[];
  parsed?: ParsedDevice;
  suggestedMode?: ValidationMode;
  source: { manual: string; pages: number[] } | null;
}

export class MelDeviceError extends Error {
  code: string;
  result: DeviceAnalysis;
}

export function analyzeDevice(value: unknown, options: DeviceOptions): DeviceAnalysis;
export function isValidDevice(value: unknown, options: DeviceOptions): boolean;
export function assertValidDevice(value: unknown, options: DeviceOptions): DeviceAnalysis;
export function parseDevice(value: unknown, options: Pick<DeviceOptions, "series" | "inputMode">): ParsedDevice | null;
export function normalizeDevice(value: unknown): string | null;
export function normalizeModel(series: MelSeries | string, value?: unknown): string | null;
export function getSupportedModels(series: MelSeries | string): string[];

declare const api: {
  MelDeviceError: typeof MelDeviceError;
  analyzeDevice: typeof analyzeDevice;
  assertValidDevice: typeof assertValidDevice;
  getSupportedModels: typeof getSupportedModels;
  isValidDevice: typeof isValidDevice;
  normalizeDevice: typeof normalizeDevice;
  normalizeModel: typeof normalizeModel;
  parseDevice: typeof parseDevice;
};
export default api;
