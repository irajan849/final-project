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
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    duration: { type: String, default: '3 Days / 2 Nights' },
    price: { type: Number, required: true },
    image: { type: String, default: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
    highlights: { type: String, default: 'Amazing scenic tour' },
    createdAt: { type: Date, default: Date.now }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    bookingId: String,
    packageName: String,
    customerName: String,
    customerEmail: { type: String, default: 'traveler@gmail.com' },
    travelDate: String,
    travelers: { type: Number, default: 2 },
    totalPrice: Number,
    status: { type: String, default: 'Confirmed' }, // Confirmed, Pending, Cancelled, Completed
    createdAt: { type: Date, default: Date.now }
}));

// Initial Seed Destinations
const defaultDestinations = [
    { name: "Manali & Solang Valley", category: "Mountains", duration: "5 Days / 4 Nights", price: 14999, image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80", highlights: "Snow-capped peaks, Rohtang Pass excursion, Old Manali cafes & riverside camp." },
    { name: "Goa Coastal Escape", category: "Beaches", duration: "4 Days / 3 Nights", price: 16500, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80", highlights: "North & South Goa beaches, sunset cruise, water sports & heritage churches." },
    { name: "Leh Ladakh Expedition", category: "Mountains", duration: "7 Days / 6 Nights", price: 28999, image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=800&q=80", highlights: "Pangong Tso Lake, Nubra Valley, Khardung La Pass & ancient monasteries." },
    { name: "Jaipur & Udaipur Royal Tour", category: "Heritage", duration: "5 Days / 4 Nights", price: 19499, image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80", highlights: "Amer Fort, Lake Pichola boat ride, City Palace & traditional Rajasthani dining." },
    { name: "Bali Tropical Retreat", category: "International", duration: "6 Days / 5 Nights", price: 48500, image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80", highlights: "Ubud rice terraces, Uluwatu Temple, Nusa Penida island tour & private pool villa." },
    { name: "Kerala Backwaters & Munnar", category: "Beaches", duration: "5 Days / 4 Nights", price: 21999, image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80", highlights: "Alleppey houseboat stay, Munnar tea gardens, waterfalls & Kathakali show." }
];

// 3. API Routes

// Route to serve Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- DESTINATIONS API ---

// GET: Saari destinations fetch karein
app.get('/api/destinations', async (req, res) => {
    try {
        let destinations = await Destination.find().sort({ createdAt: -1 });
        if (destinations.length === 0) {
            destinations = await Destination.insertMany(defaultDestinations);
        }
        res.json(destinations);
    } catch (error) {
        res.status(500).json({ error: 'Destinations load nahi ho payi' });
    }
});

// POST: Naya Tour Package add karein (Admin)
app.post('/api/destinations', async (req, res) => {
    try {
        const { name, category, duration, price, image, highlights } = req.body;
        if (!name || !price) {
            return res.status(400).json({ error: 'Package Name and Price are required' });
        }
        const newDest = new Destination({
            name,
            category: category || 'Mountains',
            duration: duration || '3 Days / 2 Nights',
            price: Number(price),
            image: image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
            highlights: highlights || 'Exciting travel package'
        });
        await newDest.save();
        res.status(201).json(newDest);
    } catch (error) {
        res.status(500).json({ error: 'Package create karne mein error aaya' });
    }
});

// DELETE: Tour Package delete karein (Admin)
app.delete('/api/destinations/:id', async (req, res) => {
    try {
        await Destination.findByIdAndDelete(req.params.id);
        res.json({ message: 'Package successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Package delete nahi ho paya' });
    }
});

// PUT: Tour Package update karein (Admin)
app.put('/api/destinations/:id', async (req, res) => {
    try {
        const { name, category, duration, price, image, highlights } = req.body;
        const updated = await Destination.findByIdAndUpdate(
            req.params.id,
            {
                name,
                category,
                duration,
                price: Number(price),
                image,
                highlights
            },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Package update karne mein error aaya' });
    }
});

// --- BOOKINGS API ---

// POST: Nayi booking MongoDB mein save karein
app.post('/api/bookings', async (req, res) => {
    try {
        const { packageName, customerName, customerEmail, travelDate, travelers, totalPrice } = req.body;
        const bookingId = 'BK' + Math.floor(100000 + Math.random() * 900000);

        const newBooking = new Booking({
            bookingId,
            packageName,
            customerName,
            customerEmail: customerEmail || 'traveler@gmail.com',
            travelDate,
            travelers: travelers || 2,
            totalPrice,
            status: 'Confirmed'
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

// PATCH: Booking Status update karein (Admin)
app.patch('/api/bookings/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Booking status update nahi ho paya' });
    }
});

// DELETE: Booking delete/cancel karein (Admin)
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking successfully deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Booking delete nahi ho payi' });
    }
});

// --- ADMIN STATS API ---

// GET: Dashboard Stats & Analytics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const bookings = await Booking.find();
        const destinations = await Destination.find();

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const totalBookings = bookings.length;
        const totalDestinations = destinations.length;

        // Unique Customers
        const customerSet = new Set();
        bookings.forEach(b => {
            if (b.customerName) customerSet.add(b.customerName.trim());
        });
        const totalCustomers = customerSet.size;

        // Category breakdown
        const categoryCounts = {};
        destinations.forEach(d => {
            categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
        });

        // Status breakdown
        const statusCounts = { Confirmed: 0, Pending: 0, Cancelled: 0 };
        bookings.forEach(b => {
            const st = b.status || 'Confirmed';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        res.json({
            totalRevenue,
            totalBookings,
            totalDestinations,
            totalCustomers,
            categoryCounts,
            statusCounts,
            recentBookings: bookings.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ error: 'Stats calculate nahi ho paye' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Full-Stack App running at http://localhost:${PORT}`));
