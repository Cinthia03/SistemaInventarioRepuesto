const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require("pg");   

// ================================================
//           CONFIGURACIÓN APP
// ================================================
const app = express();
const PORT = 3000;


// ================================================
//           MIDDLEWARE 
// ================================================
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:4200', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));


// ================================================
//           CONEXIÓN 
// ================================================
const pool = new Pool({
  connectionString: "postgresql://postgres:!Ddh*MxDT_6Y7Sz@db.rjccxgdmkkljqnywellt.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});
pool.connect()
  .then(() => console.log("✅ Conectado a Supabase"))
  .catch(err => console.error("❌ Error conexión:", err));

// ================================================
//           LOGIN - USUARIOS
// ================================================
app.post('/Login', async (req, res) => {

  const { user, password } = req.body

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [user]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado.' })
    }
    const usuario = result.rows[0]
    if (password !== usuario.password) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' })
    }
    res.json({
      message: 'Inicio de sesión exitoso',
      tipo: usuario.rol
    })
  } catch (error) {
    console.error('❌ Error Login:', error)
    res.status(500).json({ message: 'Error del servidor' })
  }
})




// ================================================
//           MATERIALES
// ================================================
// OBTENER TODOS
app.get('/materiales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiales');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// OBTENER POR ID
app.get('/materiales/:codigo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM materiales WHERE codigo=$1',
      [req.params.codigo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR
app.post('/materiales', async (req, res) => {
  try {
    const { codigo, descripcion, unidad, precio, stock, categoria } = req.body;
    await pool.query(
      `INSERT INTO materiales
      (codigo, descripcion, unidad, precio, stock, categoria)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [codigo, descripcion, unidad, precio, stock, categoria]
    );
    res.json({ message: "Material creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR
app.put('/materiales/:codigo', async (req, res) => {
  try {
    const { descripcion, unidad, precio, stock, categoria } = req.body;
    await pool.query(
      `UPDATE materiales
       SET descripcion=$1, unidad=$2, precio=$3, stock=$4, categoria=$5
       WHERE codigo=$6`,
      [descripcion, unidad, precio, stock, categoria, req.params.codigo]
    );
    res.json({ message: "Material actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR
app.delete('/materiales/:codigo', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM materiales WHERE codigo=$1',
      [req.params.codigo]
    );
    res.json({ message: "Material eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






// ================================================
//           EQUIPOS CONSTRUCCIÓN
// ================================================
app.post('/guardar', async (req, res) => {
  try {
    const { codigo, equipo, unidad, precio } = req.body;
    await pool.query(
      'INSERT INTO Equipos_Construccion (codigo, equipo, unidad, precio) VALUES (?, ?, ?, ?)',
      [codigo, equipo, unidad, precio]
    );
    res.status(201).json({ message: 'Equipo guardado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/actualizar/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { codigo, equipo, unidad, precio } = req.body;
    await pool.query(
      'UPDATE Equipos_Construccion SET codigo=?, equipo=?, unidad=?, precio=? WHERE id=?',
      [codigo, equipo, unidad, precio, id]
    );
    res.json({ message: 'Equipo actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/eliminar/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM Equipos_Construccion WHERE id = ?', [id]);
    res.json({ message: 'Equipo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/buscar', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Equipos_Construccion');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






// ================================================
//           MANO DE OBRA
// ================================================
app.post('/guardarManoObra', async (req, res) => {
  try {
    const { codigo, persona, unidad, precio } = req.body;
    await pool.query(
      'INSERT INTO ManoDeObra (codigo, persona, unidad, precio) VALUES (?, ?, ?, ?)',
      [codigo, persona, unidad, precio]
    );
    res.status(201).json({ message: 'Mano de obra guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/actualizarManoObra/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { codigo, persona, unidad, precio } = req.body;
    await pool.query(
      'UPDATE ManoDeObra SET codigo=?, persona=?, unidad=?, precio=? WHERE id=?',
      [codigo, persona, unidad, precio, id]
    );
    res.json({ message: 'Mano de obra actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/eliminarManoObra/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM ManoDeObra WHERE id = ?', [id]);
    res.json({ message: 'Mano de obra eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/buscarManoObra', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ManoDeObra');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================
//           MANEJO DE ERRORES GLOBAL
// ================================================
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ================================================
//           INICIAR SERVIDOR
// ================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Login: http://localhost:${PORT}/Login/Login.html`);
});
