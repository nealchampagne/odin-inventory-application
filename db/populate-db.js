const Pokedex = require('pokeapi-js-wrapper');
const db = require('./queries');
const P = new Pokedex.Pokedex({ cache: false });

const natureNames = [
  'adamant', 'bashful', 'bold', 'brave', 'calm',
  'careful', 'docile', 'gentle', 'hardy', 'hasty',
  'impish', 'jolly', 'lax', 'lonely', 'mild',
  'modest', 'naive', 'naughty', 'quiet', 'quirky',
  'rash', 'relaxed', 'sassy', 'serious', 'timid'
];

const types = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

const skipStrings = [
  'pikachu-', // cosmetic Pikachu forms
  '-starter',  // special starter forms
  '-totem',    // Alolan totem forms
  'koraidon-', // special legendary forms
  'miraidon-',
  '-power-construct', // special zygarde forms
  '-meteor',          // special minior form
  '-eternamax',       // special gigantamax form
  '-dada',         // special zarude form
];

const ROMAN_MAP = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5,
  vi: 6, vii: 7, viii: 8, ix: 9, x: 10
};

const parseGenerationSlug = slug => {
  if (typeof slug !== 'string') {
    throw new TypeError(`Expected string, got ${typeof slug}`);
  }
  const roman = slug.toLowerCase().split('-')[1];
  const value = ROMAN_MAP[roman];
  if (!value) {
    throw new Error(`Unexpected generation slug: ${slug}`);
  }
  return value;
};

const populateOnePokemon = async (name, speciesData) => {
  try {

    const generationInt = parseGenerationSlug(speciesData.generation.name);
    const defaultForm = speciesData.varieties.find(v => v.is_default);
    const formData = await P.getPokemonByName(defaultForm.pokemon.name);

    const imageUrl = formData.sprites.front_default;
    const types = formData.types.map(t => t.type.name);

    const speciesId = await db.insertPokemonSpecies({
      id: formData.id,
      name: formData.name,
      type1Id: await db.getTypeId(types[0]),
      type2Id: types[1] ? await db.getTypeId(types[1]) : null,
      generation: generationInt,
      imageUrl
    });

    return speciesId;
  } catch (err) {
    console.error(`❌ Failed to populate ${speciesData.name}:`, err.message);
    return null;
  }
};

const populateAllPokemon = async () => {
  const speciesList = await P.getPokemonSpeciesList({ limit: 1025 });

  for (let i = 0; i < speciesList.results.length; i++) {
    const name = speciesList.results[i].name;

    try {
      const speciesData = await P.getPokemonSpeciesByName(name);
      const speciesId = await populateOnePokemon(name, speciesData);
      console.log(speciesId);
      if (speciesId) {
        await populateForms(speciesId, speciesData.varieties);
      }
    } catch (err) {
      console.error(`❌ Error populating ${name}:`, err.message);
    }
    if (i % 25 === 0) {
      console.log(`🔄 Progress: ${i + 1}/${speciesList.results.length}`);
    }
    await new Promise(res => setTimeout(res, 100));
  }
  console.log('🎉 All Pokémon populated!');
};

const populateForms = async (speciesId, varieties) => {
  console.log(`📦 Species ${speciesId} has ${varieties.length} varieties`);

  for (const variety of varieties) {
    if (variety.is_default) continue; // Skip default form
    
    try {
      const formData = await P.getPokemonFormByName(variety.pokemon.name);

      if (formData.is_battle_only) {
        console.log(`⏩ Skipping battle-only form: ${formData.name}`);
        continue;
      }

      const shouldSkip = skipStrings.some(str => formData.name.includes(str));
      
      if (shouldSkip) {
        console.log(`🚫 Skipping special form: ${formData.name}`);
        continue;
      }

      const types = formData.types.map(t => t.type.name);
      const type1Id = await db.getTypeId(types[0]);
      const type2Id = types[1] ? await db.getTypeId(types[1]) : null;
      let imageUrl = formData.sprites.front_default;

      // Minimal, targeted fix for Zygarde 10% missing sprite
      if (!imageUrl && formData.name === 'zygarde-10') {
        const proxyData = await P.getPokemonFormByName('zygarde-10-power-construct');
        imageUrl = proxyData.sprites.front_default;
      }

      console.log(`🔍 Inserting non-default form: ${formData.name}, Types: ${types.join(', ')}`);

      await db.insertForm({
        speciesId,
        formName: formData.name,
        type1Id,
        type2Id,
        imageUrl,
      });
    } catch (err) {
      console.error(`❌ Error populating form ${variety.pokemon.name}:`, err);
    }
  }
};

const populateNatures = async () => {
  for (const name of natureNames) {
    await db.insertNature(name);
    console.log(`✅ Inserted nature: ${name}`);
  }
  console.log('🎉 All natures populated.');
};

const populateTypes = async () => {
  await db.createTables(); // if needed

  for (const type of types) {
    await db.insertType(type);
    console.log(`✅ Inserted type: ${type}`);
  }
  console.log('🎉 All types populated!');
};

const populateDb = async () => {

  console.time('Total population time');
  await db.createTables();

  if (!force) {
    console.log('❌ population aborted. Use { force: true } to wipe and seed.');
    return;
  }

  console.log('🗑️  Truncating tables...');
  await db.truncateTables();
  await populateTypes();
  await populateNatures();
  await populateAllPokemon();
  console.timeEnd('Total population time');
};

module.exports = populateDb;