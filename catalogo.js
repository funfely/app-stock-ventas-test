// catalogo.js
// Catálogo de ventas online

const IMAGENES_PRODUCTOS_KEY = "catalogoImagenesProductos";

function leerImagenesGuardadas() {
    try {
        return JSON.parse(localStorage.getItem(IMAGENES_PRODUCTOS_KEY) || "{}");
    } catch (error) {
        return {};
    }
}

function guardarImagenProducto(id, imagen) {
    const imagenes = leerImagenesGuardadas();
    imagenes[id] = imagen;
    localStorage.setItem(IMAGENES_PRODUCTOS_KEY, JSON.stringify(imagenes));
}

window.seleccionarImagenCatalogo = function(event, id) {
    const value = event.target.value;
    if (!value) return;
    const producto = productos.find(p => p.id === id);
    if (producto) {
        producto.imagen = value;
        guardarImagenProducto(id, value);
        renderCatalogo();
    }
};

window.subirImagenCatalogo = function(event, id) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const producto = productos.find(p => p.id === id);
        if (producto) {
            producto.imagen = e.target.result;
            guardarImagenProducto(id, e.target.result);
            renderCatalogo();
        }
    };
    reader.readAsDataURL(file);
};

function normalizarTextoCategoria(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();
}

function singularizar(palabra) {
    if (palabra.endsWith("es") && palabra.length > 4) {
        return palabra.slice(0, -2);
    }
    if (palabra.endsWith("s") && palabra.length > 3) {
        return palabra.slice(0, -1);
    }
    return palabra;
}

function capitalizar(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const CATEGORIAS_PRIORIZADAS = [
    { singular: "chaleco", plural: "chalecos" },
    { singular: "blusa", plural: "blusas" },
    { singular: "remera", plural: "remeras" },
    { singular: "campera", plural: "camperas" },
    { singular: "vestido", plural: "vestidos" },
    { singular: "pantalon", plural: "pantalones" },
    { singular: "jogger", plural: "joggers" },
    { singular: "jean", plural: "jeans" },
    { singular: "camisa", plural: "camisas" },
    { singular: "buzo", plural: "buzos" },
    { singular: "short", plural: "shorts" },
    { singular: "falda", plural: "faldas" },
    { singular: "pollera", plural: "polleras" },
    { singular: "top", plural: "tops" },
    { singular: "musculosa", plural: "musculosas" },
    { singular: "body", plural: "bodys" },
    { singular: "calza", plural: "calzas" },
    { singular: "legging", plural: "leggings" },
    { singular: "cardigan", plural: "cardigans" },
    { singular: "sweater", plural: "sweaters" }
];

function escaparRegex(texto) {
    return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function obtenerCategoriaProducto(nombreProducto) {
    const nombreNormalizado = normalizarTextoCategoria(nombreProducto);

    // Regla general: si el nombre contiene una palabra clave conocida, se agrupa en esa categoría.
    for (const categoria of CATEGORIAS_PRIORIZADAS) {
        const patron = new RegExp(`\\b${escaparRegex(categoria.singular)}(es|s)?\\b`);
        if (patron.test(nombreNormalizado)) {
            return {
                clave: categoria.plural,
                titulo: capitalizar(categoria.plural)
            };
        }
    }

    const primeraPalabra = nombreNormalizado.split(/\s+/).filter(Boolean)[0] || "otros";
    const base = singularizar(primeraPalabra);
    let etiqueta = base;
    if (!etiqueta.endsWith("s")) {
        etiqueta = `${etiqueta}s`;
    }
    return {
        clave: etiqueta,
        titulo: capitalizar(etiqueta)
    };
}

// Usamos los mismos productos del stock para mostrar en el catálogo
function renderCatalogo() {
    const catalogoSection = document.getElementById("catalogo");
    catalogoSection.innerHTML = "<h2>Catálogo de productos</h2>";
    const imagenesGuardadas = leerImagenesGuardadas();

    const productosPorCategoria = new Map();
    productos.forEach((p) => {
        const categoria = obtenerCategoriaProducto(p.nombre);
        if (!productosPorCategoria.has(categoria.clave)) {
            productosPorCategoria.set(categoria.clave, {
                titulo: categoria.titulo,
                items: []
            });
        }
        productosPorCategoria.get(categoria.clave).items.push(p);
    });

    const categoriasOrdenadas = Array.from(productosPorCategoria.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "es", { sensitivity: "base" }));

    const layoutCatalogo = document.createElement("div");
    layoutCatalogo.className = "catalogo-layout";

    const menuCatalogo = document.createElement("div");
    menuCatalogo.className = "catalogo-menu";
    menuCatalogo.innerHTML = `
        <p class="catalogo-menu-titulo">Submenú de catálogo</p>
        <div class="catalogo-menu-lista"></div>
    `;

    const menuLista = menuCatalogo.querySelector(".catalogo-menu-lista");
    categoriasOrdenadas.forEach(([claveCategoria, categoriaData]) => {
        const link = document.createElement("a");
        link.className = "catalogo-menu-link";
        link.href = `#catalogo-seccion-${claveCategoria}`;
        link.textContent = categoriaData.titulo;
        menuLista.appendChild(link);
    });

    const contenidoCatalogo = document.createElement("div");
    contenidoCatalogo.className = "catalogo-contenido";

    layoutCatalogo.appendChild(menuCatalogo);
    layoutCatalogo.appendChild(contenidoCatalogo);
    catalogoSection.appendChild(layoutCatalogo);

    categoriasOrdenadas.forEach(([claveCategoria, categoriaData]) => {
        const bloqueCategoria = document.createElement("section");
        bloqueCategoria.className = "catalogo-seccion";
        bloqueCategoria.id = `catalogo-seccion-${claveCategoria}`;

        const tituloCategoria = document.createElement("h3");
        tituloCategoria.className = "catalogo-seccion-titulo";
        tituloCategoria.textContent = categoriaData.titulo;
        bloqueCategoria.appendChild(tituloCategoria);

        const grid = document.createElement("div");
        grid.className = "catalogo-grid";

        categoriaData.items
            .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" }))
            .forEach((p) => {
        const puedeVenderse = typeof productoTienePreciosVenta === "function"
            ? productoTienePreciosVenta(p)
            : p.precioLista > 0 && p.precioEfectivo > 0;
        const card = document.createElement("div");
        card.className = "catalogo-card";
        card.id = `catalogo-item-${p.id}`;
        if (!p.imagen && imagenesGuardadas[p.id]) {
            p.imagen = imagenesGuardadas[p.id];
        }
        let imgSrc = p.imagen ? p.imagen : "https://via.placeholder.com/120x120?text=Prenda";
        card.innerHTML = `
            <div style='text-align:center;margin-bottom:8px;'>
                <img src="${imgSrc}" alt="Imagen de ${p.nombre}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <br>
                <select onchange="seleccionarImagenCatalogo(event, ${p.id})" style="margin-top:6px;border-radius:12px;padding:6px 12px;">
                    <option value="">Elegir imagen...</option>
                    <option value="assets/img/remera.jpg" ${p.imagen === "assets/img/remera.jpg" ? "selected" : ""}>Remera</option>
                    <option value="assets/img/campera.jpg" ${p.imagen === "assets/img/campera.jpg" ? "selected" : ""}>Campera</option>
                    <option value="assets/img/pantalon.jpg" ${p.imagen === "assets/img/pantalon.jpg" ? "selected" : ""}>Pantalón</option>
                    <option value="assets/img/vestido.jpg" ${p.imagen === "assets/img/vestido.jpg" ? "selected" : ""}>Vestido</option>
                </select>
                <br>
                <label style="display:inline-block;margin-top:8px;background:#eee;border-radius:10px;padding:6px 10px;cursor:pointer;">
                    Subir imagen
                    <input type="file" accept="image/*" onchange="subirImagenCatalogo(event, ${p.id})" style="display:none;">
                </label>
            </div>
            <h3>${p.nombre}</h3>
            <p>Código: ${p.codigo || "-"}</p>
            <p>Stock disponible: ${p.stock}</p>
            <p>Lista (tarjeta): $${p.precioLista}</p>
            <p>Efectivo / CBU: $${p.precioEfectivo}</p>
            <p>${puedeVenderse ? "Disponible para venta" : "Falta precio de lista o efectivo"}</p>
            <button class="catalogo-agregar-btn">Agregar al carrito</button>
        `;
        const botonAgregar = card.querySelector(".catalogo-agregar-btn");
        if (botonAgregar) {
            botonAgregar.addEventListener("click", () => {
                if (typeof agregarAlCarrito === "function") {
                    agregarAlCarrito(p.id, "catalogo");
                }
            });
        }
        grid.appendChild(card);
            });

        bloqueCategoria.appendChild(grid);
        contenidoCatalogo.appendChild(bloqueCategoria);
    });
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
