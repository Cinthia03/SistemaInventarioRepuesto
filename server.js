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
app.post('/login', async (req, res) => {
  const { user, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [user]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Usuario no encontrado'
      })
    }
    const usuario = result.rows[0]

    if (password !== usuario.password) {
      return res.status(401).json({
        message: 'Contraseña incorrecta'
      })
    }
    return res.status(200).json({
      message: 'Login exitoso',
      tipo: usuario.rol
    })
  } catch (error) {
    console.error('❌ Error Login:', error)
    return res.status(500).json({
      message: 'Error del servidor'
    })
  }
})




// ================================================
//           INVENTARIO
// ================================================
// TOTAL MATERIALES
app.get('/total-materiales', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM materiales')
    res.json({ total: parseInt(result.rows[0].count) })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo materiales' })
  }
})

// TOTAL MANO DE OBRA
app.get('/total-trabajadores', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM mano_obra')
    res.json({ total: parseInt(result.rows[0].count) })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo trabajadores' })
  }
})

// TOTAL EQUIPOS
app.get('/total-equipos', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM equipos')
    res.json({ total: parseInt(result.rows[0].count) })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo equipos' })
  }
})






// ================================================
//           MATERIALES
// ================================================
app.get('/materiales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiales');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/materiales/generar-codigo/:categoria', async (req, res) => {
  try {
    const categoria = decodeURIComponent(req.params.categoria);
    const prefijos = {
      "ACERO Y VARILLAS": 1,
      "ALUMINIO Y VIDRIO": 2,
      "ADOQUINES": 3,
      "AGLOMERANTES": 4,
      "AGREGADOS": 5,
      "AZULEJOS": 6,
      "PISOS": 7,
      "BLOQUE CONCRETO": 8,
      "BLOQUE ARCILLA": 9,
      "MADERAS PUERTAS ACCESORIOS": 10,
      "ENCOFRADO": 11,
      "CUBIERTA Y TUMBADO": 12,
      "PINTURAS": 13,
      "VARIOS": 14,
      "AGUA POTABLE": 15,
      "AGUA SERVIDAS": 16,
      "PIEZAS SANITARIAS": 17,
      "MATERIAL ELECTRICO": 18
    };
    const prefijo = prefijos[categoria];
    const result = await pool.query(
      `SELECT COUNT(*) FROM materiales WHERE categoria=$1`,
      [categoria]
    );
    const numero = parseInt(result.rows[0].count) + 1;
    const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
    res.json({ codigo });
  } catch (err) {
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

app.post('/materiales', async (req, res) => {
  try {
    const { descripcion, unidad, precio, stock, categoria } = req.body;
    const prefijos = {
      "ACERO Y VARILLAS": 1,
      "ALUMINIO Y VIDRIO": 2,
      "ADOQUINES": 3,
      "AGLOMERANTES": 4,
      "AGREGADOS": 5,
      "AZULEJOS": 6,
      "PISOS": 7,
      "BLOQUE CONCRETO": 8,
      "BLOQUE ARCILLA": 9,
      "MADERAS PUERTAS ACCESORIOS": 10,
      "ENCOFRADO": 11,
      "CUBIERTA Y TUMBADO": 12,
      "PINTURAS": 13,
      "VARIOS": 14,
      "AGUA POTABLE": 15,
      "AGUA SERVIDAS": 16,
      "PIEZAS SANITARIAS": 17,
      "MATERIAL ELECTRICO": 18
    };
      const prefijo = prefijos[categoria];
      const result = await pool.query(
        `SELECT COUNT(*) FROM materiales WHERE categoria=$1`,
        [categoria]
      );
      const numero = parseInt(result.rows[0].count) + 1;
      const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
        await pool.query(
          `INSERT INTO materiales
          (codigo, descripcion, unidad, precio, stock, categoria)
          VALUES ($1,$2,$3,$4,$5,$6)`,
          [codigo, descripcion, unidad, precio, stock, categoria]
        );
        res.json({ message: "Material creado", codigo });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

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

app.delete('/materiales/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM materiales WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: "Material eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================================================
//              MANO DE OBRA
// ================================================
app.get('/mano-obra', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mano_obra ORDER BY codigo'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/mano-obra/generar-codigo', async (req, res) => {
  try {
    const prefijo = 20;
    const result = await pool.query(
      `SELECT COALESCE(MAX(codigo),'20.000') AS ultimo
      FROM mano_obra `
    );
    const ultimo = result.rows[0].ultimo;
    const numero = parseInt(ultimo.split('.')[1]) + 1;
    const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
    res.json({ codigo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/mano-obra/:codigo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mano_obra WHERE codigo=$1',
      [req.params.codigo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/mano-obra', async (req, res) => {
  try {
    const { descripcion, unidad, precio } = req.body;
    const prefijo = 20;
    const result = await pool.query(
      `SELECT COALESCE(MAX(codigo),'20.000') AS ultimo
      FROM mano_obra`
    );
    const ultimoCodigo = result.rows[0].ultimo;
    const numero = parseInt(ultimoCodigo.split('.')[1]) + 1;
    const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
    await pool.query(
      `INSERT INTO mano_obra
      (codigo, descripcion, unidad, precio)
      VALUES ($1,$2,$3,$4)`,
      [codigo, descripcion, unidad, precio]
    );
    res.json({
      message: "Mano de obra creada",
      codigo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/mano-obra/:codigo', async (req, res) => {
  try {
    const { descripcion, unidad, precio } = req.body;
    await pool.query(
      `UPDATE mano_obra
       SET descripcion=$1,
           unidad=$2,
           precio=$3
       WHERE codigo=$4`,
      [descripcion, unidad, precio, req.params.codigo]
    );
    res.json({ message: "Mano de obra actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/mano-obra/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM mano_obra WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: "Registro eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// ================================================
//           EQUIPOS CONSTRUCCIÓN
// ================================================
app.get('/equipos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipos ORDER BY codigo'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/equipos/generar-codigo', async (req, res) => {
  try {
    const prefijo = 19;
    const result = await pool.query(
      `SELECT COALESCE(MAX(codigo),'19.000') AS ultimo
      FROM equipos `
    );
    const ultimo = result.rows[0].ultimo;
    const numero = parseInt(ultimo.split('.')[1]) + 1;
    const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
    res.json({ codigo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/equipos/:codigo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipos WHERE codigo=$1',
      [req.params.codigo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/equipos', async (req, res) => {
  try {
    const { descripcion, stock, unidad, precio } = req.body;
    const prefijo = 19;
    const result = await pool.query(
      `SELECT COALESCE(MAX(codigo),'19.000') AS ultimo
      FROM equipos`
    );
    const ultimoCodigo = result.rows[0].ultimo;
    const numero = parseInt(ultimoCodigo.split('.')[1]) + 1;
    const codigo = `${prefijo}.${numero.toString().padStart(3,'0')}`;
    await pool.query(
      `INSERT INTO equipos
      (codigo, descripcion, stock, unidad, precio)
      VALUES ($1,$2,$3,$4, $5)`,
      [codigo, descripcion, stock, unidad, precio]
    );
    res.json({
      message: "Equipo de construccion creado",
      codigo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/equipos/:codigo', async (req, res) => {
  try {
    const { descripcion, stock, unidad, precio } = req.body;
    await pool.query(
      `UPDATE equipos
       SET descripcion=$1,
           stock=$2,
           unidad=$3,
           precio=$4
       WHERE codigo=$5`,
      [descripcion, stock, unidad, precio, req.params.codigo]
    );
    res.json({ message: "Equipos de construccion actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/equipos/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM equipos WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: "Registro eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// ================================================
//           RUBROS
// ================================================
// 🔹 RUBROS (OBRA GRIS)
app.get('/rubros', async (req, res) => {
  try {
    const result = await pool.query('SELECT codigo, descripcion, unidad FROM rubros')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo rubros' })
  }
})

// 🔹 PRODUCTOS (AUTOCOMPLETE)
app.get('/productos', async (req, res) => {
  const { tipo, q } = req.query

  try {
    const result = await pool.query(
      `SELECT descripcion, tarifa 
       FROM productos 
       WHERE tipo = $1 AND descripcion ILIKE $2
       LIMIT 10`,
      [tipo, `%${q}%`]
    )

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo productos' })
  }
})



// ================================================
//           APU
// ================================================
app.get('/apus', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM apus ORDER BY fecha DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/apus', async (req, res) => {
  try {
    const {
      rubro_codigo, rubro_descripcion, fecha,
      subtotal_equipos, subtotal_mano_obra,
      subtotal_materiales, subtotal_transporte,
      total_directo, detalle_equipos,
      detalle_mano_obra, detalle_materiales, detalle_transporte
    } = req.body;

    const result = await pool.query(
      `INSERT INTO apus 
        (rubro_codigo, rubro_descripcion, fecha,
         subtotal_equipos, subtotal_mano_obra,
         subtotal_materiales, subtotal_transporte,
         total_directo, detalle_equipos,
         detalle_mano_obra, detalle_materiales, detalle_transporte)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        rubro_codigo, rubro_descripcion, fecha,
        subtotal_equipos, subtotal_mano_obra,
        subtotal_materiales, subtotal_transporte,
        total_directo, detalle_equipos,
        detalle_mano_obra, detalle_materiales, detalle_transporte
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/apus/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM apus WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Eliminado correctamente' });
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
