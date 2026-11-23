import "dotenv/config";
import express from "express";
import mysql, { type RowDataPacket } from "mysql2/promise";

interface FilaProducto extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
}

const app = express();
const puerto = Number(process.env.PORT ?? 3000);

// Reutiliza conexiones en lugar de abrir una nueva para cada petición.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

app.get("/api/productos", async (_req, res) => {
  try {
    const [filas] = await db.execute<FilaProducto[]>(
      `SELECT id, nombre, descripcion, precio, imagen
       FROM productos
       ORDER BY id`,
    );

    // MySQL devuelve DECIMAL como texto: lo convertimos para el frontend.
    const productos = filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      precio: Number(fila.precio),
      imagen: fila.imagen,
    }));

    res.json(productos);
  } catch (error) {
    console.error("Error al consultar los productos:", error);

    res.status(500).json({
      error: "No se han podido cargar los productos.",
    });
  }
});

// Solo accesible desde este ordenador durante la práctica.
app.listen(puerto, "127.0.0.1", () => {
  console.log(`Backend disponible en http://127.0.0.1:${puerto}`);
});
