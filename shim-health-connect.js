// shim-health-connect.js
// Shim seguro para ejecutar la app SIN el nativo de Health Connect.
// Exporta la API mínima como no-ops/promesas resueltas en vacío.

const notAvailableError = () =>
  new Error('[HC_SHIM] Health Connect no está disponible en este build');

const initialize = async () => ({ initialized: false });
const isAvailable = async () => false;
const getSdkStatus = async () => 'SDK_UNAVAILABLE';

const requestPermission = async () => ({ granted: false, details: [] });
const revokeAllPermissions = async () => undefined;
const hasPermissions = async () => false;

const readRecords = async () => ({ records: [], pageToken: null });
const aggregateRecords = async () => ({ result: {} });
const insertRecords = async () => { throw notAvailableError(); };
const updateRecords = async () => { throw notAvailableError(); };
const deleteRecords = async () => { throw notAvailableError(); };

const openHealthConnectSettings = async () => false;
const openHealthConnectDataManagement = async () => false;

// Para que cualquier acceso a tipos no rompa:
const Permissions = {};
const RecordType = new Proxy({}, { get: (_, prop) => String(prop) });

module.exports = {
  initialize,
  isAvailable,
  getSdkStatus,
  requestPermission,
  revokeAllPermissions,
  hasPermissions,
  readRecords,
  aggregateRecords,
  insertRecords,
  updateRecords,
  deleteRecords,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
  Permissions,
  RecordType,
  default: {},
};
