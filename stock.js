// stock.js
// Manejo de stock de productos

// Ejemplo de productos iniciales
const productos = [
    { id: 1, nombre: "Remera básica", stock: 10, precio: 3500 },
    { id: 2, nombre: "Campera de jean", stock: 5, precio: 9500 },
    { id: 3, nombre: "Pantalón jogger", stock: 8, precio: 4200 },
    { id: 4, nombre: "Vestido casual", stock: 6, precio: 5200 }
];

// Carrito de compras
const carrito = [];

function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    if (producto.stock <= 0) {
        alert("No hay stock disponible para este producto.");
        return;
    }
    const item = carrito.find(c => c.id === id);
    if (item) {
        if (item.cantidad < producto.stock) {
            item.cantidad += 1;
            producto.stock -= 1;
        } else {
            alert("No hay más stock disponible para este producto.");
            return;
        }
    } else {
        carrito.push({ id: producto.id, nombre: producto.nombre, cantidad: 1, precio: producto.precio });
        producto.stock -= 1;
    }
    actualizarCarritoUI();
    if (typeof renderCatalogo === 'function') renderCatalogo();
}

function actualizarCarritoUI() {
    const cantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const carritoCantidad = document.getElementById("carrito-cantidad");
    if (carritoCantidad) carritoCantidad.textContent = cantidad;
}

function renderStock() {
    const stockSection = document.getElementById("stock");
    stockSection.innerHTML = "<h2>Stock de productos</h2>";
    const table = document.createElement("table");
    table.className = "stock-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Acciones</th>
                <th>Carrito</th>
            </tr>
        </thead>
        <tbody>
            ${productos.map(p => `
                <tr>
                    <td>${p.nombre}</td>
                    <td id="stock-count-${p.id}">${p.stock}</td>
                    <td>
                        <button onclick="modificarStock(${p.id}, 1)">+</button>
                        <button onclick="modificarStock(${p.id}, -1)">-</button>
                    </td>
                    <td>
                        <button onclick="agregarAlCarrito(${p.id})">Agregar 🛒</button>
                    </td>
                </tr>
            `).join("")}
        </tbody>
    `;
    stockSection.appendChild(table);
    actualizarCarritoUI();
}

function modificarStock(id, cambio) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    producto.stock = Math.max(0, producto.stock + cambio);
    document.getElementById(`stock-count-${id}`).textContent = producto.stock;
}

// Inicializar stock al cargar
window.addEventListener("DOMContentLoaded", () => {
    renderStock();
    setupBarcodeScanner();
    actualizarCarritoUI();
});

function setupBarcodeScanner() {
    const startScanBtn = document.getElementById("start-scan");
    const scannerDiv = document.getElementById("scanner");
    const barcodeResult = document.getElementById("barcode-result");
    const assignForm = document.getElementById("assign-stock-form");
    let scannedCode = null;

    startScanBtn.addEventListener("click", () => {
        scannerDiv.style.display = "block";
        barcodeResult.textContent = "Escaneando...";
        assignForm.style.display = "none";
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#barcode-video'),
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
        // Buscar producto por código de barra (simulado por id)
        let producto = productos.find(p => p.id == scannedCode);
        if (!producto) {
            // Si no existe, crear nuevo producto
            producto = { id: scannedCode, nombre: "Producto " + scannedCode, stock: 0 };
            productos.push(producto);
        }
        producto.stock += stockSumar;
        renderStock();
        assignForm.style.display = "none";
        scannerDiv.style.display = "none";
        barcodeResult.textContent = `Stock asignado por ${usuario} al producto ${producto.nombre}. Nuevo stock: ${producto.stock}`;
    });
}
