// CONFIGURACIÓN DE FIREBASE — reemplazá TU_URL_AQUI con tu URL real
const firebaseConfig = {
    databaseURL: "https://controlmedicamentos-7784f-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ── Lista de medicamentos ── editala a tu gusto
const MEDICAMENTOS = [
    "Ibuprofeno 600",
    "Tafirol 1 gr",
    "Cafiaspirina",
    "Sertal",
    "Buscapina",
    "Ibuprofeno 400mg",
    "Paracetamol 500mg",
];

let todosLosRegistros = [];
let periodoActivo = 'dia';

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

// ── Saludo según hora ──
function mostrarSaludo(nombre) {
    const hora = new Date().getHours();
    let saludo = "";
    if (hora >= 0 && hora < 13)       saludo = `☀️ ¡Buen día, ${nombre}!`;
    else if (hora >= 13 && hora < 20) saludo = `🌤️ ¡Buenas tardes, ${nombre}!`;
    else                               saludo = `🌙 ¡Buenas noches, ${nombre}!`;
    document.getElementById('saludo').textContent = saludo;
}

// ── Fecha y hora local ──
function actualizarValoresDefault() {
    const ahora = new Date();
    const anio    = ahora.getFullYear();
    const mes     = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia     = String(ahora.getDate()).padStart(2, '0');
    const horas   = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');

    const f = document.getElementById('fecha');
    const h = document.getElementById('hora');
    if (f) f.value = `${anio}-${mes}-${dia}`;
    if (h) h.value = `${horas}:${minutos}`;
}

// ── Poblar selectores ──
function poblarSelectores() {
    const selectMed        = document.getElementById('medicamento');
    const selectFiltroMed  = document.getElementById('filtroMed');

    MEDICAMENTOS.forEach(med => {
        [selectMed, selectFiltroMed].forEach((sel, i) => {
            const opt = document.createElement('option');
            opt.value = med; opt.textContent = med;
            sel.appendChild(opt);
        });
    });
}

// ── Renderizar historial ──
function renderizarRegistros(registros) {
    const contenedor = document.getElementById('listaMedicamentos');
    contenedor.innerHTML = "";

    if (registros.length === 0) {
        contenedor.innerHTML = "<p class='sin-resultados'>No se encontraron registros.</p>";
        return;
    }

    registros.forEach(reg => {
        const div = document.createElement('div');
        div.className = 'card-registro';
        div.innerHTML = `
            <strong>${reg.medicamento}</strong> (${reg.cantidad})<br>
            <small>${reg.fecha} | ${reg.hora} | Por: <strong>${reg.nombre}</strong></small>
            <div class="dispositivo">📱 ${reg.dispositivo || 'Dispositivo no registrado'}</div>
        `;
        contenedor.appendChild(div);
    });
}

// ── Aplicar filtros ──
function aplicarFiltros() {
    const filtroFecha = document.getElementById('filtrFecha').value;
    const filtroMed   = document.getElementById('filtroMed').value;

    let filtrados = todosLosRegistros;
    if (filtroFecha) filtrados = filtrados.filter(r => r.fecha === filtroFecha);
    if (filtroMed)   filtrados = filtrados.filter(r => r.medicamento === filtroMed);

    renderizarRegistros(filtrados);
}

// ── Calcular totales por período ──
function calcularTotales(periodo) {
    const ahora = new Date();
    const hoy   = ahora.toISOString().split('T')[0];

    // Inicio de semana (lunes)
    const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - diaSemana);
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];

    // Inicio de mes
    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-01`;

    let filtrados = todosLosRegistros.filter(r => {
        if (periodo === 'dia')    return r.fecha === hoy;
        if (periodo === 'semana') return r.fecha >= inicioSemanaStr && r.fecha <= hoy;
        if (periodo === 'mes')    return r.fecha >= inicioMes && r.fecha <= hoy;
        return false;
    });

    // Agrupar por medicamento
    const conteo = {};
    filtrados.forEach(r => {
        conteo[r.medicamento] = (conteo[r.medicamento] || 0) + 1;
    });

    return conteo;
}

// ── Mostrar totales en el modal ──
function mostrarTotales(periodo) {
    const conteo     = calcularTotales(periodo);
    const contenedor = document.getElementById('contenidoTotal');
    const entradas   = Object.entries(conteo).sort((a, b) => b[1] - a[1]);

    const labels = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' };

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

// Ejecutar fecha antes del onload
actualizarValoresDefault();

window.onload = function() {
    const form        = document.getElementById('medForm');
    const nombreInput = document.getElementById('nombre');

    actualizarValoresDefault();
    poblarSelectores();

    // Nombre guardado y saludo
    const nombreGuardado = localStorage.getItem('nombre_med');
    if (nombreGuardado) {
        nombreInput.value = nombreGuardado;
        mostrarSaludo(nombreGuardado);
    }
    nombreInput.addEventListener('input', () => {
        if (nombreInput.value.trim()) mostrarSaludo(nombreInput.value.trim());
        else document.getElementById('saludo').textContent = "";
    });

    // Firebase: leer en tiempo real
    database.ref('registros').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const datos = snapshot.val();
            todosLosRegistros = Object.values(datos).sort((a, b) => b.timestamp - a.timestamp);
        } else {
            todosLosRegistros = [];
        }
        aplicarFiltros();
    }, (error) => {
        document.getElementById('listaMedicamentos').innerHTML =
            "<p style='text-align:center; color:#e74c3c;'>Error al leer: " + error.message + "</p>";
    });

    // Filtros historial
    document.getElementById('filtrFecha').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroMed').addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiar').addEventListener('click', () => {
        document.getElementById('filtrFecha').value = '';
        document.getElementById('filtroMed').value  = '';
        aplicarFiltros();
    });

    // Botón flotante Total → abrir modal
    document.getElementById('btnTotal').addEventListener('click', () => {
        periodoActivo = 'dia';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-periodo="dia"]').classList.add('active');
        mostrarTotales('dia');
        document.getElementById('modalTotal').style.display = 'flex';
    });

    // Cerrar modal
    document.getElementById('cerrarModal').addEventListener('click', () => {
        document.getElementById('modalTotal').style.display = 'none';
    });
    document.getElementById('modalTotal').addEventListener('click', function(e) {
        if (e.target === this) this.style.display = 'none';
    });

    // Tabs del modal
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            periodoActivo = btn.dataset.periodo;
            mostrarTotales(periodoActivo);
        });
    });

    // Guardar registro
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nombre = nombreInput.value.trim();
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

                const divStatus = document.getElementById('statusMessage');
                divStatus.innerHTML = "<span class='success'>✅ Guardado correctamente</span>";
                setTimeout(() => divStatus.innerHTML = "", 3000);
            })
            .catch((error) => {
                document.getElementById('statusMessage').innerHTML =
                    "<span class='error'>❌ Error al guardar: " + error.message + "</span>";
            });
    });
};
