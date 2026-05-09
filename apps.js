// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    databaseURL: "https://controlmedicamentos-7784f-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ── Lista de medicamentos ──
const MEDICAMENTOS = [
    "Ibuprofeno 600",
    "Tafirol 1 gr",
    "Cafiaspirina",
    "Sertal",
    "Buscapina",
    "Ibuprofeno 400mg",
    "Paracetamol 500mg",
];

// Datos en memoria
let registrosMed   = [];
let registrosSat   = [];
let registrosSueno = [];
let registrosStock = [];
let tipoHistorial  = 'med';
let periodoActivo  = 'dia';

// ── Detectar dispositivo ──
function detectarDispositivo() {
    const ua = navigator.userAgent;
    let os = "Desconocido", device = "Dispositivo desconocido";

    if (/iPhone/.test(ua))                             { device = "iPhone";         os = "iOS"; }
    else if (/iPad/.test(ua))                          { device = "iPad";           os = "iOS"; }
    else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = "Android Phone";  os = "Android"; }
    else if (/Android/.test(ua))                       { device = "Android Tablet"; os = "Android"; }
    else if (/Windows/.test(ua))                       { device = "PC";             os = "Windows"; }
    else if (/Macintosh/.test(ua))                     { device = "Mac";            os = "macOS"; }
    else if (/Linux/.test(ua))                         { device = "PC";             os = "Linux"; }

    const modelMatch = ua.match(/\(Linux.*?;\s*(.*?)\s*Build/);
    if (modelMatch && os === "Android") device = modelMatch[1];

    return `${device} / ${os}`;
}

// ── Saludo ──
function mostrarSaludo(nombre) {
    const hora = new Date().getHours();
    let saludo = "";
    if (hora >= 0 && hora < 13)       saludo = `☀️ ¡Buen día, ${nombre}!`;
    else if (hora >= 13 && hora < 20) saludo = `🌤️ ¡Buenas tardes, ${nombre}!`;
    else                               saludo = `🌙 ¡Buenas noches, ${nombre}!`;
    document.getElementById('saludo').textContent = saludo;
}

// ── Fecha y hora actual local ──
function obtenerFechaHoraActual() {
    const ahora = new Date();
    const anio    = ahora.getFullYear();
    const mes     = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia     = String(ahora.getDate()).padStart(2, '0');
    const horas   = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return { fecha: `${anio}-${mes}-${dia}`, hora: `${horas}:${minutos}` };
}

function actualizarValoresDefault() {
    const { fecha, hora } = obtenerFechaHoraActual();
    const f = document.getElementById('fecha');
    const h = document.getElementById('hora');
    if (f) f.value = fecha;
    if (h) h.value = hora;
}

function poblarSelectores() {
    const selectMed       = document.getElementById('medicamento');
    const selectFiltroMed = document.getElementById('filtroMed');

    MEDICAMENTOS.forEach(med => {
        [selectMed, selectFiltroMed].forEach(sel => {
            const opt = document.createElement('option');
            opt.value = med; opt.textContent = med;
            sel.appendChild(opt);
        });
    });
}

// ── Renderizar historial según tipo ──
function renderizarHistorial() {
    const contenedor  = document.getElementById('listaHistorial');
    const filtroFecha = document.getElementById('filtrFecha').value;
    const filtroMed   = document.getElementById('filtroMed').value;
    contenedor.innerHTML = "";

    let lista = [];
    if (tipoHistorial === 'med')   lista = registrosMed;
    if (tipoHistorial === 'sat')   lista = registrosSat;
    if (tipoHistorial === 'sueno') lista = registrosSueno;

    if (filtroFecha) lista = lista.filter(r => r.fecha === filtroFecha);
    if (filtroMed && tipoHistorial === 'med') lista = lista.filter(r => r.medicamento === filtroMed);

    if (lista.length === 0) {
        contenedor.innerHTML = "<p class='sin-resultados'>No hay registros.</p>";
        return;
    }

    lista.forEach(reg => {
        const div = document.createElement('div');
        div.className = `card-registro ${tipoHistorial === 'sat' ? 'sat' : (tipoHistorial === 'sueno' ? 'sueno' : '')}`;

        const normalizar = (s) => (s || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin tildes

        const nombreActual = normalizar(document.getElementById('nombre').value);
        const esPropio = nombreActual && normalizar(reg.nombre) === nombreActual;

        let cuerpo = "";
        if (tipoHistorial === 'med') {
            cuerpo = `
                <strong>${reg.medicamento}</strong> (${reg.cantidad})<br>
                <small>${reg.fecha} | ${reg.hora} | Por: <strong>${reg.nombre}</strong></small>
                <div class="dispositivo">📱 ${reg.dispositivo || 'Sin dispositivo'}</div>
            `;
        } else if (tipoHistorial === 'sat') {
            cuerpo = `
                <strong>SAT: ${reg.sat}${reg.fc ? ` &nbsp;|&nbsp; FC: ${reg.fc}` : ''}</strong><br>
                <small>${reg.fecha} | ${reg.hora} | Por: <strong>${reg.nombre}</strong></small>
                <div class="dispositivo">📱 ${reg.dispositivo || 'Sin dispositivo'}</div>
            `;
        } else if (tipoHistorial === 'sueno') {
            cuerpo = `
                <strong>${reg.estado}</strong><br>
                ${reg.observaciones ? `<em style="color:#666; font-size:0.85rem;">"${reg.observaciones}"</em><br>` : ''}
                <small>${reg.fecha} | ${reg.hora} | Por: <strong>${reg.nombre}</strong></small>
                <div class="dispositivo">📱 ${reg.dispositivo || 'Sin dispositivo'}</div>
            `;
        }

        const botonEliminar = esPropio
            ? `<button class="btn-eliminar" data-key="${reg._key}" data-tipo="${tipoHistorial}">🗑️</button>`
            : '';

        div.innerHTML = `
            <div class="card-contenido">${cuerpo}</div>
            ${botonEliminar}
        `;
        contenedor.appendChild(div);
    });

    // Listeners de los botones eliminar
    contenedor.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => {
            eliminarRegistro(btn.dataset.tipo, btn.dataset.key);
        });
    });
}

// ── Mostrar/ocultar filtro de medicamento según tab ──
function actualizarVisibilidadFiltros() {
    document.getElementById('grupoFiltroMed').style.display =
        tipoHistorial === 'med' ? 'block' : 'none';
}

// ── Calcular totales por período (medicamentos) ──
function calcularTotalesMed(periodo) {
    const filtrados = filtrarPorPeriodo(registrosMed, periodo);
    const conteo = {};
    filtrados.forEach(r => {
        conteo[r.medicamento] = (conteo[r.medicamento] || 0) + 1;
    });
    return conteo;
}

function filtrarPorPeriodo(lista, periodo) {
    const ahora = new Date();
    const { fecha: hoy } = obtenerFechaHoraActual();

    const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - diaSemana);
    const isAnio = inicioSemana.getFullYear();
    const isMes  = String(inicioSemana.getMonth() + 1).padStart(2, '0');
    const isDia  = String(inicioSemana.getDate()).padStart(2, '0');
    const inicioSemanaStr = `${isAnio}-${isMes}-${isDia}`;

    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-01`;

    return lista.filter(r => {
        if (periodo === 'dia')    return r.fecha === hoy;
        if (periodo === 'semana') return r.fecha >= inicioSemanaStr && r.fecha <= hoy;
        if (periodo === 'mes')    return r.fecha >= inicioMes && r.fecha <= hoy;
        return false;
    });
}

function mostrarTotales(periodo) {
    const conteo     = calcularTotalesMed(periodo);
    const contenedor = document.getElementById('contenidoTotal');
    const entradas   = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    const labels     = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' };

    if (entradas.length === 0) {
        contenedor.innerHTML = `<p class="sin-datos">No hay registros ${labels[periodo]}.</p>`;
        return;
    }

    contenedor.innerHTML = entradas.map(([med, count]) => `
        <div class="fila-total">
            <span class="med-nombre">${med}</span>
            <span class="med-count">${count} toma${count !== 1 ? 's' : ''}</span>
        </div>
    `).join('');
}

// ── GENERADOR DE INFORME EN TONO COLOQUIAL ──
function generarInforme(periodo) {
    const meds   = filtrarPorPeriodo(registrosMed, periodo);
    const sats   = filtrarPorPeriodo(registrosSat, periodo);
    const suenos = filtrarPorPeriodo(registrosSueno, periodo);

    const apertura = {
        dia:    "Hoy Pupy",
        semana: "Esta semana, Pupy",
        mes:    "Este mes, Pupy"
    }[periodo];

    if (meds.length === 0 && sats.length === 0 && suenos.length === 0) {
        return `<p>${apertura} no tiene registros cargados todavía. Cargá algún dato para que el informe tenga contenido.</p>`;
    }

    let texto = "";

    // ── Medicamentos ──
    if (meds.length > 0) {
        const conteoMed = {};
        meds.forEach(r => { conteoMed[r.medicamento] = (conteoMed[r.medicamento] || 0) + 1; });
        const entradas = Object.entries(conteoMed).sort((a, b) => b[1] - a[1]);

        const totalTomas = meds.length;

        let frase = `${apertura} tomó <strong>${totalTomas} ${totalTomas === 1 ? 'medicamento' : 'medicamentos'} en total</strong>`;
        if (entradas.length === 1) {
            const [med, count] = entradas[0];
            frase += `: ${count === 1 ? 'una dosis' : count + ' dosis'} de <strong>${med}</strong>.`;
        } else {
            const detalles = entradas.map(([med, count]) =>
                `<strong>${med}</strong> (${count} ${count === 1 ? 'vez' : 'veces'})`
            );
            const ultimo = detalles.pop();
            frase += `, que se reparten así: ${detalles.join(', ')} y ${ultimo}.`;
        }

        // Comentario sobre frecuencia según período
        if (periodo === 'dia' && totalTomas >= 4) {
            frase += " Fue un día con bastante medicación.";
        } else if (periodo === 'dia' && totalTomas === 1) {
            frase += " Solo necesitó una toma, así que estuvo tranqui.";
        } else if (periodo === 'semana' && totalTomas >= 15) {
            frase += " Fue una semana movida en cuanto a medicación.";
        }

        texto += `<p>${frase}</p>`;
    } else {
        texto += `<p>No se han ingresado datos de medicamentos.</p>`;
    }

    // ── Saturación ──
    if (sats.length > 0) {
        const valores = sats.map(s => Number(s.sat));
        const promedio = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
        const minimo   = Math.min(...valores);
        const maximo   = Math.max(...valores);
        const bajos    = valores.filter(v => v < 91).length;

        let fraseSat = `En cuanto a la saturación, se midió <strong>${valores.length} ${valores.length === 1 ? 'vez' : 'veces'}</strong>`;

        if (valores.length === 1) {
            fraseSat += ` y dio <strong>${valores[0]}</strong>.`;
        } else {
            fraseSat += `. El promedio fue <strong>${promedio}</strong>, con un mínimo de ${minimo} y un máximo de ${maximo}.`;
        }

        if (bajos > 0) {
            fraseSat += ` ⚠️ Hubo <strong>${bajos} ${bajos === 1 ? 'medición' : 'mediciones'} por debajo de 91</strong>, así que en esos momentos Pupy debía tener oxígeno.`;
        } else {
            fraseSat += ` Todas las mediciones dieron 91 o más, así que Pupy pudo estar sin oxígeno.`;
        }

        texto += `<p>${fraseSat}</p>`;
    } else {
        texto += `<p>No se han ingresado datos de saturación.</p>`;
    }

    // ── Sueño ──
    if (suenos.length > 0) {
        const conteoSueno = { 'Bien': 0, 'Muy Bien': 0, 'Mal': 0 };
        suenos.forEach(s => { if (conteoSueno[s.estado] !== undefined) conteoSueno[s.estado]++; });

        let fraseSueno = "";
        if (periodo === 'dia') {
            const ultimoSueno = suenos[0]; // ya están ordenados desc
            fraseSueno = `Sobre el descanso, durmió <strong>${ultimoSueno.estado}</strong>`;
            if (ultimoSueno.observaciones) {
                fraseSueno += ` y se anotó: "${ultimoSueno.observaciones}".`;
            } else {
                fraseSueno += ".";
            }
        } else {
            const partes = [];
            if (conteoSueno['Muy Bien'] > 0) partes.push(`<strong>${conteoSueno['Muy Bien']}</strong> ${conteoSueno['Muy Bien'] === 1 ? 'noche muy bien' : 'noches muy bien'}`);
            if (conteoSueno['Bien']     > 0) partes.push(`<strong>${conteoSueno['Bien']}</strong> ${conteoSueno['Bien']     === 1 ? 'noche bien'     : 'noches bien'}`);
            if (conteoSueno['Mal']      > 0) partes.push(`<strong>${conteoSueno['Mal']}</strong> ${conteoSueno['Mal']      === 1 ? 'noche mal'      : 'noches mal'}`);

            fraseSueno = `En cuanto al sueño, hubo registros de ${partes.length === 1 ? partes[0] : partes.slice(0,-1).join(', ') + ' y ' + partes.slice(-1)}.`;

            // Conclusión amable
            const malas = conteoSueno['Mal'];
            const buenas = conteoSueno['Bien'] + conteoSueno['Muy Bien'];
            if (malas === 0)            fraseSueno += " En general descansó bien 👍.";
            else if (malas > buenas)    fraseSueno += " Fueron más las noches difíciles que las buenas, habría que ver qué pasa.";
            else if (malas <= buenas/2) fraseSueno += " Mayormente descansó bien, salvo alguna noche complicada.";
            else                        fraseSueno += " Hubo de todo un poco.";
        }

        texto += `<p>${fraseSueno}</p>`;
    } else {
        texto += `<p>No se han ingresado datos de sueño.</p>`;
    }

    return texto;
}

function mostrarInforme(periodo) {
    document.getElementById('contenidoInforme').innerHTML = generarInforme(periodo);
}

// ── Helpers modales ──
function abrirModal(id)  { document.getElementById(id).style.display = 'flex'; }
function cerrarModal(id) { document.getElementById(id).style.display = 'none'; }

function mostrarStatus(mensaje, tipo) {
    const div = document.getElementById('statusMessage');
    div.innerHTML = `<span class='${tipo}'>${mensaje}</span>`;
    setTimeout(() => div.innerHTML = "", 3000);
}

function obtenerNombre() {
    const nombre = document.getElementById('nombre').value.trim();
    if (!nombre) {
        alert("Por favor ingresá tu nombre primero.");
        document.getElementById('nombre').focus();
        return null;
    }
    localStorage.setItem('nombre_med', nombre);
    return nombre;
}

// ── Registrar acción en tabla de log ──
function registrarLog(textoAccion) {
    const nombre = document.getElementById('nombre').value.trim() || 'Desconocido';
    const { fecha, hora } = obtenerFechaHoraActual();
    return database.ref('Log').push({
        fecha,
        hora,
        nombre,
        accion:    textoAccion,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

// ── Eliminar registro (solo si lo creó la misma persona) ──
function eliminarRegistro(tipo, key) {
    const normalizar = (s) => (s || '').toString().trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const nombreActual = normalizar(document.getElementById('nombre').value);
    if (!nombreActual) {
        alert("Ingresá tu nombre primero.");
        return;
    }

    const tabla = tipo === 'med' ? 'registros' : (tipo === 'sat' ? 'SAT' : 'Sueño');
    const lista = tipo === 'med' ? registrosMed   : (tipo === 'sat' ? registrosSat : registrosSueno);
    const reg   = lista.find(r => r._key === key);

    if (!reg) { alert("Registro no encontrado."); return; }

    if (normalizar(reg.nombre) !== nombreActual) {
        alert("Solo podés eliminar registros que vos mismo cargaste.");
        return;
    }

    // Confirmación
    let descripcion = "";
    if (tipo === 'med')   descripcion = `toma de ${reg.medicamento} (${reg.cantidad}) del ${reg.fecha} ${reg.hora}`;
    if (tipo === 'sat')   descripcion = `medición de saturación ${reg.sat} del ${reg.fecha} ${reg.hora}`;
    if (tipo === 'sueno') descripcion = `registro de sueño "${reg.estado}" del ${reg.fecha} ${reg.hora}`;

    if (!confirm(`¿Seguro que querés eliminar el registro?\n\n${descripcion}`)) return;

    database.ref(`${tabla}/${key}`).remove()
        .then(() => {
            registrarLog(`Eliminó el registro: ${descripcion}.`);
            mostrarStatus("🗑️ Registro eliminado", 'success');
        })
        .catch(error => alert("Error al eliminar: " + error.message));
}

// ── Preprocesar imagen para mejorar OCR sobre displays LED ──
function preprocesarImagen(img) {
    // Redimensionar para que el ancho sea ~1000px (mejor para Tesseract)
    const TARGET_W = 1000;
    const escala = TARGET_W / img.width;
    const w = TARGET_W;
    const h = Math.round(img.height * escala);

    // Versión 1: contraste alto + binarización (para displays oscuros con dígitos brillantes)
    const c1 = document.createElement('canvas');
    c1.width = w; c1.height = h;
    const ctx1 = c1.getContext('2d');
    ctx1.drawImage(img, 0, 0, w, h);
    const datos1 = ctx1.getImageData(0, 0, w, h);
    const px1 = datos1.data;

    // Convertir a gris y binarizar con umbral dinámico
    // Primero calcular gris promedio para usar como umbral adaptativo
    let suma = 0;
    for (let i = 0; i < px1.length; i += 4) {
        suma += (px1[i] * 0.299 + px1[i+1] * 0.587 + px1[i+2] * 0.114);
    }
    const promedio = suma / (px1.length / 4);
    const umbral = promedio * 1.15; // un poco arriba del promedio para destacar partes brillantes

    for (let i = 0; i < px1.length; i += 4) {
        const gris = px1[i] * 0.299 + px1[i+1] * 0.587 + px1[i+2] * 0.114;
        const valor = gris > umbral ? 0 : 255; // INVERTIDO: dígitos LED brillantes pasan a NEGRO sobre fondo blanco
        px1[i] = px1[i+1] = px1[i+2] = valor;
    }
    ctx1.putImageData(datos1, 0, 0);

    // Versión 2: misma pero sin invertir (por si la pantalla tiene fondo claro)
    const c2 = document.createElement('canvas');
    c2.width = w; c2.height = h;
    const ctx2 = c2.getContext('2d');
    ctx2.drawImage(img, 0, 0, w, h);
    const datos2 = ctx2.getImageData(0, 0, w, h);
    const px2 = datos2.data;

    for (let i = 0; i < px2.length; i += 4) {
        const gris = px2[i] * 0.299 + px2[i+1] * 0.587 + px2[i+2] * 0.114;
        const valor = gris > umbral ? 255 : 0;
        px2[i] = px2[i+1] = px2[i+2] = valor;
    }
    ctx2.putImageData(datos2, 0, 0);

    // Versión 3: gris simple con contraste aumentado (sin binarizar)
    const c3 = document.createElement('canvas');
    c3.width = w; c3.height = h;
    const ctx3 = c3.getContext('2d');
    ctx3.drawImage(img, 0, 0, w, h);
    const datos3 = ctx3.getImageData(0, 0, w, h);
    const px3 = datos3.data;

    for (let i = 0; i < px3.length; i += 4) {
        let gris = px3[i] * 0.299 + px3[i+1] * 0.587 + px3[i+2] * 0.114;
        // Aumentar contraste alrededor del 128
        gris = Math.min(255, Math.max(0, (gris - 128) * 1.8 + 128));
        px3[i] = px3[i+1] = px3[i+2] = gris;
    }
    ctx3.putImageData(datos3, 0, 0);

    return [c1, c2, c3];
}

// ── Toast de avisos ──
function mostrarToast(html, tipo = 'alerta', duracion = 3500) {
    const toast = document.getElementById('toast');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = html;
    toast.style.display = 'block';
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, duracion);
}

// ── Renderizar tabla de Stock Actual ──
function renderizarTablaStock() {
    const cont = document.getElementById('tablaStockActual');
    if (!cont) return;
    const stockActual = calcularStockActual();

    cont.innerHTML = MEDICAMENTOS.map(med => {
        const valor = stockActual[med];
        let claseExtra = '';
        if (valor <= 0)     claseExtra = 'cero';
        else if (valor < 5) claseExtra = 'bajo';
        return `
            <div class="fila-stock-actual ${claseExtra}">
                <span class="nombre-med">${med}</span>
                <span class="valor-stock">${valor}</span>
            </div>
        `;
    }).join('');
}

// ── Calcular stock actual de cada medicamento ──
function calcularStockActual() {
    const stockPorMed = {};
    MEDICAMENTOS.forEach(m => stockPorMed[m] = 0);

    // Sumar todos los ingresos de stock
    registrosStock.forEach(r => {
        if (stockPorMed[r.medicamento] !== undefined) {
            stockPorMed[r.medicamento] += Number(r.stockIngresado) || 0;
        }
    });

    // Restar las tomas registradas (cada toma consume 1)
    registrosMed.forEach(r => {
        if (stockPorMed[r.medicamento] !== undefined) {
            stockPorMed[r.medicamento] -= 1;
        }
    });

    return stockPorMed;
}

// ── Renderizar lista de medicamentos en el modal de Stock ──
function renderizarStockUI() {
    const cont = document.getElementById('listaStock');
    const stockActual = calcularStockActual();
    cont.innerHTML = "";

    MEDICAMENTOS.forEach(med => {
        // Últimos 3 ingresos de este medicamento
        const ingresos = registrosStock
            .filter(r => r.medicamento === med)
            .slice(0, 3);

        const historial = ingresos.length > 0
            ? ingresos.map(r => `+${r.stockIngresado} el ${r.fecha} ${r.hora} (${r.nombre})`).join('<br>')
            : 'Sin ingresos previos';

        const div = document.createElement('div');
        div.className = 'fila-stock';
        div.innerHTML = `
            <div class="med-titulo">${med}</div>
            <div class="stock-actual">Stock actual: <strong>${stockActual[med]}</strong></div>
            <div class="historial-stock">${historial}</div>
            <input type="number" min="0" placeholder="Cantidad a agregar" data-med="${med}" class="stock-input">
        `;
        cont.appendChild(div);
    });
}

actualizarValoresDefault();

window.onload = function() {
    const form        = document.getElementById('medForm');
    const nombreInput = document.getElementById('nombre');

    actualizarValoresDefault();
    poblarSelectores();
    actualizarVisibilidadFiltros();

    const nombreGuardado = localStorage.getItem('nombre_med');
    if (nombreGuardado) {
        nombreInput.value = nombreGuardado;
        mostrarSaludo(nombreGuardado);
    }
    nombreInput.addEventListener('input', () => {
        if (nombreInput.value.trim()) mostrarSaludo(nombreInput.value.trim());
        else document.getElementById('saludo').textContent = "";
        renderizarHistorial();
    });

    // ── Firebase: leer las TRES tablas ──
    function snapshotALista(snapshot) {
        if (!snapshot.exists()) return [];
        const datos = snapshot.val();
        return Object.entries(datos)
            .map(([key, val]) => ({ ...val, _key: key }))
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    database.ref('registros').on('value', (snapshot) => {
        registrosMed = snapshotALista(snapshot);
        renderizarHistorial();
        renderizarTablaStock();
    });

    database.ref('SAT').on('value', (snapshot) => {
        registrosSat = snapshotALista(snapshot);
        renderizarHistorial();
    });

    database.ref('Sueño').on('value', (snapshot) => {
        registrosSueno = snapshotALista(snapshot);
        renderizarHistorial();
    });

    database.ref('Stock').on('value', (snapshot) => {
        registrosStock = snapshotALista(snapshot);
        renderizarTablaStock();
    });

    // ── Tabs del historial ──
    document.querySelectorAll('.tab-hist').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-hist').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tipoHistorial = btn.dataset.tipo;
            actualizarVisibilidadFiltros();
            renderizarHistorial();
        });
    });

    // Filtros
    document.getElementById('filtrFecha').addEventListener('change', renderizarHistorial);
    document.getElementById('filtroMed').addEventListener('change', renderizarHistorial);
    document.getElementById('btnLimpiar').addEventListener('click', () => {
        document.getElementById('filtrFecha').value = '';
        document.getElementById('filtroMed').value  = '';
        renderizarHistorial();
    });

    // ── Botón Total ──
    document.getElementById('btnTotal').addEventListener('click', () => {
        periodoActivo = 'dia';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-periodo="dia"]').classList.add('active');
        mostrarTotales('dia');
        abrirModal('modalTotal');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mostrarTotales(btn.dataset.periodo);
        });
    });

    // ── Botón Informe ──
    document.getElementById('btnInforme').addEventListener('click', () => {
        document.querySelectorAll('.tab-inf').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-inf[data-periodo="dia"]').classList.add('active');
        mostrarInforme('dia');
        abrirModal('modalInforme');
    });

    document.querySelectorAll('.tab-inf').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-inf').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mostrarInforme(btn.dataset.periodo);
        });
    });

    // ── Botón Cargar Stock (con clave) ──
    const btnStock         = document.getElementById('btnStock');
    const claveStockInput  = document.getElementById('claveStock');
    const claveError       = document.getElementById('claveError');
    const CLAVE_STOCK      = "54321";

    btnStock.addEventListener('click', () => {
        if (!obtenerNombre()) return;
        claveStockInput.value = "";
        claveError.style.display = 'none';
        abrirModal('modalClave');
        setTimeout(() => claveStockInput.focus(), 100);
    });

    function verificarClave() {
        if (claveStockInput.value === CLAVE_STOCK) {
            cerrarModal('modalClave');
            renderizarStockUI();
            abrirModal('modalStock');
        } else {
            claveError.className = 'resultado-sat alerta';
            claveError.style.display = 'block';
            claveError.innerHTML = "❌ Clave incorrecta";
            claveStockInput.value = "";
            claveStockInput.focus();
        }
    }

    document.getElementById('btnVerificarClave').addEventListener('click', verificarClave);
    claveStockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verificarClave();
    });

    // Guardar stock — registra una entrada por cada medicamento con cantidad > 0
    document.getElementById('btnGuardarStock').addEventListener('click', () => {
        const nombre = obtenerNombre();
        if (!nombre) return;

        const inputs = document.querySelectorAll('.stock-input');
        const aGuardar = [];
        inputs.forEach(inp => {
            const cantidad = parseInt(inp.value);
            if (!isNaN(cantidad) && cantidad > 0) {
                aGuardar.push({ medicamento: inp.dataset.med, cantidad });
            }
        });

        if (aGuardar.length === 0) {
            alert("Ingresá al menos una cantidad para guardar.");
            return;
        }

        const { fecha, hora } = obtenerFechaHoraActual();
        const promesas = aGuardar.map(item =>
            database.ref('Stock').push({
                fecha, hora,
                medicamento:    item.medicamento,
                stockIngresado: item.cantidad,
                nombre,
                dispositivo:    detectarDispositivo(),
                timestamp:      firebase.database.ServerValue.TIMESTAMP
            })
        );

        Promise.all(promesas)
            .then(() => {
                cerrarModal('modalStock');
                const detalle = aGuardar.map(i => `${i.medicamento} (+${i.cantidad})`).join(', ');
                registrarLog(`Cargó stock: ${detalle}.`);
                mostrarStatus(`✅ Stock guardado (${aGuardar.length} ${aGuardar.length === 1 ? 'medicamento' : 'medicamentos'})`, 'success');
            })
            .catch(error => alert("Error al guardar: " + error.message));
    });

    // Cerrar modales
    document.querySelectorAll('.btn-cerrar').forEach(btn => {
        btn.addEventListener('click', () => cerrarModal(btn.dataset.cerrar));
    });
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });

    // ── Botón SAT ──
    const btnSat       = document.getElementById('btnSat');
    const satValor     = document.getElementById('satValor');
    const fcValor      = document.getElementById('fcValor');
    const satResultado = document.getElementById('satResultado');
    const btnFotoSat   = document.getElementById('btnFotoSat');
    const inputFoto    = document.getElementById('inputFoto');
    const ocrEstado    = document.getElementById('ocrEstado');

    btnSat.addEventListener('click', () => {
        if (!obtenerNombre()) return;
        satValor.value = "";
        fcValor.value  = "";
        satResultado.style.display = 'none';
        satResultado.className = 'resultado-sat';
        ocrEstado.style.display = 'none';
        abrirModal('modalSat');
        setTimeout(() => satValor.focus(), 100);
    });

    // Botón foto → abre cámara o galería
    btnFotoSat.addEventListener('click', () => {
        inputFoto.click();
    });

    // Procesar foto con OCR
    inputFoto.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        ocrEstado.className = 'ocr-estado';
        ocrEstado.style.display = 'block';
        ocrEstado.innerHTML = '🔍 Analizando imagen... (puede tardar unos segundos)';
        btnFotoSat.disabled = true;
        btnFotoSat.textContent = '⏳ Procesando...';

        try {
            // 1) Cargar imagen en un canvas
            const imagen = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });

            // 2) Preprocesar: redimensionar grande, gris, contraste, binarizar
            const procesadas = preprocesarImagen(imagen);

            // 3) Pasar las dos versiones (normal e invertida) por OCR y elegir la mejor
            const numerosDetectados = new Set();

            for (const canvas of procesadas) {
                try {
                    const { data } = await Tesseract.recognize(canvas, 'eng', {
                        tessedit_char_whitelist: '0123456789',
                        tessedit_pageseg_mode: Tesseract.PSM ? Tesseract.PSM.SINGLE_BLOCK : 6
                    });
                    const texto = (data.text || '').replace(/\s+/g, ' ');
                    console.log('OCR detectó (variante):', texto);
                    (texto.match(/\d{2,3}/g) || []).forEach(n => {
                        const num = parseInt(n);
                        if (num > 0 && num <= 999) numerosDetectados.add(num);
                    });
                } catch (e) {
                    console.warn('Error en una variante:', e);
                }
            }

            const numeros = Array.from(numerosDetectados);
            console.log('Números únicos detectados:', numeros);

            if (numeros.length === 0) {
                ocrEstado.className = 'ocr-estado error';
                ocrEstado.innerHTML = '❌ No se detectaron números.<br><small>Probá con otra foto más cercana, con buena luz, o cargá manualmente.</small>';
            } else {
                // Heurística: SAT 70-100, FC 40-200
                const satCandidatos = numeros.filter(n => n >= 70 && n <= 100);
                const fcCandidatos  = numeros.filter(n => n >= 40 && n <= 200);

                let satCandidato = satCandidatos[0];
                let fcCandidato  = fcCandidatos.find(n => n !== satCandidato);

                // Fallbacks
                if (!satCandidato && numeros.length >= 1) satCandidato = numeros[0];
                if (!fcCandidato  && numeros.length >= 2) fcCandidato  = numeros.find(n => n !== satCandidato);

                if (satCandidato) {
                    satValor.value = satCandidato;
                    satValor.dispatchEvent(new Event('input'));
                }
                if (fcCandidato) fcValor.value = fcCandidato;

                ocrEstado.className = 'ocr-estado exito';
                ocrEstado.innerHTML = `✅ Detectado: SAT <strong>${satCandidato || '?'}</strong>, FC <strong>${fcCandidato || '?'}</strong><br><small>Verificá los valores antes de guardar</small>`;
            }
        } catch (err) {
            console.error('Error OCR:', err);
            ocrEstado.className = 'ocr-estado error';
            ocrEstado.innerHTML = '❌ Error al analizar la imagen. Cargá los valores manualmente.';
        } finally {
            btnFotoSat.disabled = false;
            btnFotoSat.textContent = '📷 Tomar foto del oxímetro';
            inputFoto.value = ''; // permitir volver a subir la misma foto
        }
    });

    // Mensaje en vivo según valor
    satValor.addEventListener('input', () => {
        const val = parseInt(satValor.value);
        if (isNaN(val) || satValor.value === "") {
            satResultado.style.display = 'none';
            return;
        }
        if (val >= 91) {
            satResultado.className = 'resultado-sat bien';
            satResultado.innerHTML = `Pupy puede estar sin oxígeno<span class="icono-grande">😄</span>`;
        } else if (val < 79) {
            satResultado.className = 'resultado-sat critico';
            satResultado.innerHTML = `
                <strong>⚠️ Es un valor CRÍTICO</strong><br>
                Chequear el concentrador de oxígeno: tiene que estar encendido, con agua, las mangueras bien y le tiene que estar llegando oxígeno.<br>
                <strong>Si todo eso está bien, avisar a las hijas.</strong>
                <span class="icono-grande">😱</span>
            `;
        } else {
            satResultado.className = 'resultado-sat alerta';
            satResultado.innerHTML = `Pupy debería seguir con el oxígeno<span class="icono-grande">😐</span>`;
        }
        satResultado.style.display = 'block';
    });

    document.getElementById('btnGuardarSat').addEventListener('click', () => {
        const nombre = obtenerNombre();
        if (!nombre) return;

        const sat = parseInt(satValor.value);
        if (isNaN(sat) || sat < 0 || sat > 999) {
            alert("Ingresá un valor de saturación válido (entero hasta 3 cifras).");
            return;
        }

        const fc = parseInt(fcValor.value);
        // FC es opcional pero si se carga debe ser válido
        if (fcValor.value !== "" && (isNaN(fc) || fc < 0 || fc > 300)) {
            alert("Ingresá una frecuencia cardíaca válida (entero entre 0 y 300).");
            return;
        }

        const { fecha, hora } = obtenerFechaHoraActual();
        const registroSat = {
            fecha, hora,
            sat,
            fc: isNaN(fc) ? null : fc,
            nombre,
            dispositivo: detectarDispositivo(),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('SAT').push(registroSat)
            .then(() => {
                cerrarModal('modalSat');
                mostrarStatus("✅ Saturación registrada", 'success');
            })
            .catch(error => alert("Error al guardar: " + error.message));
    });

    // ── Botón Sueño ──
    const btnSueno        = document.getElementById('btnSueno');
    const suenoEstado     = document.getElementById('suenoEstado');
    const suenoObs        = document.getElementById('suenoObs');
    const suenoResultado  = document.getElementById('suenoResultado');

    btnSueno.addEventListener('click', () => {
        if (!obtenerNombre()) return;
        suenoEstado.value     = "";
        suenoObs.value        = "";
        suenoResultado.style.display = 'none';
        abrirModal('modalSueno');
    });

    suenoEstado.addEventListener('change', () => {
        if (suenoEstado.value === 'Mal') {
            suenoResultado.className = 'resultado-sueno alerta';
            suenoResultado.innerHTML = `Qué pena, contame ¿qué le pasó?<span class="icono-grande">😢</span>`;
            suenoResultado.style.display = 'block';
            suenoObs.focus();
        } else if (suenoEstado.value === 'Muy Bien') {
            suenoResultado.className = 'resultado-sueno feliz';
            suenoResultado.innerHTML = `¡Qué genia Pupy!<span class="icono-grande">😄</span>`;
            suenoResultado.style.display = 'block';
        } else {
            suenoResultado.style.display = 'none';
        }
    });

    document.getElementById('btnGuardarSueno').addEventListener('click', () => {
        const nombre = obtenerNombre();
        if (!nombre) return;

        if (!suenoEstado.value) {
            alert("Seleccioná cómo durmió.");
            return;
        }

        const { fecha, hora } = obtenerFechaHoraActual();
        const registroSueno = {
            fecha, hora,
            estado:        suenoEstado.value,
            observaciones: suenoObs.value.trim(),
            nombre,
            dispositivo:   detectarDispositivo(),
            timestamp:     firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('Sueño').push(registroSueno)
            .then(() => {
                cerrarModal('modalSueno');
                mostrarStatus("✅ Sueño registrado", 'success');
            })
            .catch(error => alert("Error al guardar: " + error.message));
    });

    // ── Guardar registro de medicamento ──
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nombre = nombreInput.value.trim();
        if (!nombre) { alert("Ingresá tu nombre."); return; }
        localStorage.setItem('nombre_med', nombre);

        const nuevoRegistro = {
            nombre,
            dispositivo: detectarDispositivo(),
            fecha:       document.getElementById('fecha').value,
            hora:        document.getElementById('hora').value,
            medicamento: document.getElementById('medicamento').value,
            cantidad:    document.getElementById('cantidad').value,
            timestamp:   firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('registros').push(nuevoRegistro)
            .then(() => {
                document.getElementById('medicamento').value = "";
                document.getElementById('cantidad').value    = "1";
                actualizarValoresDefault();
                mostrarStatus("✅ Guardado correctamente", 'success');

                // Chequear stock bajo después de la resta
                // (registrosMed se actualiza por el listener de Firebase, pero esperamos un tick)
                setTimeout(() => {
                    const stockActual = calcularStockActual();
                    const stockMed = stockActual[nuevoRegistro.medicamento];
                    if (stockMed !== undefined) {
                        if (stockMed <= 0) {
                            mostrarToast(
                                `¡No hay más <strong>${nuevoRegistro.medicamento}</strong>!<br>Yo avisé 😭<span class="icono-toast">😭</span>`,
                                'alerta',
                                6000
                            );
                        } else if (stockMed < 5) {
                            mostrarToast(
                                `Nos estamos quedando sin stock de <strong>${nuevoRegistro.medicamento}</strong><br>(quedan ${stockMed})<span class="icono-toast">😟</span>`,
                                'alerta',
                                5000
                            );
                        }
                    }
                }, 600);
            })
            .catch((error) => {
                mostrarStatus("❌ Error al guardar: " + error.message, 'error');
            });
    });
};
