declare module 'react-native-health-connect' {
  export const initialize: () => Promise<{ ok: boolean }>;
  export const getSdkStatus: () => Promise<any>;
  export const requestPermission: (opts?: any) => Promise<any>;
  export const getGrantedPermissions: () => Promise<any>;
  export const readRecords: (params: any) => Promise<any>;
  export const writeRecords: (params: any) => Promise<any>;
  export const revokeAllPermissions: () => Promise<any>;
  const _default: {
    initialize: typeof initialize;
    getSdkStatus: typeof getSdkStatus;
    requestPermission: typeof requestPermission;
    getGrantedPermissions: typeof getGrantedPermissions;
    readRecords: typeof readRecords;
    writeRecords: typeof writeRecords;
    revokeAllPermissions: typeof revokeAllPermissions;
  };
  export default _default;
}
