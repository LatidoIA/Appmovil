// crash.js - captura temprana de errores para verlos en Orbit
import { Alert, Platform, LogBox } from 'react-native';

if (!global.__LATIDO_CRASH_PATCHED__) {
  global.__LATIDO_CRASH_PATCHED__ = true;

  // Menos ruido conocido
  LogBox.ignoreLogs([
    '[expo-av]: Expo AV has been deprecated',
    '`expo-notifications` functionality is not fully supported in Expo Go',
  ]);

  // Consola más visible
  const origError = console.error;
  console.error = (...args) => {
    try { origError?.('[Latido][console.error]:', ...args); }
    catch (e) { /* noop */ }
  };

  // Errores fatales de RN
  const origHandler = global.ErrorUtils?.getGlobalHandler?.();
  const safeAlert = (title, msg) => {
    try {
      Alert.alert(title, msg, [{ text: 'OK' }], { cancelable: true });
    } catch (_) {}
  };

  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    try {
      console.error('[Latido][globalError]', isFatal ? '(FATAL)' : '', error?.stack || String(error));
      // En dev build (Orbit) mostramos un aviso corto; el RedBox también aparece.
      if (isFatal) {
        safeAlert(
          'Error fatal',
          `La app encontró un error y se cerrará.\n${Platform.OS}\n${error?.message || error}`
        );
      }
    } catch (_) {}
    // Dejar que RN haga lo suyo también
    try { origHandler && origHandler(error, isFatal); } catch (_) {}
  });

  // Promesas no manejadas
  const trackUnhandledRejection = (reason) => {
    try {
      console.error('[Latido][unhandledRejection]', reason?.stack || String(reason));
    } catch (_) {}
  };

  // RN/Hermes no siempre expone 'addEventListener' en global, probamos varias rutas
  try {
    const g = globalThis;
    const evtName = 'unhandledrejection';
    if (g.addEventListener) {
      g.addEventListener(evtName, (e) => trackUnhandledRejection(e?.reason));
    }
  } catch (_) {}
}
