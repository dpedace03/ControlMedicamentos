// CONFIGURACIÓN DE FIREBASE — reemplazá TU_URL_AQUI con tu URL real
const firebaseConfig = {
    databaseURL: "https://controlmedicamentos-7784f-default-rtdb.firebaseio.com/"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

function actualizarValoresDefault() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes  = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia  = String(ahora.getDate()).padStart(2, '0');
    const fechaHoy = `${anio}-${mes}-${dia}`;

    const horas   = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const horaAhora = `${horas}:${minutos}`;

    const fechaInput = document.getElementById('fecha');
    const horaInput  = document.getElementById('hora');

    if (fechaInput) fechaInput.value = fechaHoy;
    if (horaInput)  horaInput.value  = horaAhora;
}

// Ejecutar apenas el script carga, sin esperar window.onload
actualizarValoresDefault();

window.onload = function() {
    const form       = document.getElementById('medForm');
    const contenedor = document.getElementById('listaMedicamentos');

    // Segunda llamada por si acaso
    actualizarValoresDefault();

    // Leer registros en tiempo real
    database.ref('registros').on('value', (snapshot) => {
        contenedor.innerHTML = "";
        if (snapshot.exists()) {
            const datos = snapshot.val();
            const registrosOrdenados = Object.values(datos).sort((a, b) => b.timestamp - a.timestamp);
            registrosOrdenados.forEach(reg => {
                const div = document.createElement('div');
                div.className = 'card-registro';
                div.innerHTML = `
                    <strong>${reg.medicamento}</strong> (${reg.cantidad})<br>
                    <small>${reg.fecha} | ${reg.hora} | Por: ${reg.celular}</small>
                `;
                contenedor.appendChild(div);
            });
        } else {
            contenedor.innerHTML = "<p style='text-align:center; color:#999;'>No hay registros aún.</p>";
        }
    }, (error) => {
        contenedor.innerHTML = "<p style='text-align:center; color:#e74c3c;'>Error al leer: " + error.message + "</p>";
    });

    // Guardar nuevo registro
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nuevoRegistro = {
            celular:     document.getElementById('celular').value,
            fecha:       document.getElementById('fecha').value,
            hora:        document.getElementById('hora').value,
            medicamento: document.getElementById('medicamento').value,
            cantidad:    document.getElementById('cantidad').value,
            timestamp:   firebase.database.ServerValue.TIMESTAMP
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
