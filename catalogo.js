// catalogo.js
// Catálogo de ventas online

// Usamos los mismos productos del stock para mostrar en el catálogo
function renderCatalogo() {
    const catalogoSection = document.getElementById("catalogo");
    catalogoSection.innerHTML = "<h2>Catálogo de productos</h2>";
    const grid = document.createElement("div");
    grid.className = "catalogo-grid";
    productos.forEach(p => {
        const card = document.createElement("div");
        card.className = "catalogo-card";
        let imgSrc = p.imagen ? p.imagen : "https://via.placeholder.com/120x120?text=Prenda";
        card.innerHTML = `
            <div style='text-align:center;margin-bottom:8px;'>
                <img src="${imgSrc}" alt="Imagen de ${p.nombre}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <br>
                <select onchange="seleccionarImagenCatalogo(event, ${p.id})" style="margin-top:6px;border-radius:12px;padding:6px 12px;">
                    <option value="">Elegir imagen...</option>
                    <option value="assets/img/remera.jpg">Remera</option>
                    <option value="assets/img/campera.jpg">Campera</option>
                    <option value="assets/img/pantalon.jpg">Pantalón</option>
                    <option value="assets/img/vestido.jpg">Vestido</option>
                </select>
            </div>
            // Manejo de selección de imagen en catálogo
            window.seleccionarImagenCatalogo = function(event, id) {
                const value = event.target.value;
                if (!value) return;
                const producto = productos.find(p => p.id === id);
                if (producto) {
                    producto.imagen = value;
                    renderCatalogo();
                }
            };
            <h3>${p.nombre}</h3>
            <p>Stock disponible: ${p.stock}</p>
            <p>Precio: $${p.precio}</p>
            <button onclick="agregarAlCarrito(${p.id})">Agregar al carrito</button>
        `;
        grid.appendChild(card);
    });
    // Manejo de subida de imagen en catálogo
    window.subirImagenCatalogo = function(event, id) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const producto = productos.find(p => p.id === id);
            if (producto) {
                producto.imagen = e.target.result;
                renderCatalogo();
            }
        };
        reader.readAsDataURL(file);
    };
    catalogoSection.appendChild(grid);
}

// Carrito de compras
// ...existing code...
// Usamos la función global agregarAlCarrito definida en stock.js para unificar el carrito

// Inicializar catálogo al cargar
window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("catalogo")) {
        renderCatalogo();
    }
});
