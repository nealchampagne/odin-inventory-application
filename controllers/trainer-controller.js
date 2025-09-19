
const db = require('../db/queries');
const { getCachedSpecies } = require('../public/js/utils/species-cache');
const isUUID = require('validator/lib/isUUID');

// GET / → root view
const getTrainerListView = async (req, res) => {
  try {
    const trainers = await db.getAllTrainerPreviews();

    res.render('trainer-list', {
      trainers,
      hasTrainers: trainers.length > 0,
    });
  } catch (err) {
    console.error('Error loading trainer list:', err);
    res.status(500).send('Internal Server Error');
  }
};

const getTrainerDetailView = async (req, res) => {
  const trainerId = req.params.id;

  if (trainerId === 'favicon.ico') return res.status(204).end();
  if (!isUUID(trainerId)) return res.status(400).send('Invalid trainer ID');

  try {
    const trainer = await db.getTrainerById(trainerId);
    if (!trainer) return res.status(404).send('Trainer not found');

    const team = await db.getTrainerTeam(trainerId);
    const teamGrid = Array(6).fill(null);
    team.forEach(mon => { teamGrid[mon.slot - 1] = mon; });

    const types = await db.getAllTypes();
    const natures = await db.getAllNatures();
    const allSpecies = await getCachedSpecies();

    res.render('trainer-detail', { 
      trainer, 
      team: teamGrid,       // always 6 elements
      types,
      natures,
      speciesResults: allSpecies 
    });
  } catch (err) {
    console.error('Error loading trainer detail:', err);
    res.status(500).send('Internal Server Error');
  }
};

// GET /new → form to create trainer
const getNewTrainerForm = (req, res) => {
  res.render('trainer-form', {
    trainer: {},
    formAction: '/trainer/new',
    submitLabel: 'Create Trainer'
  });
};

// POST /new → create trainer
const postNewTrainer = async (req, res) => {
  try {
    const { name, age, gender, bio } = req.body;
    await db.insertTrainer({ name, age, gender, bio });
    res.redirect('/');
  } catch (err) {
    console.error('Error creating trainer:', err);
    res.status(500).send('Failed to create trainer');
  };
};

const getEditTrainerForm = async (req, res) => {
  const trainerId = req.params.id;
  if (!isUUID(trainerId)) {
    return res.status(400).send('Invalid trainer ID');
  };
  try {
    const trainer = await db.getTrainerById(trainerId);
    if (!trainer) {
      return res.status(404).send('Trainer not found');
    }
    res.render('trainer-form', { 
      trainer,
      formAction: `/trainer/${trainer.id}?_method=PUT`, 
      submitLabel: 'Update Trainer'
    });
  } catch (err) {
    console.error('Error loading edit form:', err);
    res.status(500).send('Internal Server Error');
  }
};

const handleUpdateTrainer = async (req, res) => {
  const trainerId = req.params.id;
  if (!isUUID(trainerId)) {
    return res.status(400).send('Invalid trainer ID');
  }
  try {
    const { name, age, gender, bio } = req.body;
    await db.updateTrainer(trainerId, { name, age, gender, bio });
    res.redirect(`/trainer/${trainerId}`);
  } catch (err) {
    console.error('Error updating trainer:', err);
    res.status(500).send('Failed to update trainer');
  }
};

const getFilteredSpeciesFromCache = async (req, res) => {
  const { typeIds = [], generationInts = [], name = '' } = req.query;

  const allSpecies = await getCachedSpecies(); // cached

  const filtered = allSpecies.filter(species => {
    const matchesType =
      typeIds.length === 0 ||
      typeIds.includes(String(species.type1_id)) ||
      (species.type_2_id && typeIds.includes(String(species.type_2_id)));

    const matchesGen =
      generationInts.length === 0 ||
      generationInts.includes(String(species.generation));

    const matchesName =
      name.trim() === '' ||
      species.name.toLowerCase().includes(name.toLowerCase());

    return matchesType && matchesGen && matchesName;
  });

  res.json(filtered);
};

const getSpeciesFilterResults = async (req, res) => {
  const { id } = req.params;
  const { types = [], generations = [], name = '' } = req.query;

  const allSpecies = await getCachedSpecies();

  const filtered = allSpecies.filter(species => {
    const matchesType =
      types.length === 0 ||
      types.includes(String(species.type_1_id)) ||
      (species.type_2_id && types.includes(String(species.type_2_id)));

    const matchesGen =
      generations.length === 0 ||
      generations.includes(String(species.generation));

    const matchesName =
      name.trim() === '' ||
      species.name.toLowerCase().includes(name.toLowerCase());

    return matchesType && matchesGen && matchesName;
  });

  res.json(filtered);
};

const upsertTrainerPokemon = async (req, res) => {
  const trainerId = req.params.id;                  // or req.params.trainerId if your route uses that
  const slot      = Number(req.params.slot);

  const {
    speciesId,
    formId    = null,
    nickname  = null,
    level     = null,
    gender    = null,
    nature    = null
  } = req.body;

  console.log('Request path:', req.originalUrl);
  console.log('Parsed params:', req.params);
  console.log('Parsed body:', req.body);

  try {
    await db.upsertTrainerPokemonSlot(
      trainerId,
      slot,
      {
        speciesId: Number(speciesId),
        formId:    formId    ? Number(formId) : null,
        nickname:  nickname  && nickname.trim() ? nickname.trim() : null,
        level:     level     ? Number(level) : null,
        gender:    gender    || null,
        natureId:  nature    ? Number(nature) : null
      }
    );

    // In PRG pattern, redirect to trainer detail
    res.redirect(`/trainer/${trainerId}`);
  } catch (err) {
    console.error('upsertTrainerPokemonSlot failed', err);
    res.status(500).json({ error: 'Failed to save slot' });
  }
};

const deleteTrainer = async (req, res) => {
  const trainerId = req.params.id;

  if (!isUUID(trainerId)) {
    return res.status(400).send('Invalid trainer ID');
  }

  try {
    await db.deleteTrainer(trainerId);
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting trainer:', err);
    res.status(500).send('Failed to delete trainer');
  }
};

const deleteTrainerPokemon = async (req, res) => {
  console.log('DELETE route hit', req.method, req.params);
  const trainerId = req.params.id;
  const slot = Number(req.params.slot); // Ensure slot is a number
  if (!isUUID(trainerId)) {
    return res.status(400).send('Invalid trainer ID');
  }
  if (isNaN(slot) || slot < 1 || slot > 6) {
    return res.status(400).send('Invalid slot number');
  }
  try {
    await db.deleteTrainerPokemonSlot(trainerId, slot);
    res.redirect(`/trainer/${trainerId}`);
  } catch (err) {
    console.error('Error deleting Pokémon from slot:', err);
    res.status(500).send('Failed to delete Pokémon from slot');
  }
};

module.exports = {
  getTrainerListView,
  getTrainerDetailView,
  getNewTrainerForm,
  postNewTrainer,
  getFilteredSpeciesFromCache,
  getSpeciesFilterResults,
  getEditTrainerForm,
  handleUpdateTrainer,
  upsertTrainerPokemon,
  deleteTrainer,
  deleteTrainerPokemon,
};