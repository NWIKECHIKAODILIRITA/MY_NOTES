const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

if (require.main === module) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;