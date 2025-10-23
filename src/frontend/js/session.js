const API_BASE = window.location.origin;
const logoutBtn = document.getElementById('logout');

function eliminar_sesion() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = "/login";
}

(async function validarToken() {
    const token = localStorage.getItem('token');

    if (token != null) {
        try {
            const res = await fetch(`${API_BASE}/api/user`, {
                method: "GET",
                headers: { Authorization: token }
            });

            const data = await res.json();
            console.log(res);

            if (!data.ok) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = "/login";
            }
            else {
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