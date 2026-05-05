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

// Admin Authorization Middleware
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Access denied. Admin only.' });
    req.user = user;
    next();
  } catch (err) { res.status(401).json({ error: 'Invalid or expired token.' }); }
};

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
  alternatePhone: { type: String, default: '' },
  gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
  dateOfBirth: { type: String, default: '' },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  addresses: [{
    label: { type: String, default: 'Home' },
    fullName: String,
    phone: String,
    line1: String,
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: String,
    state: String,
    pincode: String,
    isDefault: { type: Boolean, default: false }
  }],
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
      // ── SKINCARE ────────────────────────────────────────────────────────────
      {
        name: "Botanical Renewal Cream",
        description: "Silk-touch 72-hour hydration infused with 12 rare botanicals",
        longDescription: "A deeply nourishing face cream that combines the restorative power of 12 rare botanicals with advanced peptide technology. The silk-touch texture melts into skin, delivering intense hydration that lasts 72 hours. Clinically proven to reduce fine lines by 38% in 4 weeks.",
        price: 14500, originalPrice: 17000,
        imageSrc: "images/product-cream.png",
        category: "skincare",
        ingredients: ["Rare Orchid Extract","Peptide Complex","Hyaluronic Acid","Shea Butter","Vitamin E","Ceramide-3"],
        howToUse: "Apply a pearl-sized amount to cleansed face and neck morning and night. Follow with SPF in the AM.",
        size: "50ml", rating: 4.9, reviews: 234, stock: 15, isFeatured: true, isBestseller: true
      },
      {
        name: "Aqua Hydrating Serum",
        description: "Deep moisture with ocean-derived actives — penetrates 5 layers deep",
        longDescription: "This revolutionary water-gel serum harnesses the power of deep-sea minerals and marine collagen to deliver an instant surge of hydration. The advanced delivery system ensures actives penetrate all 5 skin layers, plumping from within for a visibly dewy, glass-skin effect.",
        price: 11600, originalPrice: 13000,
        imageSrc: "luminea hydrating serum/ezgif-frame-040.png",
        category: "skincare",
        ingredients: ["Marine Collagen","Sea Kelp","Niacinamide","Squalane","Blue Algae","Panthenol"],
        howToUse: "Dispense 2-3 drops onto fingertips. Press gently into cleansed, slightly damp skin before moisturiser.",
        size: "30ml", rating: 4.8, reviews: 189, stock: 42, isFeatured: true, isNew: true
      },
      {
        name: "Midnight Recovery Oil",
        description: "9-oil overnight elixir — wake to visibly firmer, radiant skin",
        longDescription: "While you sleep, this potent blend of 9 essential oils works in harmony with your skin's natural nighttime repair cycle. Retinol gently resurfaces, rosehip brightens, and evening primrose restores elasticity. Wake to visibly smoother, firmer, and more radiant skin every morning.",
        price: 13200, originalPrice: 15500,
        imageSrc: "images/product-oil.png",
        category: "skincare",
        ingredients: ["Rosehip Oil","Lavender Oil","Retinol (0.3%)","Jojoba Oil","Evening Primrose","Argan Oil"],
        howToUse: "Apply 4-5 drops to clean skin as the last step in your evening routine. Avoid eye area.",
        size: "30ml", rating: 4.7, reviews: 312, stock: 8, isBestseller: true
      },
      {
        name: "Rose Petal Cleansing Balm",
        description: "Melts makeup & SPF in 60 seconds, reveals lit-from-within glow",
        longDescription: "This transformative cleansing balm dissolves the most stubborn waterproof makeup, SPF, and environmental pollutants with a single scoop. Real Bulgarian rose petals suspended in a buttery-soft moringa and chamomile base leave skin clean, calm, and radiant — never stripped.",
        price: 7300, originalPrice: 8500,
        imageSrc: "images/product-balm.png",
        category: "skincare",
        ingredients: ["Rose Petal Extract","Moringa Oil","Chamomile","Coconut Oil","Calendula"],
        howToUse: "Scoop a generous amount onto dry hands. Massage over dry face for 60 seconds. Emulsify with water, rinse thoroughly.",
        size: "100ml", rating: 4.9, reviews: 278, stock: 3, isBestseller: true
      },
      {
        name: "Éclat Brightening Essence",
        description: "15% Vitamin C + AHA — fades spots, builds luminous glass skin",
        longDescription: "This featherweight essence combines a potent 15% stabilised vitamin C with gentle AHA exfoliation and galactomyces ferment filtrate. Targets hyperpigmentation, evens skin tone, and creates a luminous glass-skin effect that lasts all day.",
        price: 10000, originalPrice: 12000,
        imageSrc: "images/product-essence.png",
        category: "skincare",
        ingredients: ["Vitamin C (15%)","Alpha Hydroxy Acid","Licorice Extract","Galactomyces Ferment","Niacinamide"],
        howToUse: "After cleansing, pat gently into skin avoiding the eye area. Use AM & PM. Always wear SPF in the morning.",
        size: "150ml", rating: 4.8, reviews: 195, stock: 28, isFeatured: true
      },
      {
        name: "Immortelle Night Mask",
        description: "Leave-on sleeping mask — wake up to visibly plumper, younger skin",
        longDescription: "Enriched with Corsican immortelle flower extract (proven to slow skin ageing) and plant-based bakuchiol (the gentle retinol alternative), this luxurious leave-on sleeping mask deeply repairs and rejuvenates tired skin overnight without any irritation.",
        price: 9800, originalPrice: 11500,
        imageSrc: "luminea botinual renual cream facepack/ezgif-frame-060.png",
        category: "skincare",
        ingredients: ["Immortelle Extract","Bakuchiol","Ceramides","Peptide Blend","Probiotics","Shea Butter"],
        howToUse: "Apply a generous layer as the last PM step, 2-3 nights per week. No need to rinse off.",
        size: "75ml", rating: 4.9, reviews: 167, stock: 22
      },
      {
        name: "Pétale De Rose Face Mist",
        description: "Instant hydration mist — Bulgarian rose water + Hyaluronic Acid",
        longDescription: "A superfine, fast-absorbing facial mist crafted from 100% pure Bulgarian rose water, triple-weight hyaluronic acid, and soothing aloe vera. Use over makeup to set and refresh, or on bare skin for an instant glow boost anytime, anywhere.",
        price: 3200, originalPrice: 3900,
        imageSrc: "images/product-balm.png",
        category: "skincare",
        ingredients: ["Bulgarian Rose Water","Hyaluronic Acid (3 weights)","Aloe Vera","Cucumber Extract","Glycerin"],
        howToUse: "Hold 8-10 inches from face. Close eyes and mist evenly. Can be used over or under makeup.",
        size: "100ml", rating: 4.6, reviews: 215, stock: 60
      },

      // ── MAKEUP ──────────────────────────────────────────────────────────────
      {
        name: "Velvet Matte Lip Elixir",
        description: "12-hour liquid lipstick — ultra-pigmented, featherlight, non-drying",
        longDescription: "An ultra-pigmented, long-wearing liquid lip color with the comfort of a nourishing balm. The innovative velvet-soft matte formula locks in colour for up to 12 hours without feathering, fading, or drying. Enriched with hyaluronic acid to keep lips soft and supple all day.",
        price: 5400, originalPrice: 6500,
        imageSrc: "images/product-lipstick.png",
        category: "makeup",
        ingredients: ["Hyaluronic Acid","Vitamin E","Jojoba Oil","Natural Pigments","Beeswax"],
        howToUse: "Apply directly from the precision doe-foot applicator. Start at the cupid's bow and work outward.",
        size: "5ml", rating: 4.6, reviews: 156, stock: 65, isNew: true
      },
      {
        name: "Golden Hour Highlighter",
        description: "Micro-milled 24k gold-toned highlighter — buildable, blinding luminosity",
        longDescription: "An ultra-fine, wet-look highlighter powder that mimics the iconic golden glow of golden hour on skin. Infused with real diamond powder and 24k gold micro-pigments, this highlighter delivers a blinding, multidimensional luminosity that photographs beautifully in any light.",
        price: 4800, originalPrice: 5800,
        imageSrc: "images/product-oil.png",
        category: "makeup",
        ingredients: ["Mica","Synthetic Diamond Powder","Gold Pigment","Vitamin E","Coconut Oil"],
        howToUse: "Apply to high points of the face (cheekbones, brow bone, cupid's bow) using a fan brush or fingertips.",
        size: "12g", rating: 4.7, reviews: 89, stock: 50, isNew: true
      },
      {
        name: "Silk Primer Elixir",
        description: "Pore-blurring, oil-free primer — the invisible veil of flawless skin",
        longDescription: "A silky, weightless oil-free primer that blurs pores, smooths surface texture, and creates a perfectly even canvas for makeup application. The micro-smoothing technology diffuses light for an airbrushed finish that lasts all day without slipping, creasing, or looking cakey.",
        price: 6200, originalPrice: 7400,
        imageSrc: "luminea hydrating serum/ezgif-frame-040.png",
        category: "makeup",
        ingredients: ["Silica Microspheres","Hyaluronic Acid","Vitamin B5","Green Tea Extract","Aloe Vera"],
        howToUse: "Apply a thin, even layer after moisturizer and before foundation. Allow 30 seconds to absorb.",
        size: "30ml", rating: 4.5, reviews: 102, stock: 35, isNew: true
      },
      {
        name: "Noir Velvet Mascara",
        description: "16-hour smudge-proof mascara — silk-fiber volume & dramatic length",
        longDescription: "A jet-black, silk-fiber-enriched mascara that delivers theatrical volume and dramatic lash extension in a single coat. The award-winning precision brush coats every lash from root to tip. Smudge-proof, flake-free formula lasts 16 hours even in humidity and heat.",
        price: 3800, originalPrice: 4500,
        imageSrc: "images/product-lip.png",
        category: "makeup",
        ingredients: ["Beeswax","Castor Oil","Vitamin B5","Silk Fiber","Carbon Black","Panthenol"],
        howToUse: "Starting at the base of lashes, wiggle the brush in a zig-zag motion upward to the tips. Layer for more volume.",
        size: "12ml", rating: 4.4, reviews: 98, stock: 45, isNew: true
      },

      // ── FRAGRANCE ───────────────────────────────────────────────────────────
      {
        name: "Oud & Amber Perfume Oil",
        description: "12-hour alcohol-free roll-on — smoky oud, golden amber, vanilla orchid",
        longDescription: "A richly opulent, alcohol-free concentrated perfume oil that opens with smoky oud and golden amber, transitions through a heart of vanilla orchid and jasmine, and settles into a warm base of sandalwood and white musk. Skin-safe, long-lasting and deeply addictive.",
        price: 8500, originalPrice: 10000,
        imageSrc: "images/product-perfume.png",
        category: "fragrance",
        ingredients: ["Oud Wood","Amber Resin","Vanilla Orchid","Sandalwood","White Musk","Jasmine Absolute"],
        howToUse: "Roll onto warm pulse points: inner wrists, behind ears, base of throat, and décolletage. Layer for intensity.",
        size: "10ml", rating: 4.9, reviews: 341, stock: 12, isFeatured: true, isBestseller: true
      },
      {
        name: "Blanc Fleur Eau de Parfum",
        description: "Airy white floral EDP — gardenia, jasmine & soft musks",
        longDescription: "An ethereal, feminine eau de parfum that opens with sparkling bergamot and dewy lily of the valley before blooming into a lush heart of gardenia and jasmine sambac. The creamy white musk base lingers on skin and fabric for up to 8 hours.",
        price: 12800, originalPrice: 15000,
        imageSrc: "images/product-perfume.png",
        category: "fragrance",
        ingredients: ["Bergamot","Gardenia Absolute","Jasmine Sambac","Lily of the Valley","White Musk","Vanilla"],
        howToUse: "Spray onto pulse points from 15cm distance. Do not rub — allow the fragrance to develop naturally on your skin.",
        size: "50ml", rating: 4.8, reviews: 198, stock: 18, isFeatured: true, isNew: true
      },

      // ── HAIRCARE ────────────────────────────────────────────────────────────
      {
        name: "Lumière Hair Growth Serum",
        description: "Clinically proven hair-density serum — reduces shedding in 4 weeks",
        longDescription: "A powerful, dermatologist-tested scalp serum that combines Redensyl (the next-generation hair growth molecule), biotin, and caffeine to visibly increase hair density and dramatically reduce shedding. Lightweight, non-greasy formula absorbs instantly into the scalp.",
        price: 9200, originalPrice: 11000,
        imageSrc: "images/product-hairserum.png",
        category: "haircare",
        ingredients: ["Redensyl (3%)","Biotin","Caffeine","Niacinamide","Saw Palmetto Extract","Zinc"],
        howToUse: "Apply directly to dry scalp in sections using the dropper. Massage gently for 2 minutes. Do not rinse. Use daily.",
        size: "60ml", rating: 4.8, reviews: 276, stock: 30, isFeatured: true, isNew: true
      },
      {
        name: "Velvet Argan Hair Mask",
        description: "24h moisture-lock mask — transforms dry, damaged hair to silk",
        longDescription: "An intensely nourishing deep-conditioning treatment enriched with pure Moroccan argan oil, keratin proteins, and a proprietary bond-repair complex. One single application transforms dry, frizzy, colour-damaged hair into silk-smooth, mirror-shiny strands that last wash after wash.",
        price: 5800, originalPrice: 7200,
        imageSrc: "images/product-hairserum.png",
        category: "haircare",
        ingredients: ["Argan Oil","Hydrolysed Keratin","Bond Repair Complex","Camellia Oil","Vitamin E","Shea Butter"],
        howToUse: "Apply generously to clean, towel-dried hair from mid-lengths to ends. Leave for 10-20 minutes, then rinse thoroughly.",
        size: "200ml", rating: 4.7, reviews: 143, stock: 25, isBestseller: true
      }
    ];
    await Product.insertMany(products);
    // Seed coupons
    await Coupon.insertMany([
      { code: 'WELCOME10', discountPercent: 10, minAmount: 3000, maxUses: 1000 },
      { code: 'LUXURY20', discountPercent: 20, minAmount: 10000, maxUses: 50 },
      { code: 'VIP15', discountPercent: 15, minAmount: 5000, maxUses: 200 },
      { code: 'HAIR20', discountPercent: 20, minAmount: 5000, maxUses: 100 }
    ]);
    res.json({ message: `Seeded ${products.length} products + 4 coupons!` });
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
    const token = jwt.sign({ id: user._id, name: user.name, isAdmin: user.isAdmin }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, isAdmin: user.isAdmin } });
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

// Update profile
app.put('/api/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const { name, mobile, alternatePhone, gender, dateOfBirth } = req.body;
    const user = await User.findByIdAndUpdate(decoded.id, { name, mobile, alternatePhone, gender, dateOfBirth }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add address
app.post('/api/auth/address', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = req.body;
    if (addr.isDefault || user.addresses.length === 0) {
      user.addresses.forEach(a => a.isDefault = false);
      addr.isDefault = true;
    }
    user.addresses.push(addr);
    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit address
app.put('/api/auth/address/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });
    Object.assign(addr, req.body);
    if (req.body.isDefault) user.addresses.forEach(a => { if (a._id.toString() !== req.params.id) a.isDefault = false; });
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete address
app.delete('/api/auth/address/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.addresses.pull(req.params.id);
    if (user.addresses.length && !user.addresses.some(a => a.isDefault)) user.addresses[0].isDefault = true;
    await user.save();
    res.json(user.addresses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Set default address
app.put('/api/auth/address/:id/default', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.addresses.forEach(a => a.isDefault = a._id.toString() === req.params.id);
    await user.save();
    res.json(user.addresses);
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

// ==================== RAZORPAY KEY (PUBLIC) ====================

app.get('/api/razorpay-key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || 'dummy_id' });
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

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try { res.json(await Order.find({}).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try { res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/contacts', adminAuth, async (req, res) => {
  try { res.json(await Contact.find({}).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/stats', adminAuth, async (req, res) => {
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
app.post('/api/admin/products', adminAuth, upload.single('image'), async (req, res) => {
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
app.put('/api/admin/products/:id', adminAuth, upload.single('image'), async (req, res) => {
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
app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
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
app.post('/api/admin/blogs', adminAuth, upload.single('coverImage'), async (req, res) => {
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
app.put('/api/admin/blogs/:id', adminAuth, upload.single('coverImage'), async (req, res) => {
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
app.delete('/api/admin/blogs/:id', adminAuth, async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Get all blogs (including unpublished)
app.get('/api/admin/blogs', adminAuth, async (req, res) => {
  try { res.json(await Blog.find({}).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== START ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
