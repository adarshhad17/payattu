const Koduthath = require('../models/Koduthath');
const Person = require('../models/Person');

exports.getByPerson = async (req, res) => {
  try {
    const entries = await Koduthath.find({ person: req.params.personId })
      .populate('addedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { personId, amount, note } = req.body;
    const person = await Person.findById(personId);
    if (!person) return res.status(404).json({ message: 'Person not found' });

    const entry = await Koduthath.create({ person: personId, amount, note, addedBy: req.user._id });

    person.koduthathTotal += Number(amount);
    person.koduthathUpdatedAt = new Date();
    person.koduthathUpdatedBy = req.user._id;
    await person.save();

    const populated = await entry.populate('addedBy', 'name role');
    const personPopulated = await person.populate('koduthathUpdatedBy', 'name');
    res.status(201).json({ entry: populated, person: personPopulated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const entry = await Koduthath.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const person = await Person.findById(entry.person);
    if (person) {
      person.koduthathTotal -= entry.amount;
      await person.save();
    }

    await entry.deleteOne();
    res.json({ message: 'Deleted', person });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
