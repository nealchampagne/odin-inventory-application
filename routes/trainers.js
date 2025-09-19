const express = require('express');
const router = express.Router();
const controller = require('../controllers/trainer-controller');

router.get('/trainer/new', controller.getNewTrainerForm);
router.post('/trainer/new', controller.postNewTrainer);

router.post('/trainer/:id/team/:slot', controller.upsertTrainerPokemon);
router.put('/trainer/:id/team/:slot', controller.upsertTrainerPokemon);

router.delete('/trainer/:id/team/:slot', controller.deleteTrainerPokemon);

router.get('/trainer/:id/species-filter', controller.getSpeciesFilterResults);
router.get('/trainer/:id/edit', controller.getEditTrainerForm);
router.put('/trainer/:id', controller.handleUpdateTrainer);

router.delete('/trainer/:id', controller.deleteTrainer);

router.get('/trainer/:id', controller.getTrainerDetailView);
router.get('/', controller.getTrainerListView);


module.exports = router;