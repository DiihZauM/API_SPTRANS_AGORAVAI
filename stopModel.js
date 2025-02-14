const mongoose = require('mongoose');

// Esquema do ponto de parada
const stopSchema = new mongoose.Schema({
    stop_id: {
        type: String,
        required: true,
        unique: true,
    },
    stop_name: {
        type: String,
        required: true,
    },
    stop_desc: String,
    stop_lat: Number,
    stop_lon: Number
});

// Modelo
const Stop = mongoose.model('Stop', stopSchema);

module.exports = Stop;