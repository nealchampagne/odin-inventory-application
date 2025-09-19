(() => {
  const grid = document.getElementById('trainer-grid');
  if (!grid) return;

  const trainerId = grid.dataset.trainerId;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.slot-card');
    if (!card) return;

    const slotIndex = Number(card.dataset.slot);

    if (card.hasAttribute('data-species-id')) {
      showViewOnlyDetails({
        slotIndex,
        trainerId,
        speciesId: Number(card.dataset.speciesId),
        formId: card.dataset.formId ? Number(card.dataset.formId) : null,
        nickname: card.dataset.nickname,
        level: card.dataset.level,
        gender: card.dataset.gender,
        natureName: card.dataset.natureName,
        imageUrl: card.dataset.imageUrl,
        speciesName: card.dataset.speciesName,
        formName: card.dataset.formName,
        type1Name: card.dataset.type1Name,
        type2Name: card.dataset.type2Name || "",
      });
    } else {
      startPokemonCreation(slotIndex, card);
    }
  });
})();