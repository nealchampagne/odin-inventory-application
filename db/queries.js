
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

    CREATE TABLE IF NOT EXISTS evolution_families (
      id INT PRIMARY KEY, -- matches PokeAPI evolution-chain ID
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pokemon_species (
      id INT PRIMARY KEY, -- matches PokeAPI species ID
      name TEXT UNIQUE NOT NULL,
      type_1_id INT REFERENCES types(id),
      type_2_id INT REFERENCES types(id),
      evolution_family_id INT REFERENCES evolution_families(id),
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

const insertEvolutionFamily = async (id, name) => {
  await pool.query(
    'INSERT INTO evolution_families (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id',
    [id, name]
  );
  return id;
}

const insertPokemonSpecies = async ({ id, name, type1Id, type2Id, evolutionFamilyId, generation, imageUrl }) => {
  await pool.query(
    `INSERT INTO pokemon_species 
     (id, name, type_1_id, type_2_id, evolution_family_id, generation, image_url) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [id, name, type1Id, type2Id, evolutionFamilyId, generation, imageUrl]
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

const truncateTables = async () => {
  await pool.query(`
    TRUNCATE TABLE 
      pokemon_species,
      evolution_families,
      types,
      natures
    RESTART IDENTITY CASCADE;
  `);
};

module.exports = {
  createTables,
  insertType,
  getTypeId,
  insertEvolutionFamily,
  insertPokemonSpecies,
  insertForm,
  insertNature,
  truncateTables,
};