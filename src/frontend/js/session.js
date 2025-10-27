const API_BASE = window.location.origin;
const logoutBtn = document.getElementById('logout');

// Funcion para vaciar la sesion del usuario en el navegador
// y redirigir a la pagina de inicio de sesion
function eliminar_sesion() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = "/login";
}

// Función en linea asincrona que comprueba que el token del usuario
// sea valido, mandandolo al servidor

(async function validarToken() {
    const token = localStorage.getItem('token');

    if (token != null) {
        try {
            const res = await fetch(`${API_BASE}/api/user`, {
                method: "GET",
                headers: { Authorization: token }
            });

            const data = await res.json();

            if (!data.ok) {
                eliminar_sesion();
            }
            else {
                // Cambiar el nombre de usuario que aparece en la barra de navegacion
                document.getElementById('user_tag').textContent = data.user;
            }
        } catch (err) {
            mostrarError("Error de conexión al servidor");
            console.log(err);
        }
    } else {
        window.location.href = "/login";
    }
})();

logoutBtn.addEventListener('click', eliminar_sesion, false);
