const logoutBtn = document.getElementById('logout');

function eliminar_sesion() {
    localStorage.setItem('user', null);
    localStorage.setItem('token', null);
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
            if (data.ok) {
                window.location.href = "/login";
            } else {
                localStorage.setItem('user', null);
                localStorage.setItem('token', null);
            }
        } catch (err) {
            console.log("No se pudo conectar con el servidor.");
        }
    }
})();


logoutBtn.addEventListener('click', eliminar_sesion, false);