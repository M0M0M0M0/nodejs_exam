require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const multer   = require('multer');
const path     = require('path');
const Tree     = require('./models/Tree');

const app  = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Multer – store uploaded images in public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads')),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB – TreeShop'))
  .catch(err => console.error('MongoDB connection error:', err));

// ── Routes ────────────────────────────────────────────────────────────────────

// GET / – TreeShop: list all trees + add form
app.get('/', async (req, res) => {
  const trees  = await Tree.find().sort({ createdAt: -1 });
  const errors = req.query.errors ? JSON.parse(req.query.errors) : [];
  const old    = req.query.old    ? JSON.parse(req.query.old)    : {};
  res.render('index', { trees, errors, old });
});

// POST /add – Add a new tree
app.post('/add', upload.single('image'), async (req, res) => {
  const { treename, description } = req.body;
  const errors = [];

  if (!treename || !treename.trim())       errors.push('Tree Name is required.');
  if (!description || !description.trim()) errors.push('Description is required.');

  if (errors.length) {
    const old = { treename, description };
    return res.redirect(
      `/?errors=${encodeURIComponent(JSON.stringify(errors))}&old=${encodeURIComponent(JSON.stringify(old))}`
    );
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
  await Tree.create({ treename: treename.trim(), description: description.trim(), image: imagePath });
  res.redirect('/');
});

// POST /reset – Delete all trees
app.post('/reset', async (req, res) => {
  await Tree.deleteMany({});
  res.redirect('/');
});

// POST /delete/:id – Delete a single tree
app.post('/delete/:id', async (req, res) => {
  await Tree.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

// GET /edit/:id – Show edit form
app.get('/edit/:id', async (req, res) => {
  const tree   = await Tree.findById(req.params.id);
  const errors = req.query.errors ? JSON.parse(req.query.errors) : [];
  if (!tree) return res.redirect('/');
  res.render('edit', { tree, errors });
});

// POST /edit/:id – Update a tree
app.post('/edit/:id', upload.single('image'), async (req, res) => {
  const { treename, description } = req.body;
  const errors = [];

  if (!treename || !treename.trim())       errors.push('Tree Name is required.');
  if (!description || !description.trim()) errors.push('Description is required.');

  if (errors.length) {
    return res.redirect(
      `/edit/${req.params.id}?errors=${encodeURIComponent(JSON.stringify(errors))}`
    );
  }

  const update = { treename: treename.trim(), description: description.trim() };
  if (req.file) update.image = `/uploads/${req.file.filename}`;

  await Tree.findByIdAndUpdate(req.params.id, update);
  res.redirect('/');
});

// GET /about – About Me page
app.get('/about', (req, res) => {
  res.render('about');
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
