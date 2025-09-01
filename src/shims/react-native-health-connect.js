// src/shims/react-native-health-connect.js
// Redirige llamadas al paquete nativo hacia expo-health-connect
import * as HC from 'expo-health-connect';

export const initialize = async () => ({ ok: true });
export const getSdkStatus = async () => HC.getSdkStatusAsync();
export const requestPermission = async (opts = {}) => {
  const accessTypes = opts.permissions || opts.accessTypes || [];
  return HC.requestPermissionsAsync(accessTypes);
};
export const getGrantedPermissions = async () => HC.getGrantedPermissionsAsync();
export const readRecords = async (params) => HC.readRecordsAsync(params);
export const writeRecords = async (params) => HC.writeRecordsAsync(params);
export const revokeAllPermissions = async () => HC.revokeAllPermissionsAsync();

export default {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  writeRecords,
  revokeAllPermissions,
};
