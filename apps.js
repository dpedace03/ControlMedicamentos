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
    "Cafiaspirina",
    "Tafirol 1 gr",
    "Ibuprofeno 600",
    "Tafirol DUO",
    "Tafirol Espasmo",
    "Buscapina",
    "Sertal",
    "Qura ",
    "Acemuk",
];

let todosLosRegistros = [];

// ── Detectar dispositivo desde User Agent ──
function detectarDispositivo() {
    const ua = navigator.userAgent;
    let os      = "Desconocido";
    let device  = "Dispositivo desconocido";

    if (/iPhone/.test(ua))                          { device = "iPhone";  os = "iOS"; }
    else if (/iPad/.test(ua))                       { device = "iPad";    os = "iOS"; }
    else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = "Android Phone"; os = "Android"; }
    else if (/Android/.test(ua))                    { device = "Android Tablet"; os = "Android"; }
    else if (/Windows/.test(ua))                    { device = "PC";      os = "Windows"; }
    else if (/Macintosh/.test(ua))                  { device = "Mac";     os = "macOS"; }
    else if (/Linux/.test(ua))                      { device = "PC";      os = "Linux"; }

    // Intentar leer modelo de Android
    const modelMatch = ua.match(/\(Linux.*?;\s*(.*?)\s*Build/);
    if (modelMatch && os === "Android") {
        device = modelMatch[1];
    }

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

// ── Fecha y hora local como default ──
function actualizarValoresDefault() {
    const ahora = new Date();
    const anio  = ahora.getFullYear();
    const mes   = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia   = String(ahora.getDate()).padStart(2, '0');
    const horas   = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');

    const fechaInput = document.getElementById('fecha');
    const horaInput  = document.getElementById('hora');
    if (fechaInput) fechaInput.value = `${anio}-${mes}-${dia}`;
    if (horaInput)  horaInput.value  = `${horas}:${minutos}`;
}

// ── Poblar selectores de medicamentos ──
function poblarSelectores() {
    const selectMed       = document.getElementById('medicamento');
    const selectFiltroMed = document.getElementById('filtroMed');

    MEDICAMENTOS.forEach(med => {
        const opt1 = document.createElement('option');
        opt1.value = med; opt1.textContent = med;
        selectMed.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = med; opt2.textContent = med;
        selectFiltroMed.appendChild(opt2);
    });
}

// ── Renderizar registros en pantalla ──
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

// ── Aplicar filtros sobre los registros locales ──
function aplicarFiltros() {
    const filtroFecha = document.getElementById('filtrFecha').value;
    const filtroMed   = document.getElementById('filtroMed').value;

    let filtrados = todosLosRegistros;
    if (filtroFecha) filtrados = filtrados.filter(r => r.fecha === filtroFecha);
    if (filtroMed)   filtrados = filtrados.filter(r => r.medicamento === filtroMed);

    renderizarRegistros(filtrados);
}

// Ejecutar fecha/hora antes del onload
actualizarValoresDefault();

window.onload = function() {
    const form        = document.getElementById('medForm');
    const nombreInput = document.getElementById('nombre');

    actualizarValoresDefault();
    poblarSelectores();

    // Recuperar nombre guardado y mostrar saludo
    const nombreGuardado = localStorage.getItem('nombre_med');
    if (nombreGuardado) {
        nombreInput.value = nombreGuardado;
        mostrarSaludo(nombreGuardado);
    }

    // Actualizar saludo cuando el usuario escribe su nombre
    nombreInput.addEventListener('input', () => {
        if (nombreInput.value.trim()) mostrarSaludo(nombreInput.value.trim());
        else document.getElementById('saludo').textContent = "";
    });

    // Leer registros en tiempo real desde Firebase
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

    // Filtros
    document.getElementById('filtrFecha').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroMed').addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiar').addEventListener('click', () => {
        document.getElementById('filtrFecha').value = '';
        document.getElementById('filtroMed').value  = '';
        aplicarFiltros();
    });

    // Guardar nuevo registro
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nombre = nombreInput.value.trim();
        localStorage.setItem('nombre_med', nombre);

        const nuevoRegistro = {
            nombre,
            dispositivo:  detectarDispositivo(),
            fecha:        document.getElementById('fecha').value,
            hora:         document.getElementById('hora').value,
            medicamento:  document.getElementById('medicamento').value,
            cantidad:     document.getElementById('cantidad').value,
            timestamp:    firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('registros').push(nuevoRegistro)
            .then(() => {
                document.getElementById('medicamento').value = "";
                document.getElementById('cantidad').value    = "";
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
