require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../images')),
  filename: (req, file, cb) => cb(null, 'product-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
}});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/velore')
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ==================== MODELS ====================

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  longDescription: String,
  price: Number,
  originalPrice: Number,
  imageSrc: String,
  category: { type: String, default: 'all' },
  ingredients: [String],
  howToUse: String,
  size: String,
  rating: { type: Number, default: 4.8 },
  reviews: { type: Number, default: 0 },
  stock: { type: Number, default: 100 },
  isFeatured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  isBestseller: { type: Boolean, default: false }
});
const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
  razorpay_order_id: String,
  razorpay_payment_id: String,
  amount: Number,
  currency: { type: String, default: 'INR' },
  status: { type: String, default: 'created', enum: ['created','paid','processing','shipped','delivered','cancelled'] },
  trackingId: String,
  customerDetails: {
    name: String, email: String, address: String, city: String, pincode: String, phone: String
  },
  items: [{ productId: String, name: String, price: Number, quantity: Number, imageSrc: String }],
  couponUsed: String,
  discount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  addresses: [{ label: String, line1: String, city: String, pincode: String, phone: String }],
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

const ContactSchema = new mongoose.Schema({
  name: String, email: String, subject: String, message: String,
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercent: { type: Number, required: true },
  minAmount: { type: Number, default: 0 },
  maxUses: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: Date
});
const Coupon = mongoose.model('Coupon', CouponSchema);

const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Newsletter = mongoose.model('Newsletter', NewsletterSchema);

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  excerpt: String,
  content: { type: String, required: true },
  coverImage: String,
  category: { type: String, default: 'skincare' },
  tags: [String],
  author: { type: String, default: 'VELORÉ Team' },
  isPublished: { type: Boolean, default: true },
  readTime: Number,
  createdAt: { type: Date, default: Date.now }
});
BlogSchema.pre('save', function(next) {
  if (!this.slug) this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!this.readTime) this.readTime = Math.max(1, Math.ceil(this.content.split(/\s+/).length / 200));
  next();
});
const Blog = mongoose.model('Blog', BlogSchema);

// ==================== SEED ====================

app.get('/api/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    const products = [
      { name:"Botanical Renewal Cream", description:"Silk-touch hydration infused with rare botanicals", longDescription:"A deeply nourishing face cream that combines the restorative power of 12 rare botanicals with advanced peptide technology. The silk-touch texture melts into skin, delivering intense hydration that lasts 72 hours.", price:14500, originalPrice:17000, imageSrc:"luminea botinual renual cream facepack/ezgif-frame-060.png", category:"skincare", ingredients:["Rare Orchid Extract","Peptide Complex","Hyaluronic Acid","Shea Butter","Vitamin E"], howToUse:"Apply a pearl-sized amount to cleansed face and neck morning and night.", size:"50ml", rating:4.9, reviews:234, stock:15, isFeatured:true, isBestseller:true },
      { name:"Aqua Hydrating Serum", description:"Deep moisture with ocean-derived actives", longDescription:"This revolutionary water-gel serum harnesses the power of deep-sea minerals and marine collagen to deliver an instant surge of hydration that penetrates 5 layers deep.", price:11600, originalPrice:13000, imageSrc:"luminea hydrating serum/ezgif-frame-040.png", category:"skincare", ingredients:["Marine Collagen","Sea Kelp","Niacinamide","Squalane","Blue Algae"], howToUse:"Dispense 2-3 drops onto fingertips. Press gently into cleansed, slightly damp skin.", size:"30ml", rating:4.8, reviews:189, stock:42, isFeatured:true, isNew:true },
      { name:"Midnight Recovery Oil", description:"Overnight renewal for luminous mornings", longDescription:"While you sleep, this potent blend of 9 essential oils works in harmony with your skin's natural nighttime repair cycle. Wake to visibly smoother, firmer, and more radiant skin.", price:13200, imageSrc:"images/product-oil.png", category:"skincare", ingredients:["Rosehip Oil","Lavender Oil","Retinol","Jojoba Oil","Evening Primrose"], howToUse:"Apply 4-5 drops to clean skin as the last step in your evening routine.", size:"30ml", rating:4.7, reviews:312, stock:8, isBestseller:true },
      { name:"Velvet Matte Lip Elixir", description:"Weightless color that whispers luxury", longDescription:"An ultra-pigmented, long-wearing liquid lip color with the comfort of a balm. Velvet-soft matte finish stays put for up to 12 hours without drying.", price:5400, imageSrc:"images/product-lip.png", category:"makeup", ingredients:["Hyaluronic Acid","Vitamin E","Jojoba Oil","Natural Pigments"], howToUse:"Apply directly from the doe-foot applicator.", size:"5ml", rating:4.6, reviews:156, stock:65, isNew:true },
      { name:"Rose Petal Cleansing Balm", description:"Melts away the day, reveals the glow", longDescription:"This transformative cleansing balm dissolves stubborn makeup, SPF, and impurities with a single scoop. Real rose petals are suspended in a buttery-soft balm.", price:7300, imageSrc:"images/product-balm.png", category:"skincare", ingredients:["Rose Petal Extract","Moringa Oil","Chamomile","Coconut Oil"], howToUse:"Scoop a generous amount onto dry hands. Massage over dry face for 60 seconds.", size:"100ml", rating:4.9, reviews:278, stock:3, isBestseller:true },
      { name:"Éclat Brightening Essence", description:"A veil of light for porcelain radiance", longDescription:"This featherweight essence combines the brightening power of vitamin C with gentle AHA exfoliation. Fades dark spots and creates a luminous glass-skin effect.", price:10000, imageSrc:"images/product-essence.png", category:"skincare", ingredients:["Vitamin C","Alpha Hydroxy Acid","Licorice Extract","Galactomyces"], howToUse:"After cleansing, pat gently into skin avoiding the eye area.", size:"150ml", rating:4.8, reviews:195, stock:28, isFeatured:true },
      { name:"Golden Hour Highlighter", description:"Captured sunlight for your cheekbones", longDescription:"An ultra-fine, wet-look highlighter that mimics the golden glow of sunset on skin. Micro-milled light-reflecting particles create buildable luminosity.", price:4800, imageSrc:"images/product-oil.png", category:"makeup", ingredients:["Mica","Vitamin E","Coconut Oil","Gold Pigment","Diamond Powder"], howToUse:"Apply to high points of the face using a fan brush or fingertips.", size:"12g", rating:4.7, reviews:89, stock:50, isNew:true },
      { name:"Immortelle Night Mask", description:"Wake up transformed, never transfer", longDescription:"This leave-on sleeping mask works overnight to deeply repair and rejuvenate tired, stressed skin with immortelle flower extract and bakuchiol.", price:9800, imageSrc:"luminea botinual renual cream facepack/ezgif-frame-060.png", category:"skincare", ingredients:["Immortelle Extract","Bakuchiol","Ceramides","Peptides","Probiotics"], howToUse:"Apply a generous layer as the last PM step, 2-3 times per week.", size:"75ml", rating:4.9, reviews:167, stock:22 },
      { name:"Silk Primer Elixir", description:"The invisible veil of perfection", longDescription:"A silky, oil-free primer that blurs pores, smooths texture, and creates a flawless canvas for makeup with micro-smoothing technology.", price:6200, imageSrc:"luminea hydrating serum/ezgif-frame-040.png", category:"makeup", ingredients:["Silica","Hyaluronic Acid","Vitamin B5","Green Tea"], howToUse:"Apply a thin layer after moisturizer and before foundation.", size:"30ml", rating:4.5, reviews:102, stock:35, isNew:true },
      { name:"Oud & Amber Perfume Oil", description:"Intoxicating warmth, whispered sophistication", longDescription:"A rich, alcohol-free roll-on perfume oil that melds smoky oud with golden amber, softened by vanilla orchid and sandalwood. Lasts 12+ hours.", price:8500, imageSrc:"images/product-essence.png", category:"fragrance", ingredients:["Oud Wood","Amber Resin","Vanilla Orchid","Sandalwood","Musk"], howToUse:"Roll onto pulse points: wrists, behind ears, and base of throat.", size:"10ml", rating:4.9, reviews:341, stock:12, isFeatured:true, isBestseller:true },
      { name:"Pétale De Rose Mist", description:"Instant refresh, anytime anywhere", longDescription:"A superfine facial mist crafted from Bulgarian rose water and hyaluronic acid for on-the-go hydration.", price:3200, imageSrc:"images/product-balm.png", category:"skincare", ingredients:["Bulgarian Rose Water","Hyaluronic Acid","Aloe Vera","Cucumber Extract"], howToUse:"Hold 8-10 inches from face and mist evenly.", size:"100ml", rating:4.6, reviews:215, stock:60 },
      { name:"Noir Velvet Mascara", description:"Drama-defining volume, zero clumps", longDescription:"A jet-black, fiber-enriched mascara that delivers theatrical volume and dramatic length in a single coat. Smudge-proof for 16 hours.", price:3800, imageSrc:"images/product-lip.png", category:"makeup", ingredients:["Beeswax","Castor Oil","Vitamin B5","Silk Fiber"], howToUse:"Starting at the base of lashes, wiggle the brush upward to the tips.", size:"12ml", rating:4.4, reviews:98, stock:45, isNew:true }
    ];
    await Product.insertMany(products);
    // Seed coupons
    await Coupon.insertMany([
      { code: 'WELCOME10', discountPercent: 10, minAmount: 3000, maxUses: 1000 },
      { code: 'LUXURY20', discountPercent: 20, minAmount: 10000, maxUses: 50 },
      { code: 'VIP15', discountPercent: 15, minAmount: 5000, maxUses: 200 }
    ]);
    res.json({ message: `Seeded ${products.length} products + 3 coupons!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PRODUCT ROUTES ====================

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    let sortObj = {};
    if (sort === 'price-low') sortObj = { price: 1 };
    else if (sort === 'price-high') sortObj = { price: -1 };
    else if (sort === 'newest') sortObj = { _id: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    const products = await Product.find(query).sort(sortObj);
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Related products (same category, exclude current)
app.get('/api/products/:id/related', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const related = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(4);
    res.json(related);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== REVIEWS ====================

app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 }).limit(20);
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Please sign in to leave a review.' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const review = new Review({ productId, userId: user._id, userName: user.name, rating, comment });
    await review.save();

    // Update product rating
    const allReviews = await Review.find({ productId });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, { rating: Math.round(avgRating * 10) / 10, reviews: allReviews.length });

    res.status(201).json(review);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== AUTH ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match." });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists." });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = new User({ name, email, mobile, password: hashed });
    await user.save();
    res.status(201).json({ message: "Registration successful!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

// Get user orders
app.get('/api/auth/orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const orders = await Order.find({ 'customerDetails.email': user.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== COUPONS ====================

app.post('/api/coupon/validate', async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ error: 'Coupon has expired.' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached.' });
    if (amount < coupon.minAmount) return res.status(400).json({ error: `Minimum order ₹${coupon.minAmount.toLocaleString()} required.` });
    const discount = Math.round(amount * coupon.discountPercent / 100);
    res.json({ discount, percent: coupon.discountPercent, code: coupon.code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ORDERS / PAYMENT ====================

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, items, customerDetails, couponCode, discount } = req.body;
    const finalAmount = Math.max(amount - (discount || 0), 1);
    const options = { amount: finalAmount * 100, currency: "INR", receipt: "receipt_" + Date.now() };
    const order = await razorpay.orders.create(options);
    const newOrder = new Order({
      razorpay_order_id: order.id, amount: finalAmount, items, customerDetails,
      couponUsed: couponCode || '', discount: discount || 0
    });
    await newOrder.save();
    // Increment coupon usage
    if (couponCode) await Coupon.findOneAndUpdate({ code: couponCode }, { $inc: { usedCount: 1 } });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret').update(sign).digest("hex");
    if (razorpay_signature === expected) {
      await Order.findOneAndUpdate({ razorpay_order_id }, { status: 'paid', razorpay_payment_id });
      // Decrease stock
      const order = await Order.findOne({ razorpay_order_id });
      if (order) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }
      }
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature!" });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== NEWSLETTER ====================

app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const existing = await Newsletter.findOne({ email });
    if (existing) return res.json({ message: 'You are already subscribed!' });
    await new Newsletter({ email }).save();
    res.status(201).json({ message: 'Welcome! Enjoy 10% off with code WELCOME10' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== CONTACT ====================

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Required fields missing.' });
    await new Contact({ name, email, subject, message }).save();
    res.status(201).json({ message: 'Your message has been received. We will respond within 24 hours.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ADMIN ====================

app.get('/api/admin/orders', async (req, res) => {
  try { res.json(await Order.find({}).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/orders/:id', async (req, res) => {
  try { res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/contacts', async (req, res) => {
  try { res.json(await Contact.find({}).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ status: 'paid' });
    const totalRevenue = (await Order.aggregate([{ $match: { status: { $in: ['paid','processing','shipped','delivered'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]))[0]?.total || 0;
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    res.json({ totalOrders, paidOrders, totalRevenue, totalUsers, totalProducts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Add Product (with image upload)
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, longDescription, price, originalPrice, category, ingredients, howToUse, size, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required.' });
    const imageSrc = req.file ? `images/${req.file.filename}` : (req.body.imageSrc || 'images/product-oil.png');
    const product = new Product({
      name, description: description || '', longDescription: longDescription || '',
      price: Number(price), originalPrice: originalPrice ? Number(originalPrice) : undefined,
      imageSrc, category: category || 'skincare',
      ingredients: ingredients ? ingredients.split(',').map(i => i.trim()) : [],
      howToUse: howToUse || '', size: size || '',
      stock: stock ? Number(stock) : 100, isNew: true
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Update Product
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice);
    if (updates.stock) updates.stock = Number(updates.stock);
    if (updates.ingredients) updates.ingredients = updates.ingredients.split(',').map(i => i.trim());
    if (req.file) updates.imageSrc = `images/${req.file.filename}`;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Delete Product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== BLOG ROUTES ====================

// Get all published blogs
app.get('/api/blogs', async (req, res) => {
  try {
    const { category } = req.query;
    let query = { isPublished: true };
    if (category && category !== 'all') query.category = category;
    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single blog by slug
app.get('/api/blogs/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      // Try by ID fallback
      const byId = await Blog.findById(req.params.slug).catch(() => null);
      if (!byId) return res.status(404).json({ error: 'Blog not found' });
      return res.json(byId);
    }
    res.json(blog);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Create blog
app.post('/api/admin/blogs', upload.single('coverImage'), async (req, res) => {
  try {
    const { title, excerpt, content, category, tags, author } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
    const coverImage = req.file ? `images/${req.file.filename}` : (req.body.coverImageUrl || '');
    const blog = new Blog({
      title, excerpt: excerpt || content.substring(0, 160),
      content, coverImage, category: category || 'skincare',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      author: author || 'VELORÉ Team'
    });
    await blog.save();
    res.status(201).json(blog);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Update blog
app.put('/api/admin/blogs/:id', upload.single('coverImage'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.coverImage = `images/${req.file.filename}`;
    if (updates.tags) updates.tags = updates.tags.split(',').map(t => t.trim());
    if (updates.content) updates.readTime = Math.max(1, Math.ceil(updates.content.split(/\s+/).length / 200));
    const blog = await Blog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!blog) return res.status(404).json({ error: 'Blog not found.' });
    res.json(blog);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Delete blog
app.delete('/api/admin/blogs/:id', async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Get all blogs (including unpublished)
app.get('/api/admin/blogs', async (req, res) => {
  try { res.json(await Blog.find({}).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== START ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
