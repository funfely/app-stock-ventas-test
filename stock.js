// stock.js
// Manejo de stock de productos

const PRODUCTOS_STORAGE_KEY = "stockProductos";
const VENTAS_STORAGE_KEY = "ventasRegistradas";
const MOVIMIENTOS_STOCK_STORAGE_KEY = "movimientosStock";
const ARCHIVO_STOCK_INICIAL = "assets/CHARA JUNTO  A ALE1.xlsx";

const PRODUCTOS_INICIALES = [
    { id: 1, codigo: "REM-001", nombre: "Remera básica", stock: 10, precioLista: 3500, precioEfectivo: 3200 },
    { id: 2, codigo: "CJP-002", nombre: "Campera de jean", stock: 5, precioLista: 9500, precioEfectivo: 8800 },
    { id: 3, codigo: "PJG-003", nombre: "Pantalón jogger", stock: 8, precioLista: 4200, precioEfectivo: 3900 },
    { id: 4, codigo: "VCS-004", nombre: "Vestido casual", stock: 6, precioLista: 5200, precioEfectivo: 4800 }
];

const carrito = [];

function obtenerFechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function leerArrayStorage(clave) {
    try {
        const valor = JSON.parse(localStorage.getItem(clave) || "[]");
        return Array.isArray(valor) ? valor : [];
    } catch (error) {
        return [];
    }
}

const ventasRegistradas = leerArrayStorage(VENTAS_STORAGE_KEY);
const movimientosStock = leerArrayStorage(MOVIMIENTOS_STOCK_STORAGE_KEY);

function guardarVentasRegistradas() {
    localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(ventasRegistradas));
}

function guardarMovimientosStock() {
    localStorage.setItem(MOVIMIENTOS_STOCK_STORAGE_KEY, JSON.stringify(movimientosStock));
}

function registrarMovimientoStock({
    tipo,
    producto,
    cantidad,
    motivo,
    ventaId = null,
    metodoPago = null,
    totalLinea = null
}) {
    if (!producto || !tipo || !cantidad) return;

    movimientosStock.push({
        id: `mov-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        fecha: obtenerFechaLocalISO(),
        fechaHora: new Date().toISOString(),
        tipo,
        productoId: producto.id,
        codigo: producto.codigo || "",
        producto: producto.nombre || "Producto",
        cantidad: Math.abs(Number(cantidad) || 0),
        motivo: motivo || "",
        ventaId,
        metodoPago,
        totalLinea
    });
    guardarMovimientosStock();
}

function registrarVentaDesdeCarrito(items, metodoPago) {
    if (!Array.isArray(items) || items.length === 0) return null;

    const ventaId = `vta-${Date.now()}`;
    const itemsVenta = items.map((item) => {
        const precioUnitario = metodoPago === "tarjeta" ? item.precioLista : item.precioEfectivo;
        return {
            id: item.id,
            codigo: item.codigo || "",
            nombre: item.nombre || "Producto",
            cantidad: Math.max(1, Number(item.cantidad) || 1),
            precioUnitario,
            subtotal: precioUnitario * (Math.max(1, Number(item.cantidad) || 1))
        };
    });

    const total = itemsVenta.reduce((acum, item) => acum + item.subtotal, 0);
    const cantidadPrendas = itemsVenta.reduce((acum, item) => acum + item.cantidad, 0);

    ventasRegistradas.push({
        id: ventaId,
        fecha: obtenerFechaLocalISO(),
        fechaHora: new Date().toISOString(),
        metodoPago,
        cantidadPrendas,
        total,
        items: itemsVenta
    });
    guardarVentasRegistradas();

    itemsVenta.forEach((item) => {
        registrarMovimientoStock({
            tipo: "salida_venta",
            producto: { id: item.id, codigo: item.codigo, nombre: item.nombre },
            cantidad: item.cantidad,
            motivo: "Salida por venta confirmada",
            ventaId,
            metodoPago,
            totalLinea: item.subtotal
        });
    });

    return { ventaId, total, cantidadPrendas };
}

function ajustarStockConMotivo(id, cambio, tipoMovimiento, motivo) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    const stockAnterior = producto.stock;
    producto.stock = Math.max(0, producto.stock + cambio);
    const variacionReal = producto.stock - stockAnterior;
    if (variacionReal === 0) return;

    guardarProductos();
    registrarMovimientoStock({
        tipo: tipoMovimiento,
        producto,
        cantidad: Math.abs(variacionReal),
        motivo
    });

    const inputStock = document.getElementById(`stock-input-${id}`);
    if (inputStock) inputStock.value = producto.stock;

    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderVentas === "function") renderVentas();
}

function obtenerVentasRegistradas() {
    return [...ventasRegistradas];
}

function obtenerMovimientosStock() {
    return [...movimientosStock];
}

function normalizarNumero(valor, fallback = 0) {
    if (typeof valor === "number" && Number.isFinite(valor)) return valor;
    const texto = String(valor || "")
        .replace(/\$/g, "")
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : fallback;
}

function normalizarProducto(producto, indice = 0) {
    const nombre = String(producto.nombre || "").trim();
    const codigoBase = producto.codigo ?? producto.codigoProducto ?? producto.articulo ?? producto.sku ?? "";
    const codigo = String(codigoBase || "").trim();
    const idNumerico = normalizarNumero(producto.id, indice + 1);
    const precioLista = Math.max(0, normalizarNumero(producto.precioLista ?? producto.lista ?? producto.precioTarjeta ?? producto.precio, 0));
    const precioEfectivo = Math.max(0, normalizarNumero(producto.precioEfectivo ?? producto.efectivo ?? producto.precioCbu ?? producto.precio, 0));

    return {
        id: idNumerico > 0 ? idNumerico : indice + 1,
        codigo,
        nombre: nombre || `Producto ${indice + 1}`,
        stock: Math.max(0, normalizarNumero(producto.stock, 0)),
        precioLista,
        precioEfectivo,
        // Compatibilidad temporal con vistas antiguas.
        precio: precioLista,
        imagen: producto.imagen || ""
    };
}

function productoTienePreciosVenta(producto) {
    return producto.precioLista > 0 && producto.precioEfectivo > 0;
}

function leerProductosGuardados() {
    try {
        const guardados = JSON.parse(localStorage.getItem(PRODUCTOS_STORAGE_KEY) || "null");
        if (Array.isArray(guardados) && guardados.length > 0) {
            return guardados.map((producto, indice) => normalizarProducto(producto, indice));
        }
    } catch (error) {
        console.error("No se pudo leer el stock guardado.", error);
    }
    return null;
}

function guardarProductos() {
    localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(productos));
}

const productos = leerProductosGuardados() || PRODUCTOS_INICIALES.map((producto, indice) => normalizarProducto(producto, indice));

function actualizarCarritoUI() {
    const cantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const carritoCantidad = document.getElementById("carrito-cantidad");
    if (carritoCantidad) carritoCantidad.textContent = cantidad;
}

function actualizarEstadoImportacion(mensaje, tipo = "info") {
    const estado = document.getElementById("excel-import-status");
    if (!estado) return;
    estado.textContent = mensaje;
    estado.dataset.state = tipo;
}

function normalizarEncabezado(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obtenerValorFila(fila, encabezadosPosibles) {
    const entradas = Object.entries(fila);
    const encontrada = entradas.find(([clave]) => encabezadosPosibles.includes(normalizarEncabezado(clave)));
    return encontrada ? encontrada[1] : "";
}

function convertirFilasAProductos(filas) {
    const importados = [];

    filas.forEach((fila, indice) => {
        const nombre = obtenerValorFila(fila, ["producto", "nombre", "descripcion", "detalle", "prenda", "item"]);
        const codigoArticulo = obtenerValorFila(fila, ["articulo", "cod articulo", "codigo articulo", "codigo de articulo"]);
        const codigoAlternativo = obtenerValorFila(fila, ["codigo", "cod", "sku", "codigo de barras", "codigodebarras"]);
        const stock = obtenerValorFila(fila, ["stock", "cantidad", "existencia", "disponible", "unidades"]);
        const precioLista = obtenerValorFila(fila, ["lista", "precio lista", "preciolista", "precio tarjeta", "tarjeta", "credito", "precio credito"]);
        const precioEfectivo = obtenerValorFila(fila, ["efectivo", "precio efectivo", "precioefectivo", "precio cbu", "cbu", "transferencia", "transferencia cbu"]);
        const precioGeneral = obtenerValorFila(fila, ["precio", "valor", "importe", "precio venta", "precioventa"]);
        const id = obtenerValorFila(fila, ["id"]);
        const imagen = obtenerValorFila(fila, ["imagen", "foto", "url imagen", "urlimagen"]);

        if (
            !String(nombre || "").trim() &&
            !String(codigoArticulo || codigoAlternativo || "").trim() &&
            String(stock || "").trim() === "" &&
            String(precioLista || "").trim() === "" &&
            String(precioEfectivo || "").trim() === "" &&
            String(precioGeneral || "").trim() === ""
        ) {
            return;
        }

        importados.push(normalizarProducto({
            id: id || indice + 1,
            codigo: codigoArticulo || codigoAlternativo || id,
            nombre: nombre || `Producto ${codigoArticulo || codigoAlternativo || indice + 1}`,
            stock,
            precioLista: precioLista || precioGeneral,
            precioEfectivo: precioEfectivo || precioGeneral,
            imagen
        }, indice));
    });

    return importados;
}

function reemplazarProductos(nuevosProductos) {
    productos.splice(0, productos.length, ...nuevosProductos.map((producto, indice) => normalizarProducto(producto, indice)));
    carrito.splice(0, carrito.length);
    guardarProductos();
}

function actualizarVistasProductos() {
    renderStock();
    actualizarCarritoUI();
    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderVentas === "function") renderVentas();
}

function importarProductosDesdeArrayBuffer(buffer, nombreArchivo) {
    if (typeof XLSX === "undefined") {
        throw new Error("La librería XLSX no está disponible.");
    }

    const workbook = XLSX.read(buffer, { type: "array" });
    const primeraHoja = workbook.SheetNames[0];
    const hoja = workbook.Sheets[primeraHoja];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });
    const productosImportados = convertirFilasAProductos(filas);

    if (productosImportados.length === 0) {
        throw new Error("No se encontraron filas válidas en el archivo.");
    }

    reemplazarProductos(productosImportados);
    actualizarVistasProductos();
    actualizarEstadoImportacion(`Se cargaron ${productosImportados.length} productos desde ${nombreArchivo}.`, "success");
}

function importarStockDesdeExcel(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const buffer = new Uint8Array(e.target.result);
            importarProductosDesdeArrayBuffer(buffer, archivo.name);
        } catch (error) {
            console.error("No se pudo importar el archivo.", error);
            actualizarEstadoImportacion("No pude leer el archivo. Revisá que sea un Excel o CSV válido.", "error");
        } finally {
            event.target.value = "";
        }
    };
    lector.readAsArrayBuffer(archivo);
}

async function cargarStockDesdeAssets() {
    try {
        const respuesta = await fetch(encodeURI(ARCHIVO_STOCK_INICIAL));
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }
        const buffer = new Uint8Array(await respuesta.arrayBuffer());
        importarProductosDesdeArrayBuffer(buffer, ARCHIVO_STOCK_INICIAL.split("/").pop());
    } catch (error) {
        console.error("No se pudo cargar el Excel desde assets.", error);
        actualizarEstadoImportacion("No pude cargar el Excel de assets automáticamente. Podés subirlo manualmente desde este panel.", "error");
    }
}

function agregarAlCarrito(id, origen = "stock") {
    const producto = productos.find(p => p.id === id);
    if (!producto) {
        alert("No se pudo agregar el producto al carrito.");
        return;
    }

    const stockDisponible = Number(producto.stock) || 0;
    if (stockDisponible <= 0) {
        const nombreProducto = producto.nombre || "Este producto";
        const mensajeSinStock = origen === "catalogo"
            ? `No se puede sumar ${nombreProducto} porque no tiene stock.`
            : `No hay stock disponible para ${nombreProducto}.`;
        alert(mensajeSinStock);
        return;
    }
    if (!productoTienePreciosVenta(producto)) {
        alert("Este producto necesita precio de lista y precio en efectivo para estar a la venta.");
        return;
    }

    const item = carrito.find(c => c.id === id);
    if (item) {
        item.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            cantidad: 1,
            precioLista: producto.precioLista,
            precioEfectivo: producto.precioEfectivo
        });
    }

    producto.stock -= 1;
    guardarProductos();
    actualizarCarritoUI();
    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderVentas === "function") renderVentas();
    const celdaStock = document.getElementById(`stock-count-${id}`);
    if (celdaStock) celdaStock.textContent = producto.stock;

    if (origen === "catalogo") {
        alert("Tu item fue agregado al carrito.");
    }
}

window.agregarAlCarrito = agregarAlCarrito;

function renderStock() {
    const stockSection = document.getElementById("stock");
    if (!stockSection) return;
    if (typeof esOwnerAutenticado === "function" && !esOwnerAutenticado()) {
        stockSection.innerHTML = "";
        return;
    }

    stockSection.innerHTML = `
        <h2>Stock de productos</h2>
        <div class="importacion-stock-panel">
            <h3>Importar stock desde Excel</h3>
            <p>Podés subir un .xlsx, .xls o .csv con columnas como articulo (codigo), producto o nombre, stock, lista y efectivo.</p>
            <div class="importacion-stock-acciones">
                <label class="excel-upload-label" for="excel-stock-input">Subir archivo</label>
                <input type="file" id="excel-stock-input" accept=".xlsx,.xls,.csv">
                <button type="button" id="cargar-assets-stock">Cargar Excel de assets</button>
            </div>
            <p id="excel-import-status" class="excel-import-status">${productos.length} productos disponibles actualmente.</p>
        </div>
    `;

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-scroll";

    const table = document.createElement("table");
    table.className = "stock-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock</th>
                <th>Lista (tarjeta)</th>
                <th>Efectivo / CBU</th>
                <th>Venta</th>
                <th>Acciones</th>
                <th>Carrito</th>
            </tr>
        </thead>
        <tbody>
            ${productos.map(p => `
                <tr>
                    <td>${p.codigo || "-"}</td>
                    <td>${p.nombre}</td>
                    <td>
                        <input
                            id="stock-input-${p.id}"
                            type="number"
                            min="0"
                            step="1"
                            value="${p.stock}"
                            onchange="actualizarStockDirecto(${p.id}, this.value)"
                            onkeydown="aplicarStockConEnter(event, ${p.id}, this.value)"
                        >
                    </td>
                    <td>
                        <input
                            id="precio-lista-input-${p.id}"
                            type="number"
                            min="0"
                            step="1"
                            value="${p.precioLista}"
                            onchange="actualizarPrecioDirecto(${p.id}, 'precioLista', this.value)"
                            onkeydown="aplicarPrecioConEnter(event, ${p.id}, 'precioLista', this.value)"
                        >
                    </td>
                    <td>
                        <input
                            id="precio-efectivo-input-${p.id}"
                            type="number"
                            min="0"
                            step="1"
                            value="${p.precioEfectivo}"
                            onchange="actualizarPrecioDirecto(${p.id}, 'precioEfectivo', this.value)"
                            onkeydown="aplicarPrecioConEnter(event, ${p.id}, 'precioEfectivo', this.value)"
                        >
                    </td>
                    <td>${productoTienePreciosVenta(p) ? "Activa" : "Falta precio"}</td>
                    <td>
                        <div class="stock-acciones-grid">
                            <button onclick="ajustarStockConMotivo(${p.id}, 1, 'entrada', 'Nueva entrada de stock')">Entrada +</button>
                            <button onclick="ajustarStockConMotivo(${p.id}, -1, 'baja_falla', 'Baja por falla del producto')">Baja falla -</button>
                            <button onclick="ajustarStockConMotivo(${p.id}, 1, 'cambio_prenda', 'Cambio de prenda (ingreso)')">Cambio +</button>
                            <button onclick="ajustarStockConMotivo(${p.id}, -1, 'cambio_prenda', 'Cambio de prenda (egreso)')">Cambio -</button>
                        </div>
                    </td>
                    <td>
                        <button onclick="agregarAlCarrito(${p.id})">Agregar 🛒</button>
                    </td>
                </tr>
            `).join("")}
        </tbody>
    `;

    tableWrapper.appendChild(table);
    stockSection.appendChild(tableWrapper);

    const excelInput = document.getElementById("excel-stock-input");
    if (excelInput) {
        excelInput.addEventListener("change", importarStockDesdeExcel);
    }

    const botonAssets = document.getElementById("cargar-assets-stock");
    if (botonAssets) {
        botonAssets.addEventListener("click", cargarStockDesdeAssets);
    }

    actualizarCarritoUI();
}

function modificarStock(id, cambio) {
    const tipo = cambio >= 0 ? "entrada" : "baja_falla";
    const motivo = cambio >= 0 ? "Nueva entrada de stock" : "Baja por falla del producto";
    ajustarStockConMotivo(id, cambio, tipo, motivo);
}

function actualizarStockDirecto(id, nuevoValor) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    const stockAnterior = producto.stock;
    const stockNormalizado = Math.max(0, Math.floor(normalizarNumero(nuevoValor, producto.stock)));
    producto.stock = stockNormalizado;
    guardarProductos();

    const variacion = stockNormalizado - stockAnterior;
    if (variacion > 0) {
        registrarMovimientoStock({
            tipo: "entrada",
            producto,
            cantidad: variacion,
            motivo: "Ajuste manual de stock (entrada)"
        });
    } else if (variacion < 0) {
        registrarMovimientoStock({
            tipo: "baja_falla",
            producto,
            cantidad: Math.abs(variacion),
            motivo: "Ajuste manual de stock (baja)"
        });
    }

    const inputStock = document.getElementById(`stock-input-${id}`);
    if (inputStock) inputStock.value = producto.stock;

    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderVentas === "function") renderVentas();
}

function aplicarStockConEnter(event, id, valor) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    actualizarStockDirecto(id, valor);
}

function actualizarPrecioDirecto(id, tipoPrecio, nuevoValor) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    if (tipoPrecio !== "precioLista" && tipoPrecio !== "precioEfectivo") return;

    const precioNormalizado = Math.max(0, Math.floor(normalizarNumero(nuevoValor, producto[tipoPrecio])));
    producto[tipoPrecio] = precioNormalizado;
    if (tipoPrecio === "precioLista") {
        producto.precio = precioNormalizado;
    }

    const itemCarrito = carrito.find(item => item.id === id);
    if (itemCarrito) {
        itemCarrito[tipoPrecio] = precioNormalizado;
    }

    guardarProductos();

    const inputLista = document.getElementById(`precio-lista-input-${id}`);
    if (inputLista) inputLista.value = producto.precioLista;
    const inputEfectivo = document.getElementById(`precio-efectivo-input-${id}`);
    if (inputEfectivo) inputEfectivo.value = producto.precioEfectivo;

    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderVentas === "function") renderVentas();
}

function aplicarPrecioConEnter(event, id, tipoPrecio, valor) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    actualizarPrecioDirecto(id, tipoPrecio, valor);
}

window.addEventListener("DOMContentLoaded", async () => {
    renderStock();
    setupBarcodeScanner();
    actualizarCarritoUI();

    if (!leerProductosGuardados()) {
        await cargarStockDesdeAssets();
    }
});

function setupBarcodeScanner() {
    const startScanBtn = document.getElementById("start-scan");
    const scannerDiv = document.getElementById("scanner");
    const barcodeResult = document.getElementById("barcode-result");
    const assignForm = document.getElementById("assign-stock-form");
    let scannedCode = null;

    if (!startScanBtn || !scannerDiv || !barcodeResult || !assignForm || typeof Quagga === "undefined") {
        return;
    }

    startScanBtn.addEventListener("click", () => {
        scannerDiv.style.display = "block";
        barcodeResult.textContent = "Escaneando...";
        assignForm.style.display = "none";
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector("#barcode-video"),
                constraints: {
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
            }
        }, function(err) {
            if (err) {
                barcodeResult.textContent = "Error al iniciar cámara: " + err;
                return;
            }
            Quagga.start();
        });
    });

    Quagga.onDetected(function(data) {
        scannedCode = data.codeResult.code;
        barcodeResult.textContent = "Código detectado: " + scannedCode;
        Quagga.stop();
        assignForm.style.display = "block";
    });

    assignForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const usuario = document.getElementById("usuario").value;
        const stockSumar = parseInt(document.getElementById("stock-sumar").value, 10);
        let producto = productos.find(p => String(p.id) === String(scannedCode) || String(p.codigo) === String(scannedCode));

        if (!producto) {
            producto = normalizarProducto({ id: productos.length + 1, codigo: scannedCode, nombre: "Producto " + scannedCode, stock: 0, precioLista: 0, precioEfectivo: 0 }, productos.length);
            productos.push(producto);
        }

        producto.stock += stockSumar;
        guardarProductos();
        registrarMovimientoStock({
            tipo: "entrada",
            producto,
            cantidad: stockSumar,
            motivo: `Nueva entrada de stock por escaneo (${usuario})`
        });
        actualizarVistasProductos();
        assignForm.style.display = "none";
        scannerDiv.style.display = "none";
        barcodeResult.textContent = `Stock asignado por ${usuario} al producto ${producto.nombre} (${producto.codigo || producto.id}). Nuevo stock: ${producto.stock}`;
    });
}

window.productoTienePreciosVenta = productoTienePreciosVenta;
window.actualizarStockDirecto = actualizarStockDirecto;
window.aplicarStockConEnter = aplicarStockConEnter;
window.actualizarPrecioDirecto = actualizarPrecioDirecto;
window.aplicarPrecioConEnter = aplicarPrecioConEnter;
window.modificarStock = modificarStock;
window.ajustarStockConMotivo = ajustarStockConMotivo;
window.registrarVentaDesdeCarrito = registrarVentaDesdeCarrito;
window.obtenerVentasRegistradas = obtenerVentasRegistradas;
window.obtenerMovimientosStock = obtenerMovimientosStock;
