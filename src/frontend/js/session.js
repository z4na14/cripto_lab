(async function validarToken() {
    const token = localStorage.getItem('token');

    if (token != null) {
        try {
            const res = await fetch(`${API_BASE}/api/user`, {
                method: "GET",
                headers: { Authorization: "Bearer " + token }
            });
            const data = await res.json();
            if (data.ok) {
                window.location.href = "/";
            } else {
                localStorage.setItem('user', null);
                localStorage.setItem('token', null);
                window.location.href = "/login";
            }
        } catch (err) {
            mostrarError("No se pudo conectar con el servidor.");
        }
    }
})();