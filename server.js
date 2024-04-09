const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();
const PORT = 8000 || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://elanine:epitight@cluster0.aziyjhk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

const Coupon = mongoose.model("Coupon", {
  couponCode: String,
  link: String,
  qrCodeImage: String,
  generatedAt: { type: Date },
});

const path = require("path");
app.get("/", (req, res) => {
  app.use(express.static(path.resolve(__dirname, "frontend")));
  res.sendFile(path.resolve(__dirname, "frontend", "index.html"));
});

app.get("/api/coupons/count", async (req, res) => {
  try {
    const count = await Coupon.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const { date } = req.query;
    let coupons;
    if (date) {
      const startDate = new Date(date); // Start of the selected date
      const endDate = new Date(new Date(date).setHours(23, 59, 59)); // End of the selected date
      coupons = await Coupon.find({
        generatedAt: { $gte: startDate, $lte: endDate }        
      });
    } else {
      coupons = await Coupon.find();
    }
    res.json(coupons);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const sharp = require("sharp");

app.post("/api/coupons", async (req, res) => {
  try {
    const { couponCode, link, generatedAt } = req.body;

    // Generate QR code with a higher error correction level
    const qrCodeBuffer = await QRCode.toBuffer(link, {
      errorCorrectionLevel: "Q",
    });

    // Resize the QR code image using sharp
    const resizedQrCodeBuffer = await sharp(qrCodeBuffer)
      .resize(200, 200)
      .toBuffer();

    // Convert the resized buffer to a Base64-encoded string
    const qrCodeBase64 = resizedQrCodeBuffer.toString("base64");

    const newCoupon = new Coupon({
      couponCode,
      link,
      qrCodeImage: qrCodeBase64,
      generatedAt: generatedAt,
    });
    await newCoupon.save();
    res.json(newCoupon);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/api/coupons/batch", async (req, res) => {
  try {
    const couponsData = req.body;
    const generatedCoupons = await Promise.all(
      couponsData.map(async (couponData) => {
        const { couponCode, link, generatedAt } = couponData;

        // Generate QR code with a higher error correction level
        const qrCodeBuffer = await QRCode.toBuffer(link, {
          errorCorrectionLevel: "Q",
        });

        // Resize the QR code image using sharp
        const resizedQrCodeBuffer = await sharp(qrCodeBuffer)
          .resize(200, 200)
          .toBuffer();

        // Convert the resized buffer to a Base64-encoded string
        const qrCodeBase64 = resizedQrCodeBuffer.toString("base64");

        const newCoupon = new Coupon({
          couponCode,
          link,
          qrCodeImage: qrCodeBase64,
          generatedAt,
        });
        await newCoupon.save();
        return newCoupon;
      })
    );

    res.json(generatedCoupons);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.delete("/api/coupons", async (req, res) => {
  try {
    await Coupon.deleteMany({});
    res.status(204).end();
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/coupons/search', async (req, res) => {
  try {
    const { couponCode } = req.query;
    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code parameter is required' });
    }
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon code not found' });
    }
    res.json(coupon);
  } catch (error) {
    console.error('Error searching for coupon code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
