import "./style.css";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen: string;
}

const contenedor = document.querySelector<HTMLDivElement>("#cart-products");
const total = document.querySelector<HTMLParagraphElement>("#cart-total");
const botonVaciar = document.querySelector<HTMLButtonElement>("#clear-cart");

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

let carrito: Producto[] = [];
let errorLectura = false;

// Comprueba los datos recuperados de localStorage.
function esProducto(valor: unknown): valor is Producto {
  if (typeof valor !== "object" || valor === null) return false;

  const producto = valor as Record<string, unknown>;

  return (
    typeof producto.id === "number" &&
    Number.isInteger(producto.id) &&
    producto.id > 0 &&
    typeof producto.nombre === "string" &&
    producto.nombre.trim().length > 0 &&
    typeof producto.precio === "number" &&
    Number.isFinite(producto.precio) &&
    producto.precio >= 0 &&
    typeof producto.imagen === "string" &&
    producto.imagen.length > 0
  );
}

function leerCarrito(): Producto[] {
  const datos = localStorage.getItem("carrito");

  if (datos === null) return [];

  const contenido: unknown = JSON.parse(datos);

  if (!Array.isArray(contenido) || !contenido.every(esProducto)) {
    throw new Error("El carrito guardado no tiene un formato válido.");
  }

  return contenido;
}

// Guarda primero; solo actualiza la pantalla si la operación funciona.
function eliminarProducto(indice: number): void {
  const actualizado = carrito.filter((_, posicion) => posicion !== indice);

  try {
    localStorage.setItem("carrito", JSON.stringify(actualizado));
  } catch (error) {
    console.error("No se ha podido actualizar el carrito:", error);
    alert("No se ha podido eliminar el producto. Inténtalo de nuevo.");
    return;
  }

  carrito = actualizado;
  mostrarCarrito();

  // Mantiene el foco al desaparecer el botón que se ha pulsado.
  const botones =
    contenedor?.querySelectorAll<HTMLButtonElement>(".remove-product");

  const siguiente = botones?.[Math.min(indice, botones.length - 1)];

  if (siguiente) {
    siguiente.focus();
  } else {
    botonVaciar?.focus();
  }
}

function mostrarCarrito(): void {
  if (!contenedor || !total) return;

  contenedor.replaceChildren();

  if (errorLectura) {
    contenedor.textContent =
      "No se ha podido leer el carrito. Puedes recargar la página o vaciarlo para empezar de nuevo.";
    total.textContent = "Total no disponible";
    return;
  }

  if (carrito.length === 0) {
    contenedor.textContent = "Tu carrito está vacío.";
  }

  let sumaCentimos = 0;
  const fragmento = document.createDocumentFragment();

  carrito.forEach((producto, indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "product";

    const imagen = document.createElement("img");
    imagen.src = producto.imagen;
    imagen.alt = producto.nombre;
    imagen.width = 400;
    imagen.height = 400;

    // Prioriza las primeras tarjetas y retrasa las más alejadas.
    if (indice >= 3) {
      imagen.loading = "lazy";
    }

    const nombre = document.createElement("h2");
    nombre.textContent = producto.nombre;

    const precio = document.createElement("p");
    precio.className = "price";
    precio.textContent = formatoPrecio.format(producto.precio);

    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.className = "remove-product";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.setAttribute(
      "aria-label",
      `Eliminar una unidad de ${producto.nombre}`,
    );

    botonEliminar.addEventListener("click", () => {
      eliminarProducto(indice);
    });

    tarjeta.append(imagen, nombre, precio, botonEliminar);
    fragmento.append(tarjeta);

    sumaCentimos += Math.round(producto.precio * 100);
  });

  contenedor.append(fragmento);

  total.textContent = `Total: ${formatoPrecio.format(sumaCentimos / 100)}`;
}

if (botonVaciar) {
  botonVaciar.addEventListener("click", () => {
    try {
      localStorage.removeItem("carrito");
    } catch (error) {
      console.error("No se ha podido vaciar el carrito:", error);
      alert("No se ha podido vaciar el carrito. Inténtalo de nuevo.");
      return;
    }

    carrito = [];
    errorLectura = false;
    mostrarCarrito();
  });
}

try {
  carrito = leerCarrito();
} catch (error) {
  console.error("No se ha podido leer el carrito:", error);
  errorLectura = true;
}

mostrarCarrito();
