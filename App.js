// App.js
// Modal emergente de permisos (restaurado).
// No crea archivos nuevos: el modal vive aquí y se monta debajo del navigator.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './RootNavigator'; // tu navigator existente

import {
  hcGetStatusDebug,
  hasAllPermissions,
  quickSetup,
  hcOpenSettings,
} from './health';

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
      <HealthPermissionModal />
    </NavigationContainer>
  );
}

function HealthPermissionModal() {
  const [visible, setVisible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('…');
  const autoTried = useRef(false);

  const check = useCallback(async () => {
    try {
      const st = await hcGetStatusDebug();
      const okAvail = st?.label === 'SDK_AVAILABLE';
      setAvailable(okAvail);
      setStatusText(st?.label || '—');
      const okPerms = okAvail ? await hasAllPermissions() : false;
      setGranted(!!okPerms);
      setVisible(Platform.OS === 'android' && (!okAvail || !okPerms));
      if (okAvail && !okPerms && !autoTried.current) {
        autoTried.current = true;
        setBusy(true);
        try {
          await quickSetup();
          const ok2 = await hasAllPermissions();
          setGranted(!!ok2);
          setVisible(!(ok2 === true));
        } finally {
          setBusy(false);
        }
      }
    } catch {
      setAvailable(false);
      setGranted(false);
      setVisible(Platform.OS === 'android'); // muestra por si acaso
      setStatusText('STATUS_ERROR');
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:24 }}>
        <View style={{ width:'100%', maxWidth:420, backgroundColor:'#fff', borderRadius:16, padding:16 }}>
          <Text style={{ fontSize:18, fontWeight:'600', marginBottom:8, color:'#111' }}>Permisos de Salud</Text>

          {!available && (
            <>
              <Text style={{ color:'#333', marginBottom:8 }}>
                Health Connect no está disponible ({statusText}). Instálalo/actívalo para continuar.
              </Text>
              {busy ? (
                <Busy label="Abriendo…" />
              ) : (
                <>
                  <BtnPrimary label="Abrir Health Connect" onPress={async () => { setBusy(true); try { await hcOpenSettings(); } finally { setBusy(false); } }} />
                  <Gap8 />
                  <BtnOutline label="Revisar de nuevo" onPress={check} />
                </>
              )}
            </>
          )}

          {available && !granted && (
            <>
              <Text style={{ color:'#333', marginBottom:8 }}>
                Otorga acceso de lectura a Pasos, FC, Sueño, SpO₂ y Presión Arterial.
              </Text>
              {busy ? (
                <Busy label="Solicitando permisos…" />
              ) : (
                <>
                  <BtnPrimary label="Solicitar permisos ahora" onPress={async () => { setBusy(true); try { await quickSetup(); await check(); } finally { setBusy(false); } }} />
                  <Gap8 />
                  <BtnOutline label="Abrir Health Connect" onPress={async () => { setBusy(true); try { await hcOpenSettings(); } finally { setBusy(false); } }} />
                  <Gap8 />
                  <BtnOutline label="Revisar de nuevo" onPress={check} />
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Busy({ label }) {
  return (
    <View style={{ alignItems:'center', paddingVertical:8 }}>
      <ActivityIndicator />
      <Text style={{ marginTop:8, color:'#555' }}>{label}</Text>
    </View>
  );
}
function Gap8(){ return <View style={{ height:8 }} />; }
function BtnPrimary({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ backgroundColor:'#6C63FF', paddingVertical:12, borderRadius:12 }}>
      <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>{label}</Text>
    </TouchableOpacity>
  );
}
function BtnOutline({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ borderWidth:1, borderColor:'#DDD', paddingVertical:12, borderRadius:12 }}>
      <Text style={{ color:'#111', textAlign:'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}
