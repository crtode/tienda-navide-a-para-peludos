import "./style.css";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen: string;
}

interface ProductoCatalogo extends Producto {
  descripcion: string;
}

const galeria = document.querySelector<HTMLElement>(".gallery");
const mensaje = document.querySelector<HTMLParagraphElement>("#cart-message");
const buscador = document.querySelector<HTMLInputElement>("#search-input");
const mensajeBusqueda =
  document.querySelector<HTMLParagraphElement>("#search-message");

const formatoPrecio = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const CLAVE_CATALOGO = "catalogo-peludos";

let temporizador: ReturnType<typeof setTimeout> | undefined;

function mostrarMensaje(texto: string): void {
  if (!mensaje) return;

  clearTimeout(temporizador);
  mensaje.textContent = texto;

  temporizador = setTimeout(() => {
    mensaje.textContent = "";
  }, 3500);
}

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
    producto.imagen.startsWith("/images/")
  );
}

function esCatalogo(valor: unknown): valor is ProductoCatalogo[] {
  return (
    Array.isArray(valor) &&
    valor.every(
      (producto: unknown) =>
        esProducto(producto) &&
        "descripcion" in producto &&
        typeof producto.descripcion === "string",
    ) &&
    new Set(valor.map((producto) => producto.id)).size === valor.length
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

function anadirAlCarrito(producto: Producto): void {
  try {
    const carrito = leerCarrito();

    carrito.push(producto);
    localStorage.setItem("carrito", JSON.stringify(carrito));

    mostrarMensaje(`${producto.nombre} añadido al carrito`);
  } catch (error) {
    console.error("No se ha podido guardar el carrito:", error);
    mostrarMensaje("No se ha podido guardar el producto en el carrito.");
  }
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filtrarProductos(): void {
  if (!galeria || !buscador) return;

  const consulta = normalizar(buscador.value.trim());
  const tarjetas = galeria.querySelectorAll<HTMLElement>(".product");
  let visibles = 0;

  tarjetas.forEach((tarjeta) => {
    const nombre = tarjeta.querySelector("h2")?.textContent ?? "";
    const coincide = normalizar(nombre).includes(consulta);

    tarjeta.hidden = !coincide;

    if (coincide) visibles++;
  });

  if (!mensajeBusqueda) return;

  mensajeBusqueda.textContent =
    consulta === ""
      ? ""
      : visibles === 0
        ? "No hemos encontrado productos con ese nombre."
        : `${visibles} producto${visibles === 1 ? "" : "s"} encontrado${visibles === 1 ? "" : "s"}.`;
}

// Genera las tarjetas a partir del catálogo recibido.
function mostrarCatalogo(productos: ProductoCatalogo[]): void {
  if (!galeria) return;

  const fragmento = document.createDocumentFragment();

  productos.forEach((producto, indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "product";
    tarjeta.dataset.id = String(producto.id);

    const imagen = document.createElement("img");
    imagen.src = producto.imagen;
    imagen.alt = producto.nombre;
    imagen.width = 400;
    imagen.height = 400;

    if (indice === 0) {
      imagen.setAttribute("fetchpriority", "high");
    } else if (indice >= 3) {
      imagen.loading = "lazy";
    }

    const titulo = document.createElement("h2");
    titulo.textContent = producto.nombre;

    const descripcion = document.createElement("p");
    descripcion.className = "description";
    descripcion.textContent = producto.descripcion;

    const precio = document.createElement("p");
    precio.className = "price";
    precio.textContent = formatoPrecio.format(producto.precio);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "add-to-cart";
    boton.textContent = "Añadir al carrito";

    // Guarda el valor numérico sin tener que interpretar el precio visible.
    boton.dataset.precio = String(producto.precio);

    tarjeta.append(imagen, titulo, descripcion, precio, boton);
    fragmento.append(tarjeta);
  });

  galeria.replaceChildren(fragmento);
  filtrarProductos();
}

// Un solo evento sirve para las tarjetas HTML y las generadas después.
galeria?.addEventListener("click", (evento) => {
  if (!(evento.target instanceof Element)) return;

  const boton = evento.target.closest<HTMLButtonElement>(".add-to-cart");
  const tarjeta = boton?.closest<HTMLElement>(".product");

  if (!boton || !tarjeta) return;

  const nombre = tarjeta.querySelector("h2")?.textContent?.trim();
  const imagen = tarjeta.querySelector("img")?.getAttribute("src");
  const precioTexto = tarjeta.querySelector(".price")?.textContent ?? "";

  const precio =
    boton.dataset.precio !== undefined
      ? Number(boton.dataset.precio)
      : Number(
          precioTexto
            .replace("€", "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", "."),
        );

  const producto = {
    id: Number(tarjeta.dataset.id),
    nombre,
    precio,
    imagen,
  };

  if (!esProducto(producto)) {
    mostrarMensaje("No se han podido leer los datos del producto.");
    return;
  }

  anadirAlCarrito(producto);
});

buscador?.addEventListener("input", filtrarProductos);

// Muestra primero una copia guardada, si existe.
function recuperarCatalogoLocal(): void {
  try {
    const datos = localStorage.getItem(CLAVE_CATALOGO);

    if (datos === null) return;

    const productos: unknown = JSON.parse(datos);

    if (esCatalogo(productos)) {
      mostrarCatalogo(productos);
    }
  } catch (error) {
    console.warn("No se ha podido recuperar el catálogo local:", error);
  }
}

// Consulta MySQL a través del backend y actualiza la copia local.
async function cargarCatalogo(): Promise<void> {
  recuperarCatalogoLocal();
  filtrarProductos();

  try {
    const respuesta = await fetch("/api/productos", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!respuesta.ok) {
      throw new Error(`El backend ha respondido con ${respuesta.status}.`);
    }

    const productos: unknown = await respuesta.json();

    if (!esCatalogo(productos)) {
      throw new Error("El catálogo recibido no tiene un formato válido.");
    }

    mostrarCatalogo(productos);

    try {
      localStorage.setItem(CLAVE_CATALOGO, JSON.stringify(productos));
    } catch (error) {
      console.warn(
        "El catálogo se muestra, pero no se ha podido guardar:",
        error,
      );
    }
  } catch (error) {
    console.warn(
      "Backend no disponible; se conserva el catálogo local:",
      error,
    );
    mostrarMensaje(
      "Sin conexión con el catálogo. Se muestra la última versión disponible.",
    );
  }
}

void cargarCatalogo();

// import "./style.css";

// interface Producto {
//   id: number;
//   nombre: string;
//   precio: number;
//   imagen: string;
// }

// const mensaje = document.querySelector<HTMLParagraphElement>("#cart-message");
// const buscador = document.querySelector<HTMLInputElement>("#search-input");
// const mensajeBusqueda =
//   document.querySelector<HTMLParagraphElement>("#search-message");

// const tarjetas = document.querySelectorAll<HTMLElement>(".gallery .product");
// const botones = document.querySelectorAll<HTMLButtonElement>(".add-to-cart");

// let temporizador: ReturnType<typeof setTimeout> | undefined;

// // Muestra una confirmación sin interrumpir la navegación.
// function mostrarMensaje(texto: string): void {
//   if (!mensaje) return;

//   clearTimeout(temporizador);
//   mensaje.textContent = texto;

//   temporizador = setTimeout(() => {
//     mensaje.textContent = "";
//   }, 2500);
// }

// // Comprueba la estructura de los productos recuperados del navegador.
// function esProducto(valor: unknown): valor is Producto {
//   if (typeof valor !== "object" || valor === null) return false;

//   const producto = valor as Record<string, unknown>;

//   return (
//     typeof producto.id === "number" &&
//     Number.isInteger(producto.id) &&
//     producto.id > 0 &&
//     typeof producto.nombre === "string" &&
//     producto.nombre.trim().length > 0 &&
//     typeof producto.precio === "number" &&
//     Number.isFinite(producto.precio) &&
//     producto.precio >= 0 &&
//     typeof producto.imagen === "string" &&
//     producto.imagen.length > 0
//   );
// }

// // Lee el carrito y comprueba que contiene una lista de productos válida.
// function leerCarrito(): Producto[] {
//   const datos = localStorage.getItem("carrito");

//   if (datos === null) return [];

//   const contenido: unknown = JSON.parse(datos);

//   if (!Array.isArray(contenido) || !contenido.every(esProducto)) {
//     throw new Error("El carrito guardado no tiene un formato válido.");
//   }

//   return contenido;
// }

// // Conecta cada botón con el producto de su tarjeta.
// botones.forEach((boton) => {
//   boton.addEventListener("click", () => {
//     const tarjeta = boton.closest<HTMLElement>(".product");

//     if (!tarjeta) return;

//     const id = Number(tarjeta.dataset.id);
//     const nombre = tarjeta.querySelector("h2")?.textContent?.trim();
//     const precioTexto = tarjeta.querySelector(".price")?.textContent;
//     const imagen = tarjeta
//       .querySelector<HTMLImageElement>("img")
//       ?.getAttribute("src");

//     if (
//       !Number.isInteger(id) ||
//       id <= 0 ||
//       !nombre ||
//       !precioTexto ||
//       !imagen
//     ) {
//       mostrarMensaje("No se han podido leer los datos de este producto.");
//       return;
//     }

//     // Convierte un precio como «19,95 €» en el número 19.95.
//     const precio = Number(
//       precioTexto
//         .replace("€", "")
//         .replace(/\s/g, "")
//         .replace(/\./g, "")
//         .replace(",", "."),
//     );

//     if (!Number.isFinite(precio) || precio < 0) {
//       mostrarMensaje("El precio de este producto no es válido.");
//       return;
//     }

//     const producto: Producto = {
//       id,
//       nombre,
//       precio,
//       imagen,
//     };

//     try {
//       const carrito = leerCarrito();

//       carrito.push(producto);
//       localStorage.setItem("carrito", JSON.stringify(carrito));

//       mostrarMensaje(`${nombre} añadido al carrito`);
//     } catch (error) {
//       console.error("No se ha podido guardar el carrito:", error);
//       mostrarMensaje(
//         "No se ha podido guardar el producto. Revisa el almacenamiento del navegador.",
//       );
//     }
//   });
// });

// // Permite buscar sin distinguir mayúsculas ni tildes.
// function normalizar(texto: string): string {
//   return texto
//     .toLowerCase()
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "");
// }

// // Filtra las tarjetas por el nombre del producto.
// function filtrarProductos(): void {
//   if (!buscador) return;

//   const consulta = normalizar(buscador.value.trim());
//   let visibles = 0;

//   tarjetas.forEach((tarjeta) => {
//     const nombre = tarjeta.querySelector("h2")?.textContent ?? "";
//     const coincide = normalizar(nombre).includes(consulta);

//     tarjeta.hidden = !coincide;

//     if (coincide) visibles++;
//   });

//   if (!mensajeBusqueda) return;

//   if (consulta === "") {
//     mensajeBusqueda.textContent = "";
//   } else if (visibles === 0) {
//     mensajeBusqueda.textContent =
//       "No hemos encontrado productos con ese nombre.";
//   } else {
//     mensajeBusqueda.textContent =
//       `${visibles} producto${visibles === 1 ? "" : "s"} ` +
//       `encontrado${visibles === 1 ? "" : "s"}.`;
//   }
// }

// if (buscador) {
//   buscador.addEventListener("input", filtrarProductos);
//   filtrarProductos();
// }
