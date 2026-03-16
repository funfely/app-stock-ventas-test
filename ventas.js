// ventas.js
// Vista del carrito y proceso de pago

let metodoPagoSeleccionado = "tarjeta";
const PEDIDOS_STORAGE_KEY = "pedidosPendientes";
const CLIENTE_PEDIDO_STORAGE_KEY = "clientePedidoDraft";

const pedidosRegistrados = (() => {
    try {
        const pedidos = JSON.parse(localStorage.getItem(PEDIDOS_STORAGE_KEY) || "[]");
        return Array.isArray(pedidos) ? pedidos : [];
    } catch (error) {
        return [];
    }
})();

let datosClientePedido = (() => {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLIENTE_PEDIDO_STORAGE_KEY) || "{}");
        return {
            nombre: String(guardado.nombre || ""),
            telefono: String(guardado.telefono || "")
        };
    } catch (error) {
        return { nombre: "", telefono: "" };
    }
})();

function guardarPedidosRegistrados() {
    localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(pedidosRegistrados));
}

function guardarDatosClientePedido() {
    localStorage.setItem(CLIENTE_PEDIDO_STORAGE_KEY, JSON.stringify(datosClientePedido));
}

function obtenerFechaHoraTexto(fechaIso) {
    if (!fechaIso) return "-";
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return "-";
    return fecha.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function normalizarTelefonoWhatsapp(telefono) {
    return String(telefono || "").replace(/\D/g, "");
}

function construirLinkWhatsappPedido(pedido) {
    const telefono = normalizarTelefonoWhatsapp(pedido.clienteTelefono);
    if (!telefono) return "";
    const mensaje = encodeURIComponent(
        `Hola ${pedido.clienteNombre || ""}, tu pedido ${pedido.id} ya fue aprobado. Coordinemos la entrega con Cloudy. Total: $${pedido.total}.`
    );
    return `https://wa.me/${telefono}?text=${mensaje}`;
}

function obtenerPedidosRegistrados() {
    return [...pedidosRegistrados].sort((a, b) => String(b.fechaHora || "").localeCompare(String(a.fechaHora || "")));
}

function crearPedidoPendiente(items, metodoPago, cliente) {
    if (!Array.isArray(items) || items.length === 0) return null;

    const pedidoId = `ped-${Date.now()}`;
    const itemsPedido = items.map((item) => {
        const cantidad = Math.max(1, Number(item.cantidad) || 1);
        const precioUnitario = obtenerPrecioPorMetodo(item, metodoPago);
        return {
            id: item.id,
            codigo: item.codigo || "",
            nombre: item.nombre || "Producto",
            cantidad,
            precioLista: item.precioLista,
            precioEfectivo: item.precioEfectivo,
            precioUnitario,
            subtotal: precioUnitario * cantidad
        };
    });

    const total = itemsPedido.reduce((acum, item) => acum + item.subtotal, 0);
    const cantidadPrendas = itemsPedido.reduce((acum, item) => acum + item.cantidad, 0);

    const pedido = {
        id: pedidoId,
        fecha: typeof obtenerFechaLocalISO === "function" ? obtenerFechaLocalISO() : new Date().toISOString().slice(0, 10),
        fechaHora: new Date().toISOString(),
        metodoPago,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono,
        estado: "pendiente",
        total,
        cantidadPrendas,
        items: itemsPedido,
        ventaId: null,
        fechaResolucion: null
    };

    pedidosRegistrados.push(pedido);
    guardarPedidosRegistrados();
    return pedido;
}

function actualizarDatosClienteDesdeFormulario() {
    const inputNombre = document.getElementById("cliente-nombre");
    const inputTelefono = document.getElementById("cliente-telefono");
    if (!inputNombre || !inputTelefono) return datosClientePedido;

    datosClientePedido = {
        nombre: String(inputNombre.value || "").trim(),
        telefono: String(inputTelefono.value || "").trim()
    };
    guardarDatosClientePedido();
    return datosClientePedido;
}

function vincularFormularioCliente() {
    const inputNombre = document.getElementById("cliente-nombre");
    const inputTelefono = document.getElementById("cliente-telefono");
    [inputNombre, inputTelefono].forEach((input) => {
        if (input) {
            input.addEventListener("input", actualizarDatosClienteDesdeFormulario);
        }
    });
}

function obtenerUltimoPedidoPendienteCliente() {
    const telefono = normalizarTelefonoWhatsapp(datosClientePedido.telefono);
    if (!telefono) return null;
    return obtenerPedidosRegistrados().find((pedido) => normalizarTelefonoWhatsapp(pedido.clienteTelefono) === telefono);
}

function renderEstadoUltimoPedido(ventasSection) {
    const pedido = obtenerUltimoPedidoPendienteCliente();
    if (!pedido) return;

    const mensajes = {
        pendiente: "Tu pedido está pendiente de acreditación. El owner lo revisará manualmente.",
        aprobado: "Tu pago fue aprobado. Ya podés coordinar la entrega con el owner.",
        incompleto: "El pago quedó como incompleto. El stock volvió al catálogo y podés intentar nuevamente."
    };

    const whatsappLink = pedido.estado === "aprobado" ? construirLinkWhatsappPedido(pedido) : "";

    ventasSection.innerHTML += `
        <div class="pedido-cliente-estado pedido-cliente-estado--${pedido.estado}">
            <h3>Estado de tu pedido ${pedido.id}</h3>
            <p>${mensajes[pedido.estado] || "Estado actualizado."}</p>
            <p><strong>Total:</strong> $${pedido.total} | <strong>Medio:</strong> ${pedido.metodoPago}</p>
            ${whatsappLink ? `<a class="pedido-whatsapp-link" href="${whatsappLink}" target="_blank" rel="noopener noreferrer">Coordinar entrega por WhatsApp</a>` : ""}
        </div>
    `;
}

function obtenerPrecioPorMetodo(item, metodoPago) {
    return metodoPago === "tarjeta" ? item.precioLista : item.precioEfectivo;
}

function renderVentas() {
    const ventasSection = document.getElementById("ventas");
    if (!ventasSection) return;

    ventasSection.innerHTML = "<h2>Carrito de compras</h2>";
    renderEstadoUltimoPedido(ventasSection);

    if (typeof carrito === "undefined" || carrito.length === 0) {
        ventasSection.innerHTML += "<p>El carrito está vacío. Agregá productos desde Catálogo para comenzar una venta.</p>";
        return;
    }

    const list = document.createElement("ul");
    list.className = "carrito-list";
    let total = 0;

    ventasSection.innerHTML += `
        <div class="ventas-datos-cliente">
            <label>
                <strong>Nombre del cliente</strong>
                <input type="text" id="cliente-nombre" placeholder="Ej: Ana Pérez" value="${datosClientePedido.nombre}">
            </label>
            <label>
                <strong>WhatsApp del cliente</strong>
                <input type="tel" id="cliente-telefono" placeholder="5491122334455" value="${datosClientePedido.telefono}">
            </label>
        </div>
        <div style="margin-bottom:12px;">
            <label for="metodo-pago-select"><strong>Medio de pago:</strong></label>
            <select id="metodo-pago-select" style="margin-left:8px;">
                <option value="tarjeta" ${metodoPagoSeleccionado === "tarjeta" ? "selected" : ""}>Tarjeta (precio de lista)</option>
                <option value="efectivo" ${metodoPagoSeleccionado === "efectivo" ? "selected" : ""}>Efectivo / Transferencia CBU</option>
            </select>
        </div>
    `;

    const carritoOrdenado = carrito
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => {
            const comparacionNombre = String(a.item.nombre || "").localeCompare(String(b.item.nombre || ""), "es", { sensitivity: "base" });
            if (comparacionNombre !== 0) return comparacionNombre;
            return String(a.item.codigo || "").localeCompare(String(b.item.codigo || ""), "es", { sensitivity: "base" });
        });

    carritoOrdenado.forEach(({ item, idx }) => {
        const precioUnitario = obtenerPrecioPorMetodo(item, metodoPagoSeleccionado);
        const subtotal = precioUnitario * item.cantidad;
        total += subtotal;
        const li = document.createElement("li");
        li.innerHTML = `
            <div>
                <strong>${item.nombre}</strong><br>
                <span class='carrito-cantidad'>Código: ${item.codigo || "-"}</span>
                <span class='carrito-cantidad'>Cantidad: ${item.cantidad}</span>
                <span class='carrito-precio'>Precio unitario: $${precioUnitario}</span>
                <span class='carrito-subtotal'>Subtotal: $${subtotal}</span>
            </div>
            <div class="carrito-item-acciones">
                <button onclick='restarCantidad(${idx})'>-</button>
                <button onclick='sumarCantidad(${idx})'>+</button>
                <button onclick='eliminarDelCarrito(${idx})'>Eliminar</button>
            </div>
        `;
        list.appendChild(li);
    });

    ventasSection.appendChild(list);
    ventasSection.innerHTML += `<div class='carrito-total'>Total: $${total}</div>`;
    ventasSection.innerHTML += `<button id='pagar-btn'>Pagar</button>`;

    const metodoPagoSelect = document.getElementById("metodo-pago-select");
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener("change", (event) => {
            metodoPagoSeleccionado = event.target.value;
            renderVentas();
        });
    }

    vincularFormularioCliente();

    const btn = document.getElementById("pagar-btn");
    if (btn) btn.addEventListener("click", mostrarPagoQR);
}

function eliminarDelCarrito(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (producto) producto.stock += item.cantidad;
    carrito.splice(idx, 1);
    if (typeof guardarProductos === "function") guardarProductos();
    renderVentas();
    if (typeof actualizarCarritoUI === "function") actualizarCarritoUI();
    if (typeof renderCatalogo === "function") renderCatalogo();
}

function sumarCantidad(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (producto && producto.stock > 0) {
        item.cantidad += 1;
        producto.stock -= 1;
        if (typeof guardarProductos === "function") guardarProductos();
        renderVentas();
        if (typeof actualizarCarritoUI === "function") actualizarCarritoUI();
        if (typeof renderCatalogo === "function") renderCatalogo();
    } else {
        alert("No hay más stock disponible para este producto.");
    }
}

function restarCantidad(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (item.cantidad > 1) {
        item.cantidad -= 1;
        if (producto) producto.stock += 1;
        if (typeof guardarProductos === "function") guardarProductos();
        renderVentas();
        if (typeof actualizarCarritoUI === "function") actualizarCarritoUI();
        if (typeof renderCatalogo === "function") renderCatalogo();
    } else {
        eliminarDelCarrito(idx);
    }
}

function mostrarPagoQR() {
    const cliente = actualizarDatosClienteDesdeFormulario();
    if (!cliente.nombre) {
        alert("Ingresá el nombre del cliente antes de continuar.");
        return;
    }

    if (!normalizarTelefonoWhatsapp(cliente.telefono)) {
        alert("Ingresá un WhatsApp válido para poder coordinar la entrega.");
        return;
    }

    const ventasSection = document.getElementById("ventas");
    let total = 0;
    carrito.forEach(item => {
        total += obtenerPrecioPorMetodo(item, metodoPagoSeleccionado) * item.cantidad;
    });

    ventasSection.innerHTML = `
        <div class='qr-pago'>
            <h3>Escaneá el QR para pagar</h3>
            <img src='https://api.qrserver.com/v1/create-qr-code/?data=Pago%20Indumentaria%20${Date.now()}&size=200x200' alt='QR de pago' />
            <p>Total a pagar: <strong>$${total}</strong></p>
            <p>Medio seleccionado: <strong>${metodoPagoSeleccionado === "tarjeta" ? "Tarjeta (precio de lista)" : "Efectivo / Transferencia CBU"}</strong></p>
            <p><strong>Cliente:</strong> ${cliente.nombre} · <strong>WhatsApp:</strong> ${cliente.telefono}</p>
            <p>
                <a href='https://www.mercadopago.com.ar/' target='_blank' class='mp-link'>Mercado Pago</a> |
                <a href='https://www.modo.com.ar/' target='_blank' class='modo-link'>MODO</a> |
                <span style='font-weight:bold;'>CBU: 0000003100031000310003</span>
            </p>
            <p>Una vez realizado el pago, el pedido quedará pendiente hasta que el owner confirme la acreditación.</p>
            <button onclick='confirmarPago()'>Confirmar pago</button>
            <button onclick='renderVentas()'>Volver al carrito</button>
        </div>
    `;
}

function confirmarPago() {
    if (!Array.isArray(carrito) || carrito.length === 0) {
        renderVentas();
        return;
    }

    const cliente = datosClientePedido;
    const itemsVenta = carrito.map((item) => ({ ...item }));
    const pedido = crearPedidoPendiente(itemsVenta, metodoPagoSeleccionado, cliente);

    carrito.splice(0, carrito.length);
    if (typeof guardarProductos === "function") guardarProductos();
    if (typeof actualizarCarritoUI === "function") actualizarCarritoUI();
    if (typeof renderCatalogo === "function") renderCatalogo();
    renderVentas();
    if (typeof renderPagos === "function") renderPagos();

    if (pedido) {
        alert(`Pedido ${pedido.id} creado. Queda pendiente hasta que el owner confirme la acreditación.`);
    } else {
        alert("No pude crear el pedido.");
    }
}

function devolverStockPedido(pedido) {
    (pedido.items || []).forEach((item) => {
        const producto = productos.find((p) => p.id === item.id);
        if (!producto) return;
        producto.stock += Number(item.cantidad) || 0;
        if (typeof registrarMovimientoStock === "function") {
            registrarMovimientoStock({
                tipo: "entrada",
                producto,
                cantidad: Number(item.cantidad) || 0,
                motivo: `Pago incompleto. Stock devuelto del pedido ${pedido.id}`
            });
        }
    });
    if (typeof guardarProductos === "function") guardarProductos();
}

function aprobarPagoPedido(idPedido) {
    const pedido = pedidosRegistrados.find((item) => item.id === idPedido);
    if (!pedido || pedido.estado !== "pendiente") return;

    let resultadoVenta = null;
    if (typeof registrarVentaDesdeCarrito === "function") {
        resultadoVenta = registrarVentaDesdeCarrito(pedido.items, pedido.metodoPago);
    }

    pedido.estado = "aprobado";
    pedido.ventaId = resultadoVenta ? resultadoVenta.ventaId : null;
    pedido.fechaResolucion = new Date().toISOString();
    guardarPedidosRegistrados();

    const whatsappLink = construirLinkWhatsappPedido(pedido);
    if (typeof renderPagos === "function") renderPagos();
    if (typeof renderVentas === "function") renderVentas();
    if (typeof renderReportes === "function") renderReportes();

    if (whatsappLink) {
        window.open(whatsappLink, "_blank", "noopener,noreferrer");
    }
}

function marcarPagoIncompleto(idPedido) {
    const pedido = pedidosRegistrados.find((item) => item.id === idPedido);
    if (!pedido || pedido.estado !== "pendiente") return;

    devolverStockPedido(pedido);
    pedido.estado = "incompleto";
    pedido.fechaResolucion = new Date().toISOString();
    guardarPedidosRegistrados();

    if (typeof renderCatalogo === "function") renderCatalogo();
    if (typeof renderStock === "function") renderStock();
    if (typeof renderPagos === "function") renderPagos();
    if (typeof renderVentas === "function") renderVentas();
}

function renderPagos() {
    const pagosSection = document.getElementById("pagos");
    if (!pagosSection) return;

    if (typeof esOwnerAutenticado === "function" && !esOwnerAutenticado()) {
        pagosSection.innerHTML = "";
        return;
    }

    const pedidos = obtenerPedidosRegistrados();
    const pendientes = pedidos.filter((pedido) => pedido.estado === "pendiente");
    const resueltos = pedidos.filter((pedido) => pedido.estado !== "pendiente");

    const renderPedido = (pedido) => {
        const whatsappLink = pedido.estado === "aprobado" ? construirLinkWhatsappPedido(pedido) : "";
        const itemsHtml = (pedido.items || []).map((item) => `
            <li>${item.nombre} · ${item.cantidad}u · $${item.subtotal}</li>
        `).join("");

        return `
            <article class="pedido-card pedido-card--${pedido.estado}">
                <div class="pedido-card-header">
                    <div>
                        <h3>${pedido.id}</h3>
                        <p>${obtenerFechaHoraTexto(pedido.fechaHora)}</p>
                    </div>
                    <span class="pedido-estado pedido-estado--${pedido.estado}">${pedido.estado}</span>
                </div>
                <p><strong>Cliente:</strong> ${pedido.clienteNombre || "Sin nombre"}</p>
                <p><strong>WhatsApp:</strong> ${pedido.clienteTelefono || "Sin dato"}</p>
                <p><strong>Medio:</strong> ${pedido.metodoPago} · <strong>Total:</strong> $${pedido.total}</p>
                <ul class="pedido-items-lista">${itemsHtml}</ul>
                <div class="pedido-acciones">
                    ${pedido.estado === "pendiente" ? `<button type="button" onclick="aprobarPagoPedido('${pedido.id}')">Pago exitoso</button>
                    <button type="button" class="pedido-btn-secundario" onclick="marcarPagoIncompleto('${pedido.id}')">Pago incompleto</button>` : ""}
                    ${whatsappLink ? `<a class="pedido-whatsapp-link" href="${whatsappLink}" target="_blank" rel="noopener noreferrer">WhatsApp entrega</a>` : ""}
                </div>
            </article>
        `;
    };

    pagosSection.innerHTML = `
        <h2>Pagos a validar</h2>
        <div class="pagos-resumen">
            <div class="pagos-resumen-card"><strong>${pendientes.length}</strong><span>Pendientes</span></div>
            <div class="pagos-resumen-card"><strong>${resueltos.filter((pedido) => pedido.estado === "aprobado").length}</strong><span>Aprobados</span></div>
            <div class="pagos-resumen-card"><strong>${resueltos.filter((pedido) => pedido.estado === "incompleto").length}</strong><span>Incompletos</span></div>
        </div>
        <div class="pedido-panel">
            <div>
                <h3>Pendientes</h3>
                <div class="pedido-lista">
                    ${pendientes.length ? pendientes.map(renderPedido).join("") : `<p class="pedido-vacio">No hay pagos pendientes.</p>`}
                </div>
            </div>
            <div>
                <h3>Historial reciente</h3>
                <div class="pedido-lista">
                    ${resueltos.length ? resueltos.map(renderPedido).join("") : `<p class="pedido-vacio">Todavía no hay pagos resueltos.</p>`}
                </div>
            </div>
        </div>
    `;
}

window.obtenerPedidosRegistrados = obtenerPedidosRegistrados;
window.aprobarPagoPedido = aprobarPagoPedido;
window.marcarPagoIncompleto = marcarPagoIncompleto;
window.renderPagos = renderPagos;

window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("ventas")) {
        renderVentas();
    }
    if (document.getElementById("pagos") && typeof esOwnerAutenticado === "function" && esOwnerAutenticado()) {
        renderPagos();
    }
});
