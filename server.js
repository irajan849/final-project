const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- DNS BYPASS FIX FOR ECONNREFUSED QUERYSRV ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
// ----------------------------------------------

const app = express();
app.use(express.json());
app.use(cors());

// Frontend files ko serve karne ke liye
app.use(express.static(path.join(__dirname, 'public')));

// 1. MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully!'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 2. Database Schemas & Models
const Destination = mongoose.model('Destination', new mongoose.Schema({
    name: String,
    category: String,
    duration: String,
    price: Number,
    image: String,
    highlights: String
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    bookingId: String,
    packageName: String,
    customerName: String,
    travelDate: String,
    travelers: Number,
    totalPrice: Number,
    createdAt: { type: Date, default: Date.now }
}));

// 3. API Routes

// GET: Saari destinations fetch karein
app.get('/api/destinations', async (req, res) => {
    try {
        let destinations = await Destination.find();
        
        // Agar database khaali hai toh automatic 6 packages add ho jayenge
        if (destinations.length === 0) {
            destinations = await Destination.insertMany([
                { name: "Manali & Solang Valley", category: "Mountains", duration: "5 Days / 4 Nights", price: 14999, image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80", highlights: "Snow-capped peaks, Rohtang Pass excursion, Old Manali cafes & riverside camp." },
                { name: "Goa Coastal Escape", category: "Beaches", duration: "4 Days / 3 Nights", price: 16500, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", highlights: "North & South Goa beaches, sunset cruise, water sports & heritage churches." },
                { name: "Leh Ladakh Expedition", category: "Mountains", duration: "7 Days / 6 Nights", price: 28999, image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=800&q=80", highlights: "Pangong Tso Lake, Nubra Valley, Khardung La Pass & ancient monasteries." },
                { name: "Jaipur & Udaipur Royal Tour", category: "Heritage", duration: "5 Days / 4 Nights", price: 19499, image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80", highlights: "Amer Fort, Lake Pichola boat ride, City Palace & traditional Rajasthani dining." },
                { name: "Bali Tropical Retreat", category: "International", duration: "6 Days / 5 Nights", price: 48500, image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80", highlights: "Ubud rice terraces, Uluwatu Temple, Nusa Penida island tour & private pool villa." },
                { name: "Kerala Backwaters & Munnar", category: "Beaches", duration: "5 Days / 4 Nights", price: 21999, image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80", highlights: "Alleppey houseboat stay, Munnar tea gardens, waterfalls & Kathakali show." }
            ]);
        }
        res.json(destinations);
    } catch (error) {
        res.status(500).json({ error: 'Destinations load nahi ho payi' });
    }
});

// POST: Nayi booking MongoDB mein save karein
app.post('/api/bookings', async (req, res) => {
    try {
        const { packageName, customerName, travelDate, travelers, totalPrice } = req.body;
        const bookingId = 'BK' + Math.floor(100000 + Math.random() * 900000);

        const newBooking = new Booking({
            bookingId,
            packageName,
            customerName,
            travelDate,
            travelers,
            totalPrice
        });

        await newBooking.save();
        res.status(201).json(newBooking);
    } catch (error) {
        res.status(500).json({ error: 'Booking save karne mein error aaya' });
    }
});

// GET: Saari saved bookings fetch karein
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Bookings fetch karne mein error aaya' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Full-Stack App running at http://localhost:${PORT}`));