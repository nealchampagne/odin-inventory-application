const express = require('express');
const router = express.Router();
const controller = require('../controllers/trainer-controller');

// Trainer creation
router.get('/trainer/new', controller.getNewTrainerForm);
router.post('/trainer/new', controller.postNewTrainer);

// Pokémon creation/editing in a slot
router.post('/trainer/:id/team/:slot', controller.upsertTrainerPokemon);
router.put('/trainer/:id/team/:slot', controller.upsertTrainerPokemon);

// Pokémon deletion from a slot
router.delete('/trainer/:id/team/:slot', controller.deleteTrainerPokemon);

// Trainer editing and deletion
router.get('/trainer/:id/edit', controller.getEditTrainerForm);
router.put('/trainer/:id', controller.handleUpdateTrainer);
router.delete('/trainer/:id', controller.deleteTrainer);

// Trainer detail and list views
router.get('/trainer/:id', controller.getTrainerDetailView);
router.get('/', controller.getTrainerListView);

// Catch-all 404-page for undefined routes
router.use('/{*splat}', (req, res) => {
  res.status(404).render('not-found');
});

module.exports = router;