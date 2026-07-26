const express = require('express');
const path = require('path');
const app = express();

const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 9000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`KSP Frontend serving on port ${port}`);
});