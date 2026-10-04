import type {Report} from './map-view';

const databaseName = 'via-libre-valledupar-static-v1';
const kinds = ['Andén bloqueado', 'Doble fila', 'Paso peatonal bloqueado', 'Ciclovía bloqueada', 'Otro obstáculo'];
const transitions: Record<string, string[]> = {
  'Recibido': ['En revisión', 'Validado', 'Descartado'],
  'En revisión': ['Validado', 'Descartado'],
  'Validado': ['Atendido/Cerrado'],
  'Atendido/Cerrado': [],
  'Descartado': [],
};
let opening: Promise<IDBDatabase> | undefined;

function database() {
  if (!opening) opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Este navegador no permite guardar reportes. Prueba con otro navegador.'));
      return;
    }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('reports', {keyPath: 'id'});
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opening = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento del navegador.'));
    request.onblocked = () => reject(new Error('Cierra las otras pestañas de la demo y vuelve a intentarlo.'));
  }).catch(error => { opening = undefined; throw error; });
  return opening;
}

function transaction<T>(db: IDBDatabase, mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, result: (value: T) => void, fail: (message: string) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('reports', mode);
    let value: T;
    let message = '';
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => {};
    tx.onabort = () => reject(new Error(message || (tx.error?.name === 'QuotaExceededError'
      ? 'El navegador no tiene espacio para guardar la foto. Usa una imagen más pequeña.'
      : 'No se pudo guardar el cambio. Revisa el almacenamiento de tu navegador.')));
    try {
      operation(tx.objectStore('reports'), result => { value = result; }, error => { message = error; tx.abort(); });
    } catch (error) {
      message = error instanceof Error ? error.message : 'No se pudo completar la acción.';
      tx.abort();
    }
  });
}

export async function listReports(): Promise<Report[]> {
  const db = await database();
  return transaction<Report[]>(db, 'readonly', (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done((request.result as Report[]).sort((a, b) => b.created.localeCompare(a.created)));
  });
}

export async function addExamples() {
  const samples = [
    ['demo-01', 'Andén bloqueado', 'Carrera 9 · Centro', 10.477, -73.250, 'Recibido', 'Un vehículo ocupa el espacio de paso.'],
    ['demo-02', 'Doble fila', 'Calle 16 · Centro', 10.476, -73.247, 'En revisión', 'Dos vehículos reducen el espacio de circulación.'],
    ['demo-03', 'Paso peatonal bloqueado', 'Carrera 7 · Centro', 10.479, -73.244, 'Validado', 'El paso peatonal permanece obstruido.'],
    ['demo-04', 'Ciclovía bloqueada', 'Avenida Simón Bolívar', 10.468, -73.253, 'Atendido/Cerrado', 'La obstrucción se retiró en la simulación.'],
    ['demo-05', 'Andén bloqueado', 'Calle 13 · Centro', 10.480, -73.250, 'Descartado', 'La evidencia no permite confirmar la situación.'],
  ] as const;
  const db = await database();
  return transaction<void>(db, 'readwrite', store => {
    samples.forEach((s, i) => {
      const request = store.get(s[0]);
      request.onsuccess = () => {
        if (request.result) return;
        const time = Date.now() - (i + 1) * 3600000;
        const created = new Date(time).toISOString();
        const chain = s[5] === 'Descartado' ? ['Recibido', 'En revisión', 'Descartado']
          : ['Recibido', 'En revisión', 'Validado', 'Atendido/Cerrado'].slice(0, ['Recibido', 'En revisión', 'Validado', 'Atendido/Cerrado'].indexOf(s[5]) + 1);
        const history = chain.map((status, j) => ({status, at: new Date(time + j * 600000).toISOString(), note: 'Evento simulado de ejemplo.'}));
        store.add({id: s[0], kind: s[1], address: s[2], lat: s[3], lng: s[4], observed: created,
          note: s[6], status: s[5], photo: null, created, history: JSON.stringify(history), example: 1} satisfies Report);
      };
    });
  });
}

async function photoData(photo: File) {
  if (!photo.size || photo.size > 5 * 1024 * 1024) throw new Error('Adjunta una foto JPG, PNG o WebP de hasta 5 MB.');
  const bytes = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
  const mime = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
    : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 ? 'image/png'
    : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP' ? 'image/webp' : null;
  if (!mime || mime !== photo.type) throw new Error('El archivo debe ser una imagen JPG, PNG o WebP válida.');
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la fotografía. Selecciónala nuevamente.'));
    reader.readAsDataURL(photo);
  });
  // Validate that the browser can decode the image, beyond its file signature.
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth > 0 ? resolve() : reject(new Error('La fotografía no es válida.'));
    image.onerror = () => reject(new Error('La fotografía está dañada o no se puede abrir.'));
    image.src = encoded;
  });
  return encoded;
}

export async function createReport(data: FormData) {
  const kind = String(data.get('kind') || ''), address = String(data.get('address') || '').trim();
  const note = String(data.get('note') || '').trim(), observed = String(data.get('observed') || '');
  const lat = Number(data.get('lat')), lng = Number(data.get('lng')), photo = data.get('photo');
  if (!kinds.includes(kind) || !address || address.length > 200 || note.length > 1000
    || !data.get('lat') || !data.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(Date.parse(observed))) {
    throw new Error('Revisa la situación, dirección, fecha y ubicación.');
  }
  if (!(photo instanceof File)) throw new Error('Adjunta una fotografía para completar el reporte.');
  const encoded = await photoData(photo);
  const id = globalThis.crypto?.randomUUID?.() || 'reporte-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const created = new Date().toISOString();
  const report: Report = {id, kind, address, lat, lng, observed: new Date(observed).toISOString(), note,
    status: 'Recibido', photo: encoded, created, example: 0,
    history: JSON.stringify([{status: 'Recibido', at: created, note: 'Reporte registrado en la demostración.'}])};
  const db = await database();
  return transaction<{id: string}>(db, 'readwrite', (store, done) => {store.add(report); done({id});});
}

export async function reviseReport({id, status, note}: {id: string; status: string; note: string}) {
  if (typeof id !== 'string' || typeof status !== 'string' || typeof note !== 'string' || !note.trim() || note.length > 1000)
    throw new Error('Escribe el motivo de la revisión.');
  const db = await database();
  // Read and update in one transaction: two tabs cannot apply the same transition twice.
  return transaction<void>(db, 'readwrite', (store, done, fail) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const report = request.result as Report | undefined;
      if (!report) {fail('El reporte no existe.'); return;}
      if (!transitions[report.status]?.includes(status)) {fail('Este cambio de estado no está disponible. Actualiza el reporte.'); return;}
      const history = [...JSON.parse(report.history), {status, note: note.trim(), at: new Date().toISOString()}];
      store.put({...report, status, history: JSON.stringify(history)});
      done();
    };
  });
}
