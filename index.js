const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors())

app.get('/', (req, res) => {
    res.send("My Assignment 12 server is running...")
})

app.listen(port, () => {
    console.log(`This server is running on port ${port}`)
})