const { Pool } = require('pg');

// Database configuration - supports both individual env vars and DATABASE_URL
let dbConfig;

if (process.env.DATABASE_URL) {
  // Render provides DATABASE_URL for PostgreSQL
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Fallback to individual environment variables
  dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  };

  // Validate required environment variables only if not using DATABASE_URL
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
async function testDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();

    // Test query to check connection
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    
    return {
      connected: true,
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].postgres_version,
      host: dbConfig.host,
      database: dbConfig.database
    };
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Retrieve musical collection grouped by artist
async function getColeccionMusical() {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT
        a.id_artista,
        a.nombre,
        a.genero_musica,
        COALESCE(
          json_agg(
            json_build_object(
              'id_album', al.id_album,
              'titulo_album', al.titulo_album,
              'anio_album', al.anio_album
            )
          ) FILTER (WHERE al.id_album IS NOT NULL),
          '[]'::json
        ) AS albumes
      FROM artista a
      LEFT JOIN albumes al ON al.id_artista = a.id_artista
      GROUP BY a.id_artista, a.nombre, a.genero_musica
      ORDER BY a.nombre;
    `);

    return result.rows.map(row => ({
      id_artista: row.id_artista,
      nombre: row.nombre,
      genero_musica: row.genero_musica,
      albumes: row.albumes ?? []
    }));
  } catch (error) {
    throw new Error(`Failed to fetch musical collection: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Retrieve all artists without album aggregation
async function getArtistas() {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT id_artista, nombre, genero_musica FROM artista ORDER BY nombre`
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch artistas: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Find single artist by name (case-insensitive)
async function findArtistaPorNombre(nombre) {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `
        SELECT id_artista, nombre, genero_musica
        FROM artista
        WHERE LOWER(nombre) = LOWER($1)
        LIMIT 1
      `,
      [nombre]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to find artista by nombre: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create a new artist
async function createArtista({ nombre, genero_musica }) {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `
        INSERT INTO artista (nombre, genero_musica)
        VALUES ($1, $2)
        RETURNING id_artista, nombre, genero_musica
      `,
      [nombre, genero_musica]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to create artista: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Update existing artist
async function updateArtista(idArtista, { nombre, genero_musica }) {
  let client;
  try {
    client = await pool.connect();

    const fields = [];
    const values = [];

    if (typeof nombre === 'string') {
      fields.push('nombre');
      values.push(nombre);
    }

    if (typeof genero_musica === 'string') {
      fields.push('genero_musica');
      values.push(genero_musica);
    }

    if (fields.length === 0) {
      throw new Error('No update fields provided');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    values.push(idArtista);

    const result = await client.query(
      `
        UPDATE artista
        SET ${setClause}
        WHERE id_artista = $${values.length}
        RETURNING id_artista, nombre, genero_musica
      `,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      const duplicateError = new Error('Artist name already exists');
      duplicateError.code = 'ARTISTA_DUPLICATE_NAME';
      throw duplicateError;
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Retrieve all albumes
async function getAlbumes() {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `
        SELECT
          id_album,
          titulo_album,
          anio_album,
          id_artista
        FROM albumes
        ORDER BY titulo_album
      `
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch albumes: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Retrieve albums for a specific artist
async function getAlbumesPorArtista(idArtista) {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      `
        SELECT
          id_album,
          titulo_album,
          anio_album,
          id_artista
        FROM albumes
        WHERE id_artista = $1
        ORDER BY titulo_album
      `,
      [idArtista]
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch albumes for artista: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create a new album
async function createAlbum({ titulo_album, anio_album, id_artista }) {
  let client;
  try {
    client = await pool.connect();

    // Prevent duplicate titles (case-insensitive)
    const duplicate = await client.query(
      `SELECT id_album FROM albumes WHERE LOWER(titulo_album) = LOWER($1) LIMIT 1`,
      [titulo_album]
    );

    if (duplicate.rowCount > 0) {
      const error = new Error('Album title already exists');
      error.code = 'ALBUM_TITLE_EXISTS';
      throw error;
    }

    const result = await client.query(
      `
        INSERT INTO albumes (titulo_album, anio_album, id_artista)
        VALUES ($1, $2, $3)
        RETURNING id_album, titulo_album, anio_album, id_artista
      `,
      [titulo_album, anio_album, id_artista]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23503') {
      // Foreign key violation
      const fkError = new Error('Specified artista does not exist');
      fkError.code = 'ARTISTA_NOT_FOUND';
      throw fkError;
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Update existing album
async function updateAlbum(idAlbum, { titulo_album, anio_album, id_artista }) {
  let client;
  try {
    client = await pool.connect();

    const fields = [];
    const values = [];

    if (typeof titulo_album === 'string') {
      // Check for duplicate titles excluding current album
      const duplicate = await client.query(
        `SELECT id_album FROM albumes WHERE LOWER(titulo_album) = LOWER($1) AND id_album <> $2 LIMIT 1`,
        [titulo_album, idAlbum]
      );

      if (duplicate.rowCount > 0) {
        const error = new Error('Album title already exists');
        error.code = 'ALBUM_TITLE_EXISTS';
        throw error;
      }

      fields.push('titulo_album');
      values.push(titulo_album);
    }

    if (Number.isInteger(anio_album)) {
      fields.push('anio_album');
      values.push(anio_album);
    }

    if (Number.isInteger(id_artista)) {
      fields.push('id_artista');
      values.push(id_artista);
    }

    if (fields.length === 0) {
      throw new Error('No update fields provided');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    values.push(idAlbum);

    const result = await client.query(
      `
        UPDATE albumes
        SET ${setClause}
        WHERE id_album = $${values.length}
        RETURNING id_album, titulo_album, anio_album, id_artista
      `,
      values
    );

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    if (error.code === '23503') {
      const fkError = new Error('Specified artista does not exist');
      fkError.code = 'ARTISTA_NOT_FOUND';
      throw fkError;
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  testDatabaseConnection,
  getColeccionMusical,
  getArtistas,
  getAlbumes,
  findArtistaPorNombre,
  getAlbumesPorArtista,
  createArtista,
  updateArtista,
  createAlbum,
  updateAlbum
};
