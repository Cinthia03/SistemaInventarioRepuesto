const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise'); 


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
  origin: 'http://localhost:4200', // SOLO Angular
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));


// ================================================
//           CONEXIÓN MYSQL FREESQLDATABASE
// ================================================
const pool = mysql.createPool({
  host: 'sql10.freesqldatabase.com',
  port: 3306,
  database: 'sql10817260',
  user: 'sql10817260',
  password: 'bgjUupfprV',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
pool.getConnection()
  .then(() => console.log('✅ Conectado a MySQL Freesqldatabase'))
  .catch(err => console.error('❌ Error MySQL:', err));


// ================================================
//           LOGIN - USUARIOS
// ================================================
app.post('/Login', async (req, res) => {
  const { user, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM Usuarios WHERE usuario = ?',
      [user]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    const usuario = rows[0];

    if (password !== usuario.contrasena) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    res.json({
      message: 'Inicio de sesión exitoso',
      tipo: usuario.tipo_usuario
    });

  } catch (error) {
    console.error('❌ Error Login:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});




// ================================================
//           MATERIALES
// ================================================
// OBTENER TODOS
app.get('/materiales', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Materiales');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OBTENER POR ID
app.get('/materiales/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Materiales WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Material no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREAR
app.post('/materiales', async (req, res) => {
  try {
    const { codigo, descripcion, unidad, precio, stock, categoria } = req.body;

    await pool.query(
      'INSERT INTO Materiales (codigo, descripcion, unidad, precio, stock, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, descripcion, unidad, precio, stock, categoria]
    );

    res.status(201).json({ message: 'Material creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR
app.put('/materiales/:id', async (req, res) => {
  try {
    const { codigo, descripcion, unidad, precio, stock, categoria } = req.body;

    await pool.query(
      'UPDATE Materiales SET codigo=?, descripcion=?, unidad=?, precio=?, stock=?, categoria=? WHERE id=?',
      [codigo, descripcion, unidad, precio, stock, categoria, req.params.id]
    );

    res.json({ message: 'Material actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR
app.delete('/materiales/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM Materiales WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Material eliminado' });
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
