const express = require('express');
const multer = require('multer');
const cors = require("cors");
const pool = require('./config/db');
const uuid = require("uuid").v4;
const fs = require("fs/promises")
require("dotenv").config()
const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const newFilename = `${uuid()}-${file.originalname}`;
    cb(null, newFilename);
  },
});

const upload = multer({ storage });


const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
  secure: true
});


app.use(cors());

app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
})

app.get("/images", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [results] = await conn.query("SELECT original_filename, url, createdAt FROM images");
    res.status(200).send(results);
  } catch (e) {
    console.log(e)
    res.status(500).send("Error retrieving images");
  } finally {
    conn.release();
  }
})

app.post("/upload", upload.single("img"), async (req, res) => {
  let conn;
  try {
    const { path } = req.file;
    const uploaded = await cloudinary.uploader.upload(path, {
      folder: "images",
    })
    await fs.rm(path)

    conn = await pool.getConnection();
    const [results] = await conn.query("INSERT INTO images (uuid, public_id, url, original_filename, file_path, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [uuid(), uploaded.public_id, uploaded.secure_url, uploaded.original_filename, path, uploaded.created_at]);

    res.status(200).send({
      message: "Upload Successful!",
      url: uploaded.secure_url,
    });

  } catch (e) {
    console.log(e)
    res.status(500).send("Error uploading file");
  } finally {
    conn.release();
  }
})

app.listen(3000, () => {
  console.log('Server is listening on http://localhost:3000');
})