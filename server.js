const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger setup
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Import database connection
const {
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
} = require('./config/database');

// Helper function for consistent API responses
const createResponse = (status, message, data = null) => ({
  status,
  message,
  ...(data && { data }),
  timestamp: new Date().toISOString()
});

// Routes
app.get('/', (req, res) => {
  res.status(200).send('OK!');
});

// Database connection test endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testDatabaseConnection();
    res.json(createResponse('success', 'Database connection successful', { database: dbStatus }));
  } catch (error) {
    res.status(500).json(createResponse('error', 'Database connection failed', { error: error.message }));
  }
});

// Musical collection endpoint
app.get('/api/coleccion_musical', async (req, res) => {
  try {
    const coleccion = await getColeccionMusical();
    res.json(
      createResponse('success', 'Musical collection retrieved', {
        artistas: coleccion
      })
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createResponse('error', 'Failed to fetch musical collection', {
          error: error.message
        })
      );
  }
});

// Artists endpoint
app.get('/api/artistas', async (req, res) => {
  try {
    const artistas = await getArtistas();
    res.json(
      createResponse('success', 'Artists retrieved', {
        artistas
      })
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createResponse('error', 'Failed to fetch artistas', {
          error: error.message
        })
      );
  }
});

// Create artist endpoint
app.post('/api/agregar_artista', async (req, res) => {
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const generoMusica =
    typeof req.body?.genero_musica === 'string' ? req.body.genero_musica.trim() : '';

  if (!nombre || !generoMusica) {
    return res
      .status(400)
      .json(
        createResponse('error', 'nombre and genero_musica are required', {
          required: ['nombre', 'genero_musica']
        })
      );
  }

  try {
    const artista = await createArtista({ nombre, genero_musica: generoMusica });
    res
      .status(201)
      .json(
        createResponse('success', 'Artista creado', {
          artista
        })
      );
  } catch (error) {
    res
      .status(500)
      .json(
        createResponse('error', 'Failed to create artista', {
          error: error.message
        })
      );
  }
});

// Create album endpoint
app.post('/api/agregar_album', async (req, res) => {
  const tituloAlbum =
    typeof req.body?.titulo_album === 'string' ? req.body.titulo_album.trim() : '';
  const anioAlbumRaw = req.body?.anio_album;
  const idArtistaRaw = req.body?.id_artista;

  const anioAlbum = Number.parseInt(anioAlbumRaw, 10);
  const idArtista = Number.parseInt(idArtistaRaw, 10);

  const validationErrors = [];

  if (!tituloAlbum) {
    validationErrors.push('titulo_album');
  }

  if (!Number.isInteger(anioAlbum)) {
    validationErrors.push('anio_album');
  }

  if (!Number.isInteger(idArtista)) {
    validationErrors.push('id_artista');
  }

  if (validationErrors.length > 0) {
    return res
      .status(400)
      .json(
        createResponse('error', 'titulo_album, anio_album and id_artista are required', {
          required: ['titulo_album', 'anio_album', 'id_artista'],
          invalid: validationErrors
        })
      );
  }

  try {
    const album = await createAlbum({
      titulo_album: tituloAlbum,
      anio_album: anioAlbum,
      id_artista: idArtista
    });

    res
      .status(201)
      .json(createResponse('success', 'Album creado', { album }));
  } catch (error) {
    if (error.code === 'ALBUM_TITLE_EXISTS') {
      return res
        .status(409)
        .json(
          createResponse('error', 'El titulo del album ya existe', {
            field: 'titulo_album'
          })
        );
    }

    if (error.code === 'ARTISTA_NOT_FOUND') {
      return res
        .status(404)
        .json(
          createResponse('error', 'El artista especificado no existe', {
            field: 'id_artista'
          })
        );
    }

    res
      .status(500)
      .json(
        createResponse('error', 'Failed to create album', {
          error: error.message
        })
      );
  }
});

// Albums by artist name endpoint
app.get('/api/artistas/nombre/:nombre/albumes', async (req, res) => {
  const nombreArtista = typeof req.params.nombre === 'string' ? req.params.nombre.trim() : '';

  if (!nombreArtista) {
    return res
      .status(400)
      .json(
        createResponse('error', 'nombre is required', {
          field: 'nombre'
        })
      );
  }

  try {
    const artista = await findArtistaPorNombre(nombreArtista);

    if (!artista) {
      return res
        .status(404)
        .json(
          createResponse('error', 'Artista no encontrado', {
            nombre: nombreArtista
          })
        );
    }

    const albumes = await getAlbumesPorArtista(artista.id_artista);

    if (albumes.length === 0) {
      return res.json(
        createResponse('success', 'El artista no tiene albumes registrados', {
          artista,
          albumes: []
        })
      );
    }

    res.json(
      createResponse('success', 'Albumes retrieved for artista', {
        artista,
        albumes
      })
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createResponse('error', 'Failed to fetch albumes for artista', {
          error: error.message
        })
      );
  }
});

// Update artist endpoint
app.patch('/api/artistas/:id', async (req, res) => {
  const idArtista = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(idArtista)) {
    return res
      .status(400)
      .json(
        createResponse('error', 'id must be an integer', {
          field: 'id'
        })
      );
  }

  const updates = {};
  const invalidFields = [];

  if (Object.prototype.hasOwnProperty.call(req.body, 'nombre')) {
    if (typeof req.body.nombre === 'string' && req.body.nombre.trim()) {
      updates.nombre = req.body.nombre.trim();
    } else {
      invalidFields.push('nombre');
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'genero_musica')) {
    if (typeof req.body.genero_musica === 'string' && req.body.genero_musica.trim()) {
      updates.genero_musica = req.body.genero_musica.trim();
    } else {
      invalidFields.push('genero_musica');
    }
  }

  if (invalidFields.length > 0) {
    return res
      .status(400)
      .json(
        createResponse('error', 'Invalid artist fields', {
          invalid: invalidFields
        })
      );
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json(
        createResponse('error', 'No fields provided to update', {
          allowed: ['nombre', 'genero_musica']
        })
      );
  }

  try {
    const artista = await updateArtista(idArtista, updates);

    if (!artista) {
      return res
        .status(404)
        .json(
          createResponse('error', 'Artista no encontrado', {
            id_artista: idArtista
          })
        );
    }

    res.json(createResponse('success', 'Artista actualizado', { artista }));
  } catch (error) {
    if (error.code === 'ARTISTA_DUPLICATE_NAME') {
      return res
        .status(409)
        .json(
          createResponse('error', 'El nombre del artista ya existe', {
            field: 'nombre'
          })
        );
    }

    if (error.message === 'No update fields provided') {
      return res
        .status(400)
        .json(
          createResponse('error', 'No fields provided to update', {
            allowed: ['nombre', 'genero_musica']
          })
        );
    }

    res
      .status(500)
      .json(
        createResponse('error', 'Failed to update artista', {
          error: error.message
        })
      );
  }
});

// Update album endpoint
app.patch('/api/albumes/:id', async (req, res) => {
  const idAlbum = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(idAlbum)) {
    return res
      .status(400)
      .json(
        createResponse('error', 'id must be an integer', {
          field: 'id'
        })
      );
  }

  const updates = {};
  const invalidFields = [];

  if (Object.prototype.hasOwnProperty.call(req.body, 'titulo_album')) {
    if (typeof req.body.titulo_album === 'string' && req.body.titulo_album.trim()) {
      updates.titulo_album = req.body.titulo_album.trim();
    } else {
      invalidFields.push('titulo_album');
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'anio_album')) {
    const parsedYear = Number.parseInt(req.body.anio_album, 10);
    if (Number.isInteger(parsedYear)) {
      updates.anio_album = parsedYear;
    } else {
      invalidFields.push('anio_album');
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'id_artista')) {
    const parsedArtistId = Number.parseInt(req.body.id_artista, 10);
    if (Number.isInteger(parsedArtistId)) {
      updates.id_artista = parsedArtistId;
    } else {
      invalidFields.push('id_artista');
    }
  }

  if (invalidFields.length > 0) {
    return res
      .status(400)
      .json(
        createResponse('error', 'Invalid album fields', {
          invalid: invalidFields
        })
      );
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json(
        createResponse('error', 'No fields provided to update', {
          allowed: ['titulo_album', 'anio_album', 'id_artista']
        })
      );
  }

  try {
    const album = await updateAlbum(idAlbum, updates);

    if (!album) {
      return res
        .status(404)
        .json(
          createResponse('error', 'Album no encontrado', {
            id_album: idAlbum
          })
        );
    }

    res.json(createResponse('success', 'Album actualizado', { album }));
  } catch (error) {
    if (error.code === 'ALBUM_TITLE_EXISTS') {
      return res
        .status(409)
        .json(
          createResponse('error', 'El titulo del album ya existe', {
            field: 'titulo_album'
          })
        );
    }

    if (error.code === 'ARTISTA_NOT_FOUND') {
      return res
        .status(404)
        .json(
          createResponse('error', 'El artista especificado no existe', {
            field: 'id_artista'
          })
        );
    }

    if (error.message === 'No update fields provided') {
      return res
        .status(400)
        .json(
          createResponse('error', 'No fields provided to update', {
            allowed: ['titulo_album', 'anio_album', 'id_artista']
          })
        );
    }

    res
      .status(500)
      .json(
        createResponse('error', 'Failed to update album', {
          error: error.message
        })
      );
  }
});

// Albumes endpoint
app.get('/api/albumes', async (req, res) => {
  try {
    const albumes = await getAlbumes();
    res.json(
      createResponse('success', 'Albumes retrieved', {
        albumes
      })
    );
  } catch (error) {
    res
      .status(500)
      .json(
        createResponse('error', 'Failed to fetch albumes', {
          error: error.message
        })
      );
  }
});

// Start server - bind to all interfaces on Render, localhost for development
// Check if we're on Render (has PORT env var AND NODE_ENV is production) or localhost
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

if (isProduction) {
  // Render environment - bind to all interfaces
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on 0.0.0.0:${PORT}`);
    console.log(`Health check available at: http://0.0.0.0:${PORT}/api/health`);
  });
} else {
  // Local development - bind to localhost
  app.listen(PORT, 'localhost', () => {
    console.log(`Server is running on localhost:${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  });
}
