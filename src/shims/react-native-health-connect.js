// src/shims/react-native-health-connect.js
// Este shim permite mantener tu código existente (si importaba
// 'react-native-health-connect') pero usando internamente Expo HC.

import * as HC from 'expo-health-connect';

// No-op: antiguamente algunos SDKs pedían "initialize"
export const initialize = async () => ({ ok: true });

// Equivalente a getSdkStatus / getSdkStatusAsync
export const getSdkStatus = async () => HC.getSdkStatusAsync();

// Adaptador simple: acepta { permissions | accessTypes }
export const requestPermission = async (opts = {}) => {
  const accessTypes = opts.permissions || opts.accessTypes || [];
  // Expo espera un array de accessTypes/records
  return HC.requestPermissionsAsync(accessTypes);
};

export const getGrantedPermissions = async () => HC.getGrantedPermissionsAsync();

// API de lectura/escritura directa
export const readRecords = async (params) => HC.readRecordsAsync(params);
export const writeRecords = async (params) => HC.writeRecordsAsync(params);

// Revocar permisos
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
