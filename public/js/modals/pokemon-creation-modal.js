(() => {
  const modal = document.getElementById('pokemonCreationModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const speciesForm = document.getElementById('speciesFilterForm');
  const speciesResults = document.getElementById('speciesResults');
  const detailsForm = document.getElementById('pokemonDetailsForm');
  const backBtn = document.getElementById('detailsBackBtn'); // you add a <button type="button">Back</button>

  let draft = null; // holds slotIndex, speciesId, formId until final save

  /** Utility: switch steps **/
  const showStep = (stepName) => {
    modal.dataset.currentStep = stepName;

    modal.querySelectorAll('.modal-step').forEach(step => {
      step.hidden = step.dataset.step !== stepName;
    });

    // Update header
    const indicator = modal.querySelector('#modalStepIndicator');
    if (indicator) {
      const stepMap = {
        species: { number: 1, total: 2 },
        details: { number: 2, total: 2 }
      };
      const current = stepMap[stepName];
      if (current) {
        indicator.textContent = `Step ${current.number} of ${current.total}`;
      }
    }

    // Disable/enable "Save Pokémon" depending on step and draft state
    const saveBtn = detailsForm.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = !(stepName === 'details' && draft?.speciesId);
    }
  };


  let lastFocusedElement = null;


  window.startPokemonCreation = (slotIndex, opener) => {
    lastFocusedElement = opener || document.activeElement;
    draft = { slotIndex };
    modal.dataset.mode = 'create';
    modal.dataset.slot = slotIndex;

    // Point modal form to create endpoint
    detailsForm.method = 'POST';
    detailsForm.action = `/trainer/${modal.dataset.trainerId}/team/${slotIndex}`;

    showStep('species');
    openModal();
    speciesForm.reset();
    loadSpeciesResults();
  };

  window.startPokemonEdit = (slotIndex, speciesId, formId) => {
    modal.dataset.mode = 'edit';
    modal.dataset.slot = slotIndex;
    draft = { slotIndex, speciesId, formId };

    // Point modal form to update endpoint
    detailsForm.method = 'POST';
    detailsForm.action = `/trainer/${modal.dataset.trainerId}/team/${slotIndex}?_method=PUT`;

  // Prefill details
  const card = document.querySelector(`.slot-card[data-slot="${slotIndex}"]`);
    if (card) {
      modal.querySelector('#details-sprite').src  = card.dataset.imageUrl || '';
      modal.querySelector('#details-name').textContent =
        card.dataset.formName ? capFirst(card.dataset.formName) : capFirst(card.dataset.speciesName);

      detailsForm.nickname.value = card.dataset.nickname || '';
      detailsForm.level.value    = card.dataset.level || '';
      detailsForm.gender.value   = card.dataset.gender || '';
      detailsForm.nature.value   = card.dataset.natureId || '';
    }

    showStep('details');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.inert = false;

    const focusable = modal.querySelector('input[name="nickname"]');
    if (focusable) focusable.focus({ preventScroll: true });
  };

  const loadSpeciesResults = () => {
    speciesResults.querySelectorAll('.species-card').forEach(card => {
      card.hidden = false;
    });
  };
  const trainerPageContent = document.getElementById('trainerPageContent');

  const openModal = () => {
    trainerPageContent.inert = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }

    trainerPageContent.inert = false;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    draft = null;
    speciesForm.reset();
    detailsForm.reset();
  };

  closeBtn.addEventListener('click', closeModal);

  /** Step 1: filter species **/
  speciesForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(speciesForm);
    const nameFilter = (formData.get('name') || '').toLowerCase();
    const typeFilters = formData.getAll('types');        // selected type IDs
    const genFilters  = formData.getAll('generations');  // selected gen numbers

    speciesResults.querySelectorAll('.species-card').forEach(card => {
      const matchesName =
        !nameFilter || card.dataset.speciesName.toLowerCase().includes(nameFilter);

      const type1 = card.dataset.type1Id;
      const type2 = card.dataset.type2Id;
      const matchesType =
        !typeFilters.length ||
        typeFilters.includes(type1) ||
        (type2 && typeFilters.includes(type2));

      const matchesGen =
        !genFilters.length || genFilters.includes(card.dataset.generation);

      card.hidden = !(matchesName && matchesType && matchesGen);
    });
  });


  /** Step 1: select species, go to details **/
  speciesResults.addEventListener('click', (e) => {
    const card = e.target.closest('.species-card');
    if (!card) return;
    draft.speciesId = Number(card.dataset.speciesId);
    draft.formId = card.dataset.formId ? Number(card.dataset.formId) : null;
    populateDetailsHeader(card);
    showStep('details');
  });

  /** Step 2: populate details header **/
  const populateDetailsHeader = (card) => {
    document.getElementById('details-sprite').src = card.dataset.imageUrl || '';
    document.getElementById('details-name').textContent =
      capFirst(card.dataset.formName) || capFirst(card.dataset.speciesName) || '';
  };

  /** Step 2: go back to species **/
  backBtn.addEventListener('click', () => {
    showStep('species');
  });

  /** Step 2: submit details — single form for both modes **/
  detailsForm.addEventListener('submit', e => {
    e.preventDefault(); // We take full control

    const mode      = modal.dataset.mode;
    const slotIndex = modal.dataset.slot || draft?.slotIndex;

    const payload = {
      speciesId: draft?.speciesId,
      formId:    draft?.formId || '',
      nickname:  detailsForm.nickname.value.trim(),
      level:     detailsForm.level.value,
      gender:    detailsForm.gender.value,
      nature:    detailsForm.nature.value
    };

    // Ensure all needed fields are present in the form
    const ensureHidden = (name, value) => {
      // skip if there’s already a non-hidden input with this name
      const existing = detailsForm.querySelector(`[name="${name}"]:not([type="hidden"])`);
      if (existing) return;
      let input = detailsForm.querySelector(`input[type="hidden"][name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        detailsForm.appendChild(input);
      }
      input.value = value;
    };


    ensureHidden('speciesId', payload.speciesId);
    ensureHidden('formId',    payload.formId);

    if (mode === 'create') {
      ensureHidden('slotIndex', slotIndex); // only if backend expects it
    }

    detailsForm.submit();
  });

  /** Render search results **/
  const renderSpeciesResults = (list) => {
    speciesResults.innerHTML = '';
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'species-card';
      card.dataset.speciesId = p.species_id;
      card.dataset.speciesName = p.name;
      card.dataset.type1Id = p.type_id_1;
      card.dataset.type2Id = p.type_id_2 || '';
      card.dataset.generation = p.generation;
      card.dataset.imageUrl = p.image_url;
      card.dataset.formName = p.form_name || '';
      if (p.form_id) card.dataset.formId = p.form_id;
      card.innerHTML = `
        <img loading="lazy" src="${p.image_url}" alt="${p.name}" />
        <p>${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</p>
      `;
      speciesResults.appendChild(card);
    });
  };
})();