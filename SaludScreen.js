// src/SaludScreen.js (usa el mismo que ya tienes y cambia estas partes)

async function refreshStatus() {
  const s = await hcGetStatusDebug();
  setStatusLabel(`${s.label} (${s.status})`);   // 👈 muestra etiqueta + código
  setAvailable(s.label === "SDK_AVAILABLE");    // 👈 criterio estricto
}

async function handleRequest() {
  setLoading(true);
  await refreshStatus();

  // pedimos permisos con timeout para no colgarnos
  const ok = await Promise.race([
    quickSetup(),
    new Promise((r) => setTimeout(() => r(false), 10000)),
  ]);

  setGranted(!!ok);
  if (ok) {
    await fetchData();
  } else {
    setData(null);
  }
  setLoading(false);
}

// 👉 en los botones, llama y luego refresca estado:
<Button title="Abrir Health Connect" onPress={async () => {
  setLoading(true);
  await hcOpenSettings();
  await refreshStatus();
  setLoading(false);
}} />

<Button title="Revisar de nuevo" onPress={async () => {
  setLoading(true);
  await refreshStatus();
  setLoading(false);
}} />


