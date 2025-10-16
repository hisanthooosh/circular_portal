const express = require('express');
const System = require('../models/System');

const router = express.Router();

// GET all systems
router.get('/', async (req, res) => {
    try {
        const systems = await System.find();
        res.json(systems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST a new system
router.post('/', async (req, res) => {
    try {
        const newSystem = new System(req.body);
        const savedSystem = await newSystem.save();
        res.status(201).json(savedSystem);
    } catch (error) {
        res.status(400).json({ message: 'Error adding system', error: error.message });
    }
});

// DELETE a system
router.delete('/:id', async (req, res) => {
    try {
        const system = await System.findByIdAndDelete(req.params.id);
        if (!system) {
            return res.status(404).json({ message: 'System not found' });
        }
        res.json({ message: 'System deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
