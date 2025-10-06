(() => {
  window.showViewOnlyDetails = (mon) => {
    const modal = document.getElementById('viewPokemonModal');
    if (!modal) return;

    // Track opener slot for focus restoration
    modal.dataset.lastSlotOpened = mon.slotIndex;

    // Populate details
    modal.querySelector('.details-sprite').src       = mon.imageUrl || '';
    modal.querySelector('.details-name').textContent = capFirst(mon.formName) || capFirst(mon.speciesName) || '';
    
      // Type badges
    const type1El = modal.querySelector('#details-type1');
    const type1Bubble = type1El.parentElement;
    type1Bubble.classList.add(mon.type1Name);
    const type2El = modal.querySelector('#details-type2');
    const type2Bubble = type2El.parentElement;
    if (mon.type2Name) type2Bubble.classList.add(mon.type2Name);

    type1El.src = `/images/types/${mon.type1Name}.svg`;
    type1El.alt = `${capFirst(mon.type1Name)} type`;

    if (mon.type2Name) {
      type2El.src = `/images/types/${mon.type2Name}.svg`;
      type2El.alt = `${capFirst(mon.type2Name)} type`;
      type2El.hidden = false;
    } else {
      type2El.hidden = true;
    }
    
    modal.querySelector('.details-nickname').textContent = mon.nickname || '—';
    modal.querySelector('.details-level').textContent    = mon.level || '—';
    modal.querySelector('.details-gender').textContent   = capFirst(mon.gender) || '—';
    modal.querySelector('.details-nature').textContent   = capFirst(mon.natureName) || '—';

    // Wire up edit
    const editBtn = modal.querySelector('#editPokemonBtn');
    if (editBtn) {
      editBtn.onclick = () => {
        window.closeViewModal();
        startPokemonEdit(mon.slotIndex, mon.speciesId, mon.formId);
      };
    }

    // Wire up delete
    const deleteBtn = modal.querySelector('#deletePokemonBtn');
    const deleteForm = modal.querySelector('#deletePokemonForm');

    if (deleteBtn && deleteForm) {
      deleteBtn.onclick = () => {
        if (!confirm('Release this Pokémon?')) return;
        // Point the form to the correct route
        deleteForm.action = `/trainer/${mon.trainerId}/team/${mon.slotIndex}?_method=DELETE`;
        deleteForm.submit();
      };
    };


    // Open modal — enable focus
    modal.inert = false;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Focus close button
    const focusable = modal.querySelector('.close-btn');
    if (focusable) focusable.focus({ preventScroll: true });
  };

  window.closeViewModal = () => {
    const modal = document.getElementById('viewPokemonModal');
    if (!modal) return;

    // 🔄 Reset all type-bubble classes back to base
    modal.querySelectorAll('.type-bubble').forEach(bubble => {
      bubble.className = 'type-bubble';
    });
    
    // Move focus back to opener or grid before hiding
    const opener = document.querySelector(
      `.slot-card[data-slot="${modal.dataset.lastSlotOpened}"]`
    ) || document.querySelector('#trainer-grid') || document.body;
    opener.focus({ preventScroll: true });

    // Hide modal — block focus
    modal.inert = true;
    modal.classList.remove('open');
  };

  // Bind close button
  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('#viewPokemonModal .close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', window.closeViewModal);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('viewPokemonModal');
      if (modal && modal.classList.contains('open')) {
        window.closeViewModal();
      }
    }
  });
})();