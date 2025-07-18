
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = "https://api-m.sandbox.paypal.com";

//get the access token
async function generateAccessToken() {
  const response = await axios({
    url: `${BASE_URL}/v1/oauth2/token`,
    method: "post",
    auth: {
      username: process.env.PAYPAL_CLIENT_ID,
      password: process.env.PAYPAL_CLIENT_SECRET,
    },
    params: {
      grant_type: "client_credentials",
    },
  });
  return response.data.access_token;
}

// create an order
app.post("/api/orders", async (req, res) => {
  try {
    const token = await generateAccessToken();

    const order = await axios.post(
      `${BASE_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: "8.99",
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(201).json(order.data);
  } catch (err) {
    console.error("Error creating order", err.message);
    res.status(500).json({ error: "Error creating order" });
  }
});

// capture
app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const token = await generateAccessToken();

    const capture = await axios.post(
      `${BASE_URL}/v2/checkout/orders/${req.params.orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(capture.data);
  } catch (err) {
    console.error("Error capturing order", err.message);
    res.status(500).json({ error: "Error capturing order" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


// endpoint to refund an order
// will refund a captured order using the capture ID
app.post("/api/orders/:captureID/refund", async (req, res) => {
    try {
      const token = await generateAccessToken();
  
      const refund = await axios.post(
        `${BASE_URL}/v2/payments/captures/${req.params.captureID}/refund`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      res.status(200).json(refund.data);
    } catch (err) {
        console.error("Error refunding order", err.response?.data || err.message, err.stack);
        res.status(500).json({
          error: "Error refunding order",
          details: err.response?.data || err.message
        });
    }
});


// POST /api/generate-token
app.post("/api/generate-token", async (req, res) => {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  
    const response = await fetch("https://api-m.sandbox.paypal.com/v1/identity/generate-token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
  
    const data = await response.json();
    res.json(data);
});