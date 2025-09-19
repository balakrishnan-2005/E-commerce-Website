const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/techshop')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    category: String,
    image: String,
    stock: Number
});

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    items: [{
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number
    }],
    total: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Auth middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const user = await User.findById(decoded.userId);
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// Routes

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(400).send({ error: 'Registration failed' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ error: 'Login failed' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).send({ error: 'Login failed' });
        }

        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.send({ user, token });
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Get products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.send(products);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch products' });
    }
});

// Create order
app.post('/api/orders', auth, async (req, res) => {
    try {
        const order = new Order({
            userId: req.user._id,
            items: req.body.items,
            total: req.body.total
        });
        await order.save();
        res.status(201).send(order);
    } catch (error) {
        res.status(400).send({ error: 'Failed to create order' });
    }
});

// Get user orders
app.get('/api/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id });
        res.send(orders);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch orders' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});