import api from "./index.cjs";

export const {
  MelDeviceError,
  analyzeDevice,
  assertValidDevice,
  getSupportedModels,
  isValidDevice,
  normalizeDevice,
  normalizeModel,
  parseDevice
} = api;

export default api;
