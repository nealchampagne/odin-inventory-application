const Pokedex = require('pokeapi-js-wrapper');
const db = require('./queries');
const P = new Pokedex.Pokedex({ cache: false });
const readline = require('readline');

const confirmTruncate = async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise(resolve => {
    rl.question('⚠️ This will erase all data. Continue? (y/n) ', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
};

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

const ROMAN_MAP = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5,
  vi: 6, vii: 7, viii: 8, ix: 9, x: 10
};

const extractChainId = url => {
  const match = url.match(/\/evolution-chain\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
};

const getSpeciesNamesFromChain = chain => {
  const names = [];

  const traverse = node => {
    names.push(node.species.name);
    node.evolves_to.forEach(traverse);
  };

  traverse(chain.chain);
  return names;
};

const resolveEvolutionFamilyName = (chain, knownSpecies) => {
  const names = getSpeciesNamesFromChain(chain);

  // Use known species if it's in the chain
  if (names.includes(knownSpecies.name) && !knownSpecies.is_baby) {
    return knownSpecies.name;
  }

  // Otherwise, fallback to first name in chain
  return names[0];
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

const populateOnePokemon = async speciesData => {
  try {

    const generationInt = parseGenerationSlug(speciesData.generation.name);
    const defaultForm = speciesData.varieties.find(v => v.is_default);
    const formData = await P.getPokemonByName(defaultForm.pokemon.name);

    const chainId = extractChainId(speciesData.evolution_chain.url);
    const chain = await P.getEvolutionChainById(chainId);
    const familyName = resolveEvolutionFamilyName(chain, speciesData);
    
    const imageUrl = formData.sprites.other['official-artwork'].front_default;
    const types = formData.types.map(t => t.type.name);

    const evolutionFamilyId = await db.insertEvolutionFamily(chainId, familyName);

    const speciesId = await db.insertPokemonSpecies({
      id: speciesData.id,
      name: speciesData.name,
      type1Id: await db.getTypeId(types[0]),
      type2Id: types[1] ? await db.getTypeId(types[1]) : null,
      evolutionFamilyId,
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
      const speciesId = await populateOnePokemon(speciesData);
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

      const types = formData.types.map(t => t.type.name);
      const type1Id = await db.getTypeId(types[0]);
      const type2Id = types[1] ? await db.getTypeId(types[1]) : null;

      console.log(`🔍 Inserting non-default form: ${formData.name}, Types: ${types.join(', ')}`);

      await db.insertForm({
        speciesId,
        formName: formData.name,
        type1Id,
        type2Id,
        imageUrl: formData.sprites.front_default
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

  const confirmed = await confirmTruncate();
  if (!confirmed) {
    console.log('❌ population aborted.');
    return;
  };
  console.log('🗑️  Truncating tables...');
  await db.truncateTables();
  await populateTypes();
  await populateNatures();
  await populateAllPokemon();
  console.timeEnd('Total population time');
};

populateDb();

