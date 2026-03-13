// ventas.js
// Vista del carrito y proceso de pago

function renderVentas() {
    const ventasSection = document.getElementById("ventas");
    ventasSection.innerHTML = "<h2>Carrito de compras</h2>";
    if (typeof carrito === 'undefined' || carrito.length === 0) {
        ventasSection.innerHTML += "<p>El carrito está vacío.</p>";
        return;
    }
    const list = document.createElement("ul");
    list.className = "carrito-list";
    let total = 0;
    carrito.forEach((item, idx) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${item.nombre}</strong><br>
            <span class='carrito-cantidad'>Cantidad: ${item.cantidad}</span>
            <span class='carrito-precio'>Precio unitario: $${item.precio}</span>
            <span class='carrito-subtotal'>Subtotal: $${subtotal}</span>
            <button onclick='eliminarDelCarrito(${idx})'>Eliminar</button>
        `;
        list.appendChild(li);
    });
    ventasSection.appendChild(list);
    ventasSection.innerHTML += `<div class='carrito-total'>Total: $${total}</div>`;
    ventasSection.innerHTML += `<button id='pagar-btn'>Pagar</button>`;
    setTimeout(() => {
        const btn = document.getElementById('pagar-btn');
        if (btn) btn.addEventListener('click', mostrarPagoQR);
    }, 100);
}

function eliminarDelCarrito(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (producto) producto.stock += item.cantidad;
    carrito.splice(idx, 1);
    renderVentas();
    if (typeof actualizarCarritoUI === 'function') actualizarCarritoUI();
    if (typeof renderCatalogo === 'function') renderCatalogo();
function sumarCantidad(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (producto && producto.stock > 0) {
        item.cantidad++;
        producto.stock--;
        renderVentas();
        actualizarCarritoUI();
        if (typeof renderCatalogo === 'function') renderCatalogo();
    } else {
        alert("No hay más stock disponible para este producto.");
    }
}

function restarCantidad(idx) {
    const item = carrito[idx];
    const producto = productos.find(p => p.id === item.id);
    if (item.cantidad > 1) {
        item.cantidad--;
        if (producto) producto.stock++;
        renderVentas();
        actualizarCarritoUI();
        if (typeof renderCatalogo === 'function') renderCatalogo();
    } else {
        eliminarDelCarrito(idx);
        if (producto) producto.stock++;
        if (typeof renderCatalogo === 'function') renderCatalogo();
    }
}
}

function mostrarPagoQR() {
    const ventasSection = document.getElementById("ventas");
    // Calcular total
    let total = 0;
    carrito.forEach(item => {
        total += item.precio * item.cantidad;
    });
    ventasSection.innerHTML = `
        <div class='qr-pago'>
            <h3>Escaneá el QR para pagar</h3>
            <img src='https://api.qrserver.com/v1/create-qr-code/?data=Pago%20Indumentaria%20${Date.now()}&size=200x200' alt='QR de pago' />
            <p>Total a pagar: <strong>$${total}</strong></p>
            <p>
                <a href='https://www.mercadopago.com.ar/' target='_blank' class='mp-link'>Mercado Pago</a> | 
                <a href='https://www.modo.com.ar/' target='_blank' class='modo-link'>MODO</a> | 
                <span style='font-weight:bold;'>CBU: 0000003100031000310003</span>
            </p>
            <p>Una vez realizado el pago, recibirás la confirmación.</p>
            <button onclick='renderVentas()'>Volver al carrito</button>
        </div>
    `;
}

window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("ventas")) {
        renderVentas();
    }
});
