
const pool = require('./pool');

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS types (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS natures (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pokemon_species (
      id INT PRIMARY KEY, -- matches PokeAPI species ID
      name TEXT UNIQUE NOT NULL,
      type_1_id INT REFERENCES types(id),
      type_2_id INT REFERENCES types(id),
      generation INT NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS forms (
      id SERIAL PRIMARY KEY,
      species_id INTEGER REFERENCES pokemon_species(id),
      form_name TEXT NOT NULL,
      type_1_id INTEGER REFERENCES types(id),
      type_2_id INTEGER REFERENCES types(id),
      generation INT NOT NULL,
      image_url TEXT,
      UNIQUE (species_id, form_name)
    );

    CREATE TABLE IF NOT EXISTS trainers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      age INTEGER CHECK (age > 0),
      gender TEXT NOT NULL,
      bio TEXT
    );

    CREATE TABLE IF NOT EXISTS trainer_pokemon (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      species_id INTEGER NOT NULL REFERENCES pokemon_species(id),
      form_id INTEGER REFERENCES forms(id),
      nickname TEXT,
      level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 100),
      gender TEXT CHECK (gender IN ('male', 'female', 'none')),
      nature_id INTEGER REFERENCES natures(id),
      slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
      UNIQUE(trainer_id, slot)
    );
  `);
};

const insertType = async typeName => {
  typeName = typeName.toLowerCase();

  await pool.query(`
    INSERT INTO types (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
  `, [typeName]);
};

const getTypeId = async typeName => {
  typeName = typeName.toLowerCase();

  const result = await pool.query(`
    SELECT id FROM types
    WHERE name = $1
  `, [typeName]);

  if (result.rows.length === 0) {
    throw new Error(`Unknown type: ${typeName}`);
  }

  return result.rows[0].id;
};

const insertPokemonSpecies = async ({ id, name, type1Id, type2Id, generation, imageUrl }) => {
  await pool.query(
    `INSERT INTO pokemon_species 
     (id, name, type_1_id, type_2_id, generation, image_url) 
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [id, name, type1Id, type2Id, generation, imageUrl]
  );

  console.log(`✅ Inserted species: ${name} (ID: ${id})`);
  return id;
}

const insertForm = async ({ speciesId, formName, type1Id, type2Id, imageUrl }) => {
  try {
    await pool.query(
      `INSERT INTO forms 
      (species_id, form_name, type_1_id, type_2_id, image_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (species_id, form_name) DO NOTHING`,
      [speciesId, formName, type1Id, type2Id, imageUrl]
    );
    console.log(`✅ Inserted form: ${formName} (species ID: ${speciesId})`);
  } catch (err) {
    console.error(`❌ Error inserting form ${formName} for species ID ${speciesId}:`, err);
  }
};

const insertNature = async name => {
  await pool.query(
    `INSERT INTO natures (name) VALUES ($1) ON CONFLICT DO NOTHING`,
    [name]
  );
};

const getAllNatures = async () => {
  const result = await pool.query(
    `SELECT id, name FROM natures ORDER BY id`
  );
  return result.rows;
};

const insertTrainer = async ({ name, age, gender, bio }) => {
  await pool.query(
    `INSERT INTO trainers (name, age, gender, bio)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, age, gender, bio]
  );
};

const getAllSpecies = async () => {
  const result = await pool.query(
    'SELECT id, name, image_url, type_1_id, type_2_id, generation FROM pokemon_species ORDER BY id'
  );
  return result.rows;
};

const getTrainerById = async trainerId => {
  const result = await pool.query(
    `SELECT id, name, age, gender, bio
     FROM trainers
     WHERE id = $1`,
    [trainerId]
  );
  return result.rows[0] || null;
};

const getAllTrainers = async () => {
  const result = await pool.query(
    `SELECT id, name, age, gender, bio
     FROM trainers
     ORDER BY name`
  );
  return result.rows;
};

const updateTrainer = async (trainerId, { name, age, gender, bio }) => {
  await pool.query(
    `UPDATE trainers
     SET name = $1, age = $2, gender = $3, bio = $4
     WHERE id = $5`,
    [name, age, gender, bio, trainerId]
  );
};

const upsertTrainerPokemonSlot = async (
  trainerId,
  slot,
  { speciesId, formId = null, nickname = null, level = 1, gender = 'none', natureId = null }
  ) => {
  await pool.query(
    `INSERT INTO trainer_pokemon
       (trainer_id, slot, species_id, form_id, nickname, level, gender, nature_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (trainer_id, slot)
     DO UPDATE
       SET species_id = EXCLUDED.species_id,
           form_id    = EXCLUDED.form_id,
           nickname   = EXCLUDED.nickname,
           level      = EXCLUDED.level,
           gender     = EXCLUDED.gender,
           nature_id  = EXCLUDED.nature_id`,
    [trainerId, slot, speciesId, formId, nickname, level, gender, natureId]
  );
};

const getTrainerTeam = async trainerId => {
  const result = await pool.query(
    `SELECT
      tp.slot,
      tp.nickname,
      tp.level,
      tp.gender,
      tp.species_id,
      tp.form_id,
      tp.trainer_id,
      CASE
        WHEN f.form_name IS NOT NULL THEN f.form_name
        ELSE s.name
      END AS name,
      tp.nature_id,
      n.name AS nature_name,
      s.type_1_id AS type_1_id,
      s.type_2_id AS type_2_id,
      t1.name AS type_1_name,
      t2.name AS type_2_name,
      COALESCE(f.image_url, s.image_url) AS image_url
    FROM trainer_pokemon tp
    JOIN pokemon_species s ON tp.species_id = s.id
    LEFT JOIN forms f ON tp.form_id = f.id
    LEFT JOIN natures n ON tp.nature_id = n.id
    LEFT JOIN types t1 ON t1.id = s.type_1_id
    LEFT JOIN types t2 ON t2.id = s.type_2_id
    WHERE tp.trainer_id = $1
    ORDER BY tp.slot;`,
    [trainerId]
  );
  return result.rows;
};

const getTrainerDetail = async trainerId => {
  const [trainer, team] = await Promise.all([
    getTrainerById(trainerId),
    getTrainerTeam(trainerId)
  ]);
  return { trainer, team };
};

const getAllForms = async () => {
  const result = await pool.query(
    `SELECT species_id, form_name, type_1_id, type_2_id, image_url FROM forms ORDER BY id`
  );
  return result.rows;
}

const getAllTrainerPreviews = async () => {
  const result = await pool.query(
    `SELECT t.id AS trainer_id, t.name AS trainer_name,
            tp.slot, tp.level, tp.gender,
            s.name AS species_name,
            s.image_url
     FROM trainers t
     LEFT JOIN trainer_pokemon tp ON t.id = tp.trainer_id
     LEFT JOIN pokemon_species s ON tp.species_id = s.id
     ORDER BY t.name, tp.slot`
  );

  // Group by trainer
  const trainers = {};
  for (const row of result.rows) {
    const { trainer_id, trainer_name, slot, level, gender, species_name, image_url } = row;
    if (!trainers[trainer_id]) {
      trainers[trainer_id] = {
        id: trainer_id,
        name: trainer_name,
        team: []
      };
    }
    if (slot) {
      trainers[trainer_id].team.push({
        slot,
        species_name,
        image_url,
        level,
        gender
      });
    }
  }

  return Object.values(trainers);
};

const deleteTrainer = async trainerId => {
  await pool.query(
    `DELETE FROM trainers
     WHERE id = $1`,
    [trainerId]
  );
};

const deleteTrainerPokemonSlot = async (trainerId, slot) => {
  const { rows } = await pool.query(
    `DELETE FROM trainer_pokemon
     WHERE trainer_id = $1 AND slot = $2`,
    [trainerId, slot]
  );
  return rows[0];
};

const getFilteredSpecies = async ({ typeIds = [], generationInts = [] }) => {
  const result = await pool.query(
    `SELECT id, name, image_url, type1_id, type2_id, generation
     FROM species
     WHERE (
       $1::int[] IS NULL OR type1_id = ANY($1) OR type2_id = ANY($1)
     ) AND (
       $2::int[] IS NULL OR generation = ANY($2)
     )
     ORDER BY name`,
    [typeIds.length ? typeIds : null, generationInts.length ? generationInts : null]
  );

  return result.rows;
};

const getAllTypes = async () => {
  const result = await pool.query(
    `SELECT id, name FROM types ORDER BY id`
  );
  return result.rows;
};

const truncateTables = async () => {
  await pool.query(`
    TRUNCATE TABLE 
      pokemon_species,
      types,
      natures,
      trainers,
      forms,
      trainer_pokemon
    RESTART IDENTITY CASCADE;
  `);
};

module.exports = {
  createTables,
  insertType,
  getTypeId,
  insertPokemonSpecies,
  insertForm,
  insertNature,
  truncateTables,
  insertTrainer,
  updateTrainer,
  upsertTrainerPokemonSlot,
  deleteTrainer,
  deleteTrainerPokemonSlot,
  getAllTrainerPreviews,
  getAllSpecies,
  getTrainerDetail,
  getTrainerById,
  getAllTrainers,
  getTrainerTeam,
  getFilteredSpecies,
  getAllTypes,
  getAllForms,
  getAllNatures,
};