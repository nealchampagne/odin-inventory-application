const db = require('../../../db/queries');
let cachedSpeciesForms = null;

const getCachedSpecies = async () => {
  if (cachedSpeciesForms) return cachedSpeciesForms;

  const speciesList = await db.getAllSpecies(); // [{ id, name, type_1_id, type_2_id, image_url, generation }]
  const formList = await db.getAllForms();      // [{ id, form_name, species_id, type_1_id, type_2_id, image_url }]

  // Group alternate forms by species_id
  const formMap = new Map();
  for (const form of formList) {
    if (!formMap.has(form.species_id)) formMap.set(form.species_id, []);
    formMap.get(form.species_id).push(form);
  }

  // Merge default species + alternates
  const merged = speciesList.flatMap(species => {
    const alternates = formMap.get(species.id) || [];

    // Default entry from speciesList
    const defaultEntry = {
      species_id: species.id,
      name: species.name,
      form_id: null,
      type_1_id: species.type_1_id,
      type_2_id: species.type_2_id,
      image_url: species.image_url,
      generation: species.generation
    };

    // Alternate forms from formList
    const altEntries = alternates.map(form => ({
      species_id: species.id,
      name: form.form_name,
      form_id: form.id,
      type_1_id: form.type_1_id,
      type_2_id: form.type_2_id,
      image_url: form.image_url,
      generation: species.generation
    }));

    return [defaultEntry, ...altEntries];
  });

  // Sort: species_id → default first → then form_id
  merged.sort((a, b) => {
    if (a.species_id !== b.species_id) return a.species_id - b.species_id;
    if (a.form_id === null && b.form_id !== null) return -1;
    if (a.form_id !== null && b.form_id === null) return 1;
    return (a.form_id || 0) - (b.form_id || 0);
  });

  cachedSpeciesForms = merged;
  return cachedSpeciesForms;
};

module.exports = { getCachedSpecies };