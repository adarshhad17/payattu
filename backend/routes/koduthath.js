const router = require('express').Router();
const { getByPerson, create, remove } = require('../controllers/koduthathController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/:personId', getByPerson);
router.post('/', create);                       // both admin and parent can add
router.delete('/:id', adminOnly, remove);

module.exports = router;
