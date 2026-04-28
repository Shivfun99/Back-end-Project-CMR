import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';

const router = Router();

// Bulk operations (Place before /:id to avoid conflict)
router.post('/bulk', LeadController.bulkCreate);
router.put('/bulk', LeadController.bulkUpdate);

// Standard CRUD
router.post('/', LeadController.create);
router.get('/', LeadController.getAll);
router.get('/:id', LeadController.getById);
router.put('/:id', LeadController.update);
router.delete('/:id', LeadController.delete);

// Status transition
router.patch('/:id/status', LeadController.transitionStatus);

export default router;
