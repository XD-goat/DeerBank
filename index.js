// Import required packages
const express = require("express");
const https = require("https");
const Database = require("@replit/database");
const db = new Database();
const nodemailer = require("nodemailer");
const { simulateShapeFromPrompt } = require("./src/simulator");

// === CHAT STORAGE ===
let chatMessages = [];

// === KEEP-ALIVE SERVER ===
function keepAlive() {
  const app = express();

  app.get("/", (req, res) => {
    res.send("I'm alive!");
  });

  app.get("/ping", (req, res) => {
    res.json({ status: "pong", timestamp: new Date().toISOString() });
  });

  app.listen(8080, () => {
    console.log("Keep-alive server running on port 8080");
  });
}

// Start the keep-alive server
keepAlive();

// === PING BANK APP TO KEEP IT ALIVE ===
setInterval(() => {
  https.get("https://acc1a0a3-dde3-462d-8797-86613de3344a-00-1yvppdcu26jpj.worf.replit.dev/");
}, 5 * 60 * 1000); // every 5 minutes

// === BANK APP CODE ===
const bankApp = express();

bankApp.use(express.static('public'));

const basePrices = {
  "TECH": 280,
  "APPL": 175,
  "MSFT": 420,
  "NVDA": 895,
  "AMZN": 195,
  "BANK": 145,
  "JPM": 220,
  "GS": 410,
  "WFC": 65,
  "ENERGY": 185,
  "XOM": 110,
  "CVX": 165,
  "MPC": 95,
  "RETAIL": 85,
  "WMT": 75,
  "TGT": 65,
  "COST": 925,
  "PHARMA": 320,
  "JNJ": 155,
  "PFE": 28,
  "MRNA": 165,
  "AUTO": 145,
  "TSLA": 310,
  "F": 12,
  "GM": 42,
  "TELECOM": 95,
  "T": 18,
  "VZ": 42,
  "CMCSA": 38,
  "FINANCE": 285,
  "BLK": 920,
  "BX": 145,
  "KKR": 125,
  "CRYPTO": 58,
  "GAMES": 42,
  "MEME": 15
};

let priceHistory = {};
let trendState = {}; // Track trending direction per stock
let volatilityProfiles = {}; // Define volatility for each stock

Object.keys(basePrices).forEach(ticker => {
  priceHistory[ticker] = [];
  trendState[ticker] = { direction: 0, strength: 0 };
  // Assign random volatility profiles (low, medium, high)
  const vol = Math.random();
  volatilityProfiles[ticker] = vol < 0.33 ? 'low' : vol < 0.66 ? 'medium' : 'high';
});

function getStockPrices() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const seconds = now.getSeconds();
  const currentPrices = {};
  
  for (const ticker in basePrices) {
    try {
      const basePrice = basePrices[ticker];
      if (!basePrice) continue;
      
      // Safe hash calculation
      const char0 = ticker.charCodeAt(0) || 0;
      const char1 = ticker.charCodeAt(1) || 1;
      const hash = char0 * char1;
      
      // Initialize if needed
      if (!trendState[ticker]) {
        trendState[ticker] = { direction: 0, strength: 0 };
      }
      if (!volatilityProfiles[ticker]) {
        volatilityProfiles[ticker] = Math.random() < 0.33 ? 'low' : Math.random() < 0.66 ? 'medium' : 'high';
      }
      
      // Volatility based on profile
      const profile = volatilityProfiles[ticker];
      const volMultiplier = profile === 'low' ? 0.02 : profile === 'medium' ? 0.08 : 0.15;
      
      // Random events (5% chance each minute)
      if (Math.random() < 0.05) {
        trendState[ticker].direction = (Math.random() - 0.5) * 2;
        trendState[ticker].strength = Math.random() * 0.3;
      }
      
      // Decay trend
      trendState[ticker].strength = (trendState[ticker].strength || 0) * 0.95;
      
      // Multi-layer price movement
      const sineWave = Math.sin(minutes / 40 + hash) * 0.12;
      const cosineWave = Math.cos(seconds / 30 + hash) * 0.08;
      const randomShock = (Math.random() - 0.5) * volMultiplier * 2;
      const trend = (trendState[ticker].direction || 0) * (trendState[ticker].strength || 0);
      
      const volatility = sineWave + cosineWave + randomShock + trend;
      const variation = 1 + volatility;
      let currentPrice = basePrice * variation;
      
      // Apply realistic limits
      currentPrice = Math.max(basePrice * 0.4, Math.min(basePrice * 2.5, currentPrice));
      
      currentPrices[ticker] = Math.round(currentPrice * 100) / 100;
      
      if (!priceHistory[ticker]) priceHistory[ticker] = [];
      priceHistory[ticker].push({ price: currentPrices[ticker], time: new Date().toLocaleTimeString() });
      if (priceHistory[ticker].length > 100) priceHistory[ticker].shift();
    } catch (e) {
      console.error(`Error calculating price for ${ticker}:`, e.message);
      currentPrices[ticker] = basePrices[ticker];
    }
  }
  
  return currentPrices;
}

async function sendNewUserEmail(username) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.YOUR_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.YOUR_EMAIL,
      to: process.env.YOUR_EMAIL,
      subject: `🦌 New DeerBank User: ${username}`,
      html: `<p>A new user has joined DeerBank!</p><p><strong>Username:</strong> ${username}</p><p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`
    });

    console.log(`Email sent for new user: ${username}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
}

async function getUserByName(username) {
  if (!username) return null;
  const lower = username.toLowerCase();
  let data = await db.get(lower);
  if (data) return { data, key: lower };
  const keys = await db.list();
  for (const k of keys) {
    if (k.toLowerCase() === lower) {
      data = await db.get(k);
      return { data, key: k };
    }
  }
  return { data: null, key: null };
}

let lunchTableSeats = {
  1: { owner: null, price: 500 },
  2: { owner: null, price: 500 },
  3: { owner: null, price: 500 },
  4: { owner: null, price: 500 },
  5: { owner: null, price: 500 },
  6: { owner: null, price: 500 },
  7: { owner: null, price: 500 },
  8: { owner: null, price: 500 },
  9: { owner: null, price: 500 },
  10: { owner: null, price: 500 },
  11: { owner: null, price: 500 },
  12: { owner: null, price: 500 }
};

bankApp.get("/create/:user/:pass", async (req, res) => {
  const username = req.params.user.toLowerCase().toLowerCase();
  const timestamp = new Date().toISOString();
  await db.set(username, { 
    password: req.params.pass, 
    balance: 0,
    savings: 0,
    lastInterestApplied: timestamp,
    loans: [],
    pendingLoans: [],
    payday: null,
    payeverified: false,
    auctions: [],
    stocks: {},
    lunchTableSeats: [],
    recoveryPin: null,
    transactions: [{
      type: "Account Created",
      amount: 0,
      balance: 0,
      timestamp: timestamp
    }]
  });
  
  sendNewUserEmail(username);
  
  res.send("Account created");
});

function applyWeeklyInterest(data) {
  if (!data.savings) data.savings = 0;
  if (!data.lastInterestApplied) data.lastInterestApplied = new Date().toISOString();
  
  const lastInterest = new Date(data.lastInterestApplied);
  const now = new Date();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  
  if (now - lastInterest >= weekInMs) {
    const interest = data.savings * 0.01;
    data.savings += interest;
    data.lastInterestApplied = now.toISOString();
    return { applied: true, interest: interest };
  }
  return { applied: false, interest: 0 };
}

bankApp.get("/savings/:user/:pass", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const interestInfo = applyWeeklyInterest(data);
  await db.set(key, data);
  
  res.json({
    savings: data.savings,
    interestThisWeek: interestInfo.interest,
    lastInterestApplied: data.lastInterestApplied
  });
});

bankApp.get("/savings-deposit/:user/:pass/:amount", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const amount = parseFloat(req.params.amount);
  if (amount <= 0) {
    res.send("Invalid amount");
    return;
  }
  if (data.balance < amount) {
    res.send("Insufficient balance");
    return;
  }
  
  data.balance -= amount;
  if (!data.savings) data.savings = 0;
  data.savings += amount;
  
  await db.set(key, data);
  res.send(`Deposited $${amount.toFixed(2)} to savings. New balance: $${data.balance.toFixed(2)}, Savings: $${data.savings.toFixed(2)}`);
});

bankApp.get("/savings-withdraw/:user/:pass/:amount", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const amount = parseFloat(req.params.amount);
  if (amount <= 0) {
    res.send("Invalid amount");
    return;
  }
  if (!data.savings || data.savings < amount) {
    res.send("Insufficient savings");
    return;
  }
  
  data.savings -= amount;
  data.balance += amount;
  
  await db.set(key, data);
  res.send(`Withdrew $${amount.toFixed(2)} from savings. New balance: $${data.balance.toFixed(2)}, Savings: $${data.savings.toFixed(2)}`);
});

bankApp.get("/lunch-table-seats", async (req, res) => {
  const seats = {};
  for (let i = 1; i <= 12; i++) {
    seats[i] = lunchTableSeats[i];
  }
  res.json(seats);
});

bankApp.get("/buy-lunch-seat/:user/:pass/:seatNumber/:askingPrice", async (req, res) => {
  const user = req.params.user.toLowerCase();
  const seatNumber = parseInt(req.params.seatNumber);
  const askingPrice = parseFloat(req.params.askingPrice);

  if (seatNumber < 1 || seatNumber > 12) {
    res.send("Invalid seat number");
    return;
  }

  const data = await db.get(user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }

  const seat = lunchTableSeats[seatNumber];
  if (!seat.owner) {
    if (data.balance < 500) {
      res.send("Insufficient balance to buy seat (costs $500)");
      return;
    }
    seat.owner = user;
    seat.price = 500;
    data.balance -= 500;
    if (!data.lunchTableSeats) data.lunchTableSeats = [];
    data.lunchTableSeats.push(seatNumber);
    await db.set(user, data);
    res.send(`Purchased seat ${seatNumber} for $500`);
  } else if (seat.owner === user) {
    res.send("You already own this seat");
  } else {
    if (data.balance < askingPrice) {
      res.send(`Insufficient balance to buy seat for $${askingPrice}`);
      return;
    }
    const currentOwner = await db.get(seat.owner);
    currentOwner.balance += askingPrice;
    data.balance -= askingPrice;
    data.lunchTableSeats.push(seatNumber);
    currentOwner.lunchTableSeats = currentOwner.lunchTableSeats.filter(s => s !== seatNumber);
    seat.owner = user;
    seat.price = askingPrice;
    await db.set(user, data);
    await db.set(seat.owner === user ? user : seat.owner, currentOwner);
    res.send(`Purchased seat ${seatNumber} from ${seat.owner} for $${askingPrice}`);
  }
});

bankApp.get("/sell-lunch-seat/:user/:pass/:seatNumber/:price", async (req, res) => {
  const user = req.params.user.toLowerCase();
  const seatNumber = parseInt(req.params.seatNumber);
  const price = parseFloat(req.params.price);

  if (seatNumber < 1 || seatNumber > 12) {
    res.send("Invalid seat number");
    return;
  }

  const data = await db.get(user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }

  const seat = lunchTableSeats[seatNumber];
  if (seat.owner !== user) {
    res.send("You don't own this seat");
    return;
  }

  seat.price = price;
  await db.set(user, data);
  res.send(`Seat ${seatNumber} is now for sale at $${price}`);
});

bankApp.get("/ping", (req, res) => {
  res.json({ status: "pong", timestamp: new Date().toISOString() });
});

bankApp.get("/stock-prices", async (req, res) => {
  const prices = getStockPrices();
  res.json(prices);
});

bankApp.get("/stock-history/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  if (!priceHistory[ticker] || priceHistory[ticker].length === 0) {
    res.json([]);
    return;
  }
  res.json(priceHistory[ticker]);
});

bankApp.get("/buy-stock/:user/:pass/:ticker/:shares", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const ticker = req.params.ticker.toUpperCase();
  const shares = parseInt(req.params.shares);
  const prices = getStockPrices();
  
  if (!prices[ticker]) {
    res.send("Stock ticker not found");
    return;
  }
  if (shares <= 0) {
    res.send("Shares must be greater than 0");
    return;
  }
  
  const cost = prices[ticker] * shares;
  if (data.balance < cost) {
    res.send("Insufficient balance");
    return;
  }
  
  data.balance -= cost;
  if (!data.stocks) data.stocks = {};
  data.stocks[ticker] = (data.stocks[ticker] || 0) + shares;
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Stock Purchase",
    ticker: ticker,
    shares: shares,
    pricePerShare: prices[ticker],
    totalCost: cost,
    balance: data.balance,
    timestamp: new Date().toISOString()
  });
  
  await db.set(key, data);
  res.send(`Bought ${shares} shares of ${ticker} for $${cost}. New balance: $${data.balance}`);
});

bankApp.get("/sell-stock/:user/:pass/:ticker/:shares", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const ticker = req.params.ticker.toUpperCase();
  const shares = parseInt(req.params.shares);
  const prices = getStockPrices();
  
  if (!prices[ticker]) {
    res.send("Stock ticker not found");
    return;
  }
  if (shares <= 0) {
    res.send("Shares must be greater than 0");
    return;
  }
  if (!data.stocks || !data.stocks[ticker] || data.stocks[ticker] < shares) {
    res.send("Insufficient shares to sell");
    return;
  }
  
  const proceeds = prices[ticker] * shares;
  data.balance += proceeds;
  data.stocks[ticker] -= shares;
  if (data.stocks[ticker] === 0) {
    delete data.stocks[ticker];
  }
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Stock Sale",
    ticker: ticker,
    shares: shares,
    pricePerShare: prices[ticker],
    totalProceeds: proceeds,
    balance: data.balance,
    timestamp: new Date().toISOString()
  });
  
  await db.set(key, data);
  res.send(`Sold ${shares} shares of ${ticker} for $${proceeds}. New balance: $${data.balance}`);
});

bankApp.get("/my-stocks/:user/:pass", async (req, res) => {
  const { data } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const prices = getStockPrices();
  const portfolio = {};
  let totalValue = 0;
  if (data.stocks) {
    for (const [ticker, shares] of Object.entries(data.stocks)) {
      const value = shares * prices[ticker];
      portfolio[ticker] = {
        shares: shares,
        pricePerShare: prices[ticker],
        value: value
      };
      totalValue += value;
    }
  }
  
  res.json({
    portfolio: portfolio,
    totalValue: totalValue,
    cash: data.balance
  });
});

bankApp.get("/set-recovery-pin/:user/:pass/:pin", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  const pin = req.params.pin;
  if (pin.length < 4 || pin.length > 8 || isNaN(pin)) {
    res.send("PIN must be 4-8 digits");
    return;
  }
  
  data.recoveryPin = pin;
  await db.set(key, data);
  res.send("Recovery PIN set successfully");
});

bankApp.get("/recover-password/:user/:pin/:newpass", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  const pin = req.params.pin;
  const newpass = req.params.newpass;
  
  if (!data) {
    res.status(404).send("Account not found");
    return;
  }
  if (!data.recoveryPin) {
    res.status(400).send("No recovery PIN set for this account. Please set one in the Recovery tab first.");
    return;
  }
  if (data.recoveryPin !== pin) {
    res.status(403).send("Recovery PIN incorrect");
    return;
  }
  
  data.password = newpass;
  await db.set(key, data);
  res.send("Password reset successfully");
});

bankApp.get("/auction-list", async (req, res) => {
  const keys = await db.list();
  const auctions = [];
  for (const k of keys) {
    const account = await db.get(k);
    if (account.auctions) {
      account.auctions.forEach(auction => {
        let endTime = auction.endTime;
        if (!endTime) {
          endTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
          auction.endTime = endTime;
        }
        auctions.push({
          id: auction.id,
          seller: k,
          name: auction.name,
          description: auction.description,
          startingBid: auction.startingBid,
          currentBid: auction.currentBid,
          highestBidder: auction.highestBidder,
          createdAt: auction.createdAt,
          endTime: endTime
        });
      });
      await db.set(k, account);
    }
  }
  res.json(auctions);
});

bankApp.get("/my-auctions/:user/:pass", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.status(403).send("Access denied");
    return;
  }
  res.json(data.auctions || []);
});

bankApp.get("/create-auction/:user/:pass/:name/:startbid/:description/:days", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  
  const startBid = parseFloat(req.params.startbid);
  if (startBid <= 0) {
    res.send("Starting bid must be greater than 0");
    return;
  }
  
  let durationDays = parseInt(req.params.days);
  if (!durationDays || durationDays <= 0) {
    durationDays = 1;
  }
  if (durationDays > 30) {
    durationDays = 30;
  }
  
  if (!data.auctions) data.auctions = [];
  
  const auctionId = Date.now().toString();
  const endTime = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const auction = {
    id: auctionId,
    name: decodeURIComponent(req.params.name),
    description: decodeURIComponent(req.params.description),
    startingBid: startBid,
    currentBid: startBid,
    highestBidder: null,
    createdAt: new Date().toISOString(),
    endTime: endTime,
    isActive: true,
    bidHistory: []
  };
  
  data.auctions.push(auction);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Auction Created",
    amount: 0,
    balance: data.balance,
    reason: `"${auction.name}" starting at $${startBid}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(key, data);
  res.send(`Auction "${auction.name}" created with starting bid $${startBid}`);
});

bankApp.get("/place-bid/:bidder/:bidpass/:seller/:auctionid/:amount", async (req, res) => {
  const bidderResult = await getUserByName(req.params.bidder);
  const bidder = bidderResult.data;
  const bidderKey = bidderResult.key;
  if (!bidder) {
    res.send("Bidder account not found");
    return;
  }
  if (bidder.password !== req.params.bidpass) {
    res.send("Authentication failed");
    return;
  }
  
  const sellerResult = await getUserByName(req.params.seller);
  const seller = sellerResult.data;
  const sellerKey = sellerResult.key;
  if (!seller) {
    res.send("Seller account not found");
    return;
  }
  
  if (!seller.auctions) seller.auctions = [];
  
  const auction = seller.auctions.find(a => a.id === req.params.auctionid);
  if (!auction) {
    res.send("Auction not found");
    return;
  }
  
  if (!auction.isActive || new Date(auction.endTime) <= new Date()) {
    res.send("Auction has ended");
    return;
  }
  
  const bidAmount = parseFloat(req.params.amount);
  const minBid = auction.currentBid || auction.startingBid;
  
  if (bidAmount <= minBid) {
    res.send(`Bid must be higher than $${minBid}`);
    return;
  }
  
  // If there's a previous bidder, refund them
  if (auction.highestBidder && auction.highestBidder !== req.params.bidder) {
    const previousBidder = await db.get(auction.highestBidder);
    if (previousBidder) {
      previousBidder.balance += auction.currentBid;
      if (!previousBidder.transactions) previousBidder.transactions = [];
      previousBidder.transactions.push({
        type: "Auction Bid Outbid",
        amount: auction.currentBid,
        balance: previousBidder.balance,
        reason: `Outbid on "${auction.name}" - bid refunded`,
        timestamp: new Date().toISOString()
      });
      await db.set(auction.highestBidder, previousBidder);
    }
  }
  
  // Hold new bid amount
  if (bidder.balance < bidAmount) {
    res.send("Insufficient funds");
    return;
  }
  
  bidder.balance -= bidAmount;
  auction.currentBid = bidAmount;
  auction.highestBidder = req.params.bidder;
  
  if (!auction.bidHistory) auction.bidHistory = [];
  auction.bidHistory.push({ bidder: req.params.bidder, amount: bidAmount, timestamp: new Date().toISOString() });
  
  if (!bidder.transactions) bidder.transactions = [];
  bidder.transactions.push({
    type: "Auction Bid Placed",
    amount: bidAmount,
    balance: bidder.balance,
    reason: `Bid on "${auction.name}" for $${bidAmount}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(bidderKey, bidder);
  await db.set(sellerKey, seller);
  
  res.send(`Bid placed for $${bidAmount}! Current highest bid.`);
});

bankApp.get("/remove-bid/:bidder/:bidpass/:seller/:auctionid", async (req, res) => {
  const bidderResult = await getUserByName(req.params.bidder);
  const bidder = bidderResult.data;
  const bidderKey = bidderResult.key;
  if (!bidder) {
    res.send("Bidder account not found");
    return;
  }
  if (bidder.password !== req.params.bidpass) {
    res.send("Authentication failed");
    return;
  }
  
  const sellerResult = await getUserByName(req.params.seller);
  const seller = sellerResult.data;
  const sellerKey = sellerResult.key;
  if (!seller) {
    res.send("Seller account not found");
    return;
  }
  
  if (!seller.auctions) seller.auctions = [];
  
  const auction = seller.auctions.find(a => a.id === req.params.auctionid);
  if (!auction) {
    res.send("Auction not found");
    return;
  }
  
  if (auction.highestBidder !== req.params.bidder) {
    res.send("You are not the highest bidder");
    return;
  }
  
  const bidAmount = auction.currentBid;
  bidder.balance += bidAmount;
  
  if (!bidder.transactions) bidder.transactions = [];
  bidder.transactions.push({
    type: "Auction Bid Removed",
    amount: bidAmount,
    balance: bidder.balance,
    reason: `Bid on "${auction.name}" removed - bid refunded`,
    timestamp: new Date().toISOString()
  });
  
  if (auction.bidHistory && auction.bidHistory.length > 1) {
    auction.bidHistory.pop();
    const previousBid = auction.bidHistory[auction.bidHistory.length - 1];
    auction.currentBid = previousBid.amount;
    auction.highestBidder = previousBid.bidder;
  } else {
    auction.currentBid = auction.startingBid;
    auction.highestBidder = null;
  }
  
  await db.set(bidderKey, bidder);
  await db.set(sellerKey, seller);
  
  res.send(`Your bid has been removed and $${bidAmount} refunded.`);
});

bankApp.get("/complete-auction/:seller/:pass/:auctionid", async (req, res) => {
  const { data: seller, key: sellerKey } = await getUserByName(req.params.seller);
  if (!seller) {
    res.send("Account not found");
    return;
  }
  if (seller.password !== req.params.pass) {
    res.status(403).send("Authentication failed");
    return;
  }
  
  if (!seller.auctions) seller.auctions = [];
  
  const auction = seller.auctions.find(a => a.id === req.params.auctionid);
  if (!auction) {
    res.send("Auction not found");
    return;
  }
  
  if (!auction.isActive) {
    res.send("Auction already completed");
    return;
  }
  
  if (new Date(auction.endTime) > new Date()) {
    res.send("Auction time has not expired yet");
    return;
  }
  
  auction.isActive = false;
  
  if (auction.highestBidder) {
    const buyerResult = await getUserByName(auction.highestBidder);
    const buyer = buyerResult.data;
    const buyerKey = buyerResult.key;
    seller.balance += auction.currentBid;
    
    if (!seller.transactions) seller.transactions = [];
    seller.transactions.push({
      type: "Auction Completed",
      amount: auction.currentBid,
      balance: seller.balance,
      reason: `Sold "${auction.name}" to ${auction.highestBidder} for $${auction.currentBid}`,
      timestamp: new Date().toISOString()
    });
    
    if (!buyer.transactions) buyer.transactions = [];
    buyer.transactions.push({
      type: "Auction Won",
      amount: auction.currentBid,
      balance: buyer.balance,
      reason: `Won "${auction.name}" for $${auction.currentBid}`,
      timestamp: new Date().toISOString()
    });
    
    await db.set(buyerKey, buyer);
  }
  
  await db.set(sellerKey, seller);
  res.send(`Auction completed! Winner: ${auction.highestBidder || 'None'}`);
});

bankApp.get("/update-auction-time/:name/:days", async (req, res) => {
  const targetName = decodeURIComponent(req.params.name).toLowerCase();
  const days = parseInt(req.params.days);
  
  if (days < 1 || days > 30) {
    res.send("Days must be 1-30");
    return;
  }
  
  try {
    const allKeys = await db.list();
    for (const key of allKeys) {
      const data = await db.get(key);
      if (data && data.auctions && Array.isArray(data.auctions)) {
        for (let i = 0; i < data.auctions.length; i++) {
          if (data.auctions[i].name.toLowerCase() === targetName) {
            const newEndTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            data.auctions[i].endTime = newEndTime;
            await db.set(key, data);
            res.send(`✅ Updated "${data.auctions[i].name}" to ${days} days`);
            return;
          }
        }
      }
    }
    res.send(`❌ Auction not found: ${req.params.name}`);
  } catch (error) {
    res.send(`Error: ${error.message}`);
  }
});

bankApp.get("/remove-auction/:user/:pass/:auctionid", async (req, res) => {
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  
  if (!data.auctions) data.auctions = [];
  
  const auction = data.auctions.find(a => a.id === req.params.auctionid);
  if (!auction) {
    res.send("Auction not found");
    return;
  }
  
  // Refund highest bidder if exists
  if (auction.highestBidder) {
    const bidderResult = await getUserByName(auction.highestBidder);
    const bidder = bidderResult.data;
    const bidderKey = bidderResult.key;
    if (bidder) {
      bidder.balance += auction.currentBid;
      if (!bidder.transactions) bidder.transactions = [];
      bidder.transactions.push({
        type: "Auction Cancelled",
        amount: auction.currentBid,
        balance: bidder.balance,
        reason: `Auction for "${auction.name}" cancelled - bid refunded`,
        timestamp: new Date().toISOString()
      });
      await db.set(auction.highestBidder, bidder);
    }
  }
  
  data.auctions = data.auctions.filter(a => a.id !== req.params.auctionid);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Auction Removed",
    amount: 0,
    balance: data.balance,
    reason: `Removed auction for "${auction.name}"`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Auction "${auction.name}" removed`);
});

bankApp.get("/login/:user/:pass", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (data && data.password === req.params.pass) {
    res.send("Balance: " + data.balance);
  } else {
    res.send("Login failed");
  }
});

bankApp.get("/account/:user/:pass", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (data && data.password === req.params.pass) {
    // Clean up transactions older than 2 weeks
    if (data.transactions) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      data.transactions = data.transactions.filter(t => new Date(t.timestamp) > twoWeeksAgo);
      await db.set(req.params.user.toLowerCase(), data);
    }
    
    res.json({
      username: req.params.user.toLowerCase(),
      balance: data.balance,
      loans: data.loans || [],
      pendingLoans: data.pendingLoans || [],
      payday: data.payday,
      payverified: data.payverified || false,
      transactions: data.transactions || [],
      isModerator: data.isModerator || false
    });
  } else {
    res.status(403).send("Access denied");
  }
});

bankApp.get("/deposit/:user/:pass/:amount/:reason", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("No account found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  const amount = parseInt(req.params.amount);
  
  if (!data.pendingDeposits) data.pendingDeposits = [];
  
  const depositId = Date.now().toString();
  const depositRequest = {
    id: depositId,
    amount: amount,
    reason: decodeURIComponent(req.params.reason),
    status: "pending",
    requestedAt: new Date().toISOString()
  };
  
  data.pendingDeposits.push(depositRequest);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Deposit Requested",
    amount: amount,
    balance: data.balance,
    reason: `${decodeURIComponent(req.params.reason)} - Waiting for 2 moderator approvals`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Deposit request submitted for approval! Amount: $${amount}. Waiting for moderator to approve.`);
});

bankApp.get("/approve-deposit/:modpass/:user/:depositid", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (!data.pendingDeposits) data.pendingDeposits = [];
  
  const depositReq = data.pendingDeposits.find(d => d.id === req.params.depositid);
  if (!depositReq) {
    res.send("Deposit request not found");
    return;
  }
  
  if (!depositReq.approvals) depositReq.approvals = [];
  if (!depositReq.approvals.includes(req.params.modpass)) {
    depositReq.approvals.push(req.params.modpass);
  }
  
  if (depositReq.approvals.length < 1) {
    await db.set(req.params.user.toLowerCase(), data);
    res.send(`Deposit approved by moderator. Processing now.`);
    return;
  }
  
  data.balance += depositReq.amount;
  data.pendingDeposits = data.pendingDeposits.filter(d => d.id !== req.params.depositid);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Deposit Approved",
    amount: depositReq.amount,
    balance: data.balance,
    reason: `${depositReq.reason} - Approved by moderator`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Deposit approved! $${depositReq.amount} added to ${req.params.user.toLowerCase()}'s balance. (Moderator approved)`);
});

bankApp.get("/deny-deposit/:modpass/:user/:depositid", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (!data.pendingDeposits) data.pendingDeposits = [];
  
  const depositReq = data.pendingDeposits.find(d => d.id === req.params.depositid);
  if (!depositReq) {
    res.send("Deposit request not found");
    return;
  }
  
  data.pendingDeposits = data.pendingDeposits.filter(d => d.id !== req.params.depositid);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Deposit Denied",
    amount: depositReq.amount,
    balance: data.balance,
    reason: `${depositReq.reason} - Denied by moderator`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Deposit request denied for ${req.params.user.toLowerCase()}`);
});

bankApp.get("/withdraw/:user/:pass/:amount/:reason", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("No account found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  const amount = parseInt(req.params.amount);
  if (data.balance - amount < 0) {
    res.send("Insufficient funds");
    return;
  }
  data.balance -= amount;
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Withdrawal",
    amount: amount,
    balance: data.balance,
    reason: decodeURIComponent(req.params.reason),
    timestamp: new Date().toISOString()
  });
  await db.set(req.params.user.toLowerCase(), data);
  res.send("Withdrawal successful. Balance: " + data.balance);
});

bankApp.get("/transfer/:from/:pass/:to/:amount/:reason", async (req, res) => {
  const fromLower = req.params.from.toLowerCase();
  const toLower = req.params.to.toLowerCase();
  let fromData = await db.get(fromLower);
  let toData = await db.get(toLower);
  
  if (!fromData || !toData) {
    const keys = await db.list();
    for (const key of keys) {
      if (key.toLowerCase() === fromLower) fromData = await db.get(key);
      if (key.toLowerCase() === toLower) toData = await db.get(key);
    }
  }
  
  if (!fromData) {
    res.send("Sender account not found");
    return;
  }
  if (fromData.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  if (!toData) {
    res.send("Recipient account not found");
    return;
  }
  
  const amount = parseInt(req.params.amount);
  if (fromData.balance - amount < 0) {
    res.send("Insufficient funds");
    return;
  }
  
  const reason = decodeURIComponent(req.params.reason);
  fromData.balance -= amount;
  toData.balance += amount;
  
  if (!fromData.transactions) fromData.transactions = [];
  if (!toData.transactions) toData.transactions = [];
  
  fromData.transactions.push({
    type: "Transfer Out",
    amount: amount,
    balance: fromData.balance,
    reason: `To ${toLower}: ${reason}`,
    timestamp: new Date().toISOString()
  });
  
  toData.transactions.push({
    type: "Transfer In",
    amount: amount,
    balance: toData.balance,
    reason: `From ${fromLower}: ${reason}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(fromLower, fromData);
  await db.set(toLower, toData);
  
  res.send("Transfer successful. New balance: " + fromData.balance);
});

bankApp.get("/list-users", async (req, res) => {
  const keys = await db.list();
  res.json(keys);
});

bankApp.get("/list/:modpass", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const keys = await db.list();
  const accounts = {};
  for (const k of keys) {
    const account = await db.get(k);
    if (account && account.password) {
      accounts[k.toLowerCase()] = account;
    }
  }
  res.json(accounts);
});

bankApp.get("/reset-password/:modpass/:user/:newpass", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (data) {
    const oldPass = data.password;
    data.password = req.params.newpass;
    if (!data.transactions) data.transactions = [];
    data.transactions.push({
      type: "Password Reset",
      amount: 0,
      balance: data.balance,
      timestamp: new Date().toISOString()
    });
    await db.set(req.params.user.toLowerCase(), data);
    res.send("Password reset successful");
  } else {
    res.send("No account found");
  }
});

bankApp.get("/change-password/:user/:oldpass/:newpass", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.oldpass) {
    res.send("Current password is incorrect");
    return;
  }
  data.password = req.params.newpass;
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Password Changed",
    amount: 0,
    balance: data.balance,
    timestamp: new Date().toISOString()
  });
  await db.set(req.params.user.toLowerCase(), data);
  res.send("Password changed successfully");
});

bankApp.get("/delete-account/:modpass/:user", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  await db.delete(req.params.user.toLowerCase());
  res.send("Account deleted successfully");
});

bankApp.get("/grant-money/:modpass/:user/:amount/:reason", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  const amount = parseInt(req.params.amount);
  if (amount <= 0) {
    res.send("Amount must be greater than 0");
    return;
  }
  
  data.balance += amount;
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Money Granted by Moderator",
    amount: amount,
    balance: data.balance,
    reason: decodeURIComponent(req.params.reason),
    timestamp: new Date().toISOString()
  });
  
  await db.set(key, data);
  res.send(`✅ Granted $${amount} to ${req.params.user}. New balance: $${data.balance}`);
});

bankApp.get("/moderator-remove/:modpass/:user/:amount/:reason", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const { data, key } = await getUserByName(req.params.user);
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  const amount = parseInt(req.params.amount);
  if (amount <= 0) {
    res.send("Amount must be greater than 0");
    return;
  }
  
  if (data.balance - amount < 0) {
    res.send("Insufficient funds to remove");
    return;
  }
  
  data.balance -= amount;
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Removed by Moderator",
    amount: amount,
    balance: data.balance,
    reason: decodeURIComponent(req.params.reason),
    timestamp: new Date().toISOString()
  });
  
  await db.set(key, data);
  res.send(`✅ Removed $${amount} from ${req.params.user}. New balance: $${data.balance}`);
});

bankApp.get("/moderator-transfer/:modpass/:from/:to/:amount/:reason", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  
  const fromResult = await getUserByName(req.params.from);
  const toResult = await getUserByName(req.params.to);
  const fromData = fromResult.data;
  const fromKey = fromResult.key;
  const toData = toResult.data;
  const toKey = toResult.key;
  
  if (!fromData) {
    res.send("Sender account not found");
    return;
  }
  if (!toData) {
    res.send("Recipient account not found");
    return;
  }
  
  const amount = parseInt(req.params.amount);
  if (amount <= 0) {
    res.send("Amount must be greater than 0");
    return;
  }
  if (fromData.balance - amount < 0) {
    res.send("Insufficient funds to transfer");
    return;
  }
  
  const reason = decodeURIComponent(req.params.reason);
  fromData.balance -= amount;
  toData.balance += amount;
  
  if (!fromData.transactions) fromData.transactions = [];
  if (!toData.transactions) toData.transactions = [];
  
  fromData.transactions.push({
    type: "Moderator Transfer Out",
    amount: amount,
    balance: fromData.balance,
    reason: `To ${req.params.to}: ${reason}`,
    timestamp: new Date().toISOString()
  });
  
  toData.transactions.push({
    type: "Moderator Transfer In",
    amount: amount,
    balance: toData.balance,
    reason: `From ${req.params.from}: ${reason}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(fromKey, fromData);
  await db.set(toKey, toData);
  
  res.send(`✅ Transferred $${amount} from ${req.params.from} to ${req.params.to}`);
});

bankApp.get("/request-loan/:user/:pass/:amount/:days/:rate/:reason", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  const amount = parseInt(req.params.amount);
  const days = parseInt(req.params.days);
  const rate = parseFloat(req.params.rate);
  
  if (amount <= 0) {
    res.send("Loan amount must be greater than 0");
    return;
  }
  if (days <= 0) {
    res.send("Loan period must be greater than 0 days");
    return;
  }
  if (rate < 0 || rate > 100) {
    res.send("Interest rate must be between 0 and 100%");
    return;
  }
  
  if (!data.pendingLoans) data.pendingLoans = [];
  
  // Calculate daily payment using amortization formula
  const dailyRate = rate / 100 / 365;
  let dailyPayment;
  
  if (dailyRate === 0) {
    dailyPayment = amount / days;
  } else {
    dailyPayment = amount * (dailyRate * Math.pow(1 + dailyRate, days)) / (Math.pow(1 + dailyRate, days) - 1);
  }
  
  const totalInterest = (dailyPayment * days) - amount;
  
  const loanRequestId = Date.now().toString();
  const loanRequest = {
    id: loanRequestId,
    user: req.params.user.toLowerCase(),
    amount: amount,
    dailyPayment: Math.round(dailyPayment * 100) / 100,
    days: days,
    rate: rate,
    totalInterest: Math.round(totalInterest * 100) / 100,
    reason: decodeURIComponent(req.params.reason),
    status: "pending",
    requestedAt: new Date().toISOString()
  };
  
  data.pendingLoans.push(loanRequest);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Loan Requested",
    amount: amount,
    balance: data.balance,
    reason: `${decodeURIComponent(req.params.reason)} - ${days} days @ ${rate}% APR - Waiting for approval`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Loan request submitted for approval! Amount: $${amount}, Duration: ${days} days, Rate: ${rate}% APR, Daily Payment: $${loanRequest.dailyPayment}`);
});

bankApp.get("/approve-loan/:modpass/:user/:loanid", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (!data.pendingLoans) data.pendingLoans = [];
  if (!data.loans) data.loans = [];
  
  const loanReq = data.pendingLoans.find(l => l.id === req.params.loanid);
  if (!loanReq) {
    res.send("Loan request not found");
    return;
  }
  
  // Track approval count
  if (!loanReq.approvals) loanReq.approvals = [];
  if (!loanReq.approvals.includes(req.params.modpass)) {
    loanReq.approvals.push(req.params.modpass);
  }
  
  // Need 1 approval
  if (loanReq.approvals.length < 1) {
    await db.set(req.params.user.toLowerCase(), data);
    res.send(`Loan approved by moderator. Processing now.`);
    return;
  }
  
  const approvedLoan = {
    id: loanReq.id,
    amount: loanReq.amount,
    remaining: loanReq.amount,
    dailyPayment: loanReq.dailyPayment,
    daysRemaining: loanReq.days,
    totalDays: loanReq.days,
    rate: loanReq.rate,
    totalInterest: loanReq.totalInterest,
    reason: loanReq.reason,
    dateCreated: new Date().toISOString(),
    paymentsMade: 0
  };
  
  data.loans.push(approvedLoan);
  data.balance += loanReq.amount;
  data.pendingLoans = data.pendingLoans.filter(l => l.id !== req.params.loanid);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Loan Approved",
    amount: loanReq.amount,
    balance: data.balance,
    reason: `${loanReq.reason} - Approved by moderator`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Loan approved! $${loanReq.amount} disbursed to ${req.params.user.toLowerCase()}. (Moderator approved)`);
});

bankApp.get("/deny-loan/:modpass/:user/:loanid", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (!data.pendingLoans) data.pendingLoans = [];
  
  const loanReq = data.pendingLoans.find(l => l.id === req.params.loanid);
  if (!loanReq) {
    res.send("Loan request not found");
    return;
  }
  
  data.pendingLoans = data.pendingLoans.filter(l => l.id !== req.params.loanid);
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Loan Denied",
    amount: loanReq.amount,
    balance: data.balance,
    reason: `${loanReq.reason} - Denied by moderator`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Loan request denied for ${req.params.user.toLowerCase()}`);
});

bankApp.get("/set-payday/:user/:pass/:day/:amount", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  
  const day = parseInt(req.params.day);
  const amount = parseFloat(req.params.amount);
  
  if (day < 0 || day > 6) {
    res.send("Day must be 0-6 (Sunday-Saturday)");
    return;
  }
  
  if (amount <= 0) {
    res.send("Weekly payday amount must be greater than 0");
    return;
  }
  
  data.payday = {
    day: day,
    amount: amount,
    dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]
  };
  data.payverified = false;
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Payday Set",
    amount: 0,
    balance: data.balance,
    reason: `Weekly payday set to ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]} - $${amount}/week - Pending verification`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Weekly payday set to ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]} for $${amount}/week. Waiting for moderator verification.`);
});

bankApp.get("/verify-payday/:modpass/:user", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (data.payday === null || data.payday === undefined) {
    res.send("User has not set a payday");
    return;
  }
  
  // Track approval count
  if (!data.payday.approvals) data.payday.approvals = [];
  if (!data.payday.approvals.includes(req.params.modpass)) {
    data.payday.approvals.push(req.params.modpass);
  }
  
  // Need 1 approval
  if (data.payday.approvals.length < 1) {
    await db.set(req.params.user.toLowerCase(), data);
    res.send(`Payday verified by moderator. Processing now.`);
    return;
  }
  
  data.payverified = true;
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Payday Verified",
    amount: 0,
    balance: data.balance,
    reason: `Weekly payday verified by moderator - $${data.payday.amount}/week on ${data.payday.dayName}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Weekly payday verified for ${req.params.user.toLowerCase()}: $${data.payday.amount} per week on ${data.payday.dayName}. (Moderator approved)`);
});

bankApp.get("/deny-payday/:modpass/:user", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (data.payday === null || data.payday === undefined) {
    res.send("User has not set a payday");
    return;
  }
  
  const paydayInfo = data.payday;
  data.payday = null;
  data.payverified = false;
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Payday Denied",
    amount: 0,
    balance: data.balance,
    reason: `Weekly payday denied by moderator - $${paydayInfo.amount}/week on ${paydayInfo.dayName}`,
    timestamp: new Date().toISOString()
  });
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(`Weekly payday request denied for ${req.params.user.toLowerCase()}`);
});

bankApp.get("/repay-loan/:user/:pass/:loanid/:amount", async (req, res) => {
  const data = await db.get(req.params.user.toLowerCase());
  if (!data) {
    res.send("Account not found");
    return;
  }
  if (data.password !== req.params.pass) {
    res.send("Authentication failed");
    return;
  }
  
  if (!data.loans) data.loans = [];
  
  const loanId = req.params.loanid;
  const loan = data.loans.find(l => l.id === loanId);
  
  if (!loan) {
    res.send("Loan not found");
    return;
  }
  
  const amount = parseFloat(req.params.amount);
  
  if (data.balance - amount < 0) {
    res.send("Insufficient funds to repay loan");
    return;
  }
  
  if (amount > loan.remaining) {
    res.send("Cannot repay more than remaining loan amount: $" + loan.remaining);
    return;
  }
  
  data.balance -= amount;
  loan.remaining = Math.max(0, Math.round((loan.remaining - amount) * 100) / 100);
  loan.paymentsMade = (loan.paymentsMade || 0) + 1;
  
  if (loan.daysRemaining > 0) {
    loan.daysRemaining--;
  }
  
  if (!data.transactions) data.transactions = [];
  data.transactions.push({
    type: "Loan Repayment",
    amount: amount,
    balance: data.balance,
    reason: `Loan #${loanId.slice(-6)} - Remaining: $${loan.remaining} (${loan.daysRemaining} days left)`,
    timestamp: new Date().toISOString()
  });
  
  let message;
  if (loan.remaining === 0) {
    data.loans = data.loans.filter(l => l.id !== loanId);
    data.transactions[data.transactions.length - 1].reason = `Loan #${loanId.slice(-6)} - FULLY PAID`;
    message = "Loan fully repaid! New balance: $" + data.balance;
  } else {
    message = `Repayment of $${amount} successful. Remaining: $${loan.remaining} (${loan.daysRemaining} days left, $${loan.dailyPayment}/day). New balance: $${data.balance}`;
  }
  
  await db.set(req.params.user.toLowerCase(), data);
  res.send(message);
});

// Get public chat messages
bankApp.get("/chat-messages", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(chatMessages || []);
});

// Get private 1-on-1 chat with specific user
bankApp.get("/private-chat/:user1/:user2", async (req, res) => {
  const user1 = req.params.user1.toLowerCase();
  const user2 = req.params.user2.toLowerCase();
  const chatKey = [user1, user2].sort().join("_");
  
  const userData = await db.get(user1);
  if (!userData) {
    res.json([]);
    return;
  }
  
  if (!userData.privateChats) userData.privateChats = {};
  res.json(userData.privateChats[chatKey] || []);
});

// Get all chats for moderator
bankApp.get("/all-chats/:user/:pass", async (req, res) => {
  const user = req.params.user.toLowerCase();
  const pass = req.params.pass;
  
  const userData = await db.get(user);
  if (!userData || userData.password !== pass) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  
  if (!userData.isModerator) {
    res.status(403).json({ error: "Not a moderator" });
    return;
  }
  
  const allChats = {
    publicChat: chatMessages || [],
    privateChats: {}
  };
  
  const keys = await db.list();
  for (const key of keys) {
    const accountData = await db.get(key);
    if (accountData && accountData.privateChats) {
      Object.assign(allChats.privateChats, accountData.privateChats);
    }
  }
  
  res.json(allChats);
});

let deviceSubscriptions = {};

bankApp.post("/register-device", express.json(), async (req, res) => {
  const { username, deviceId, subscription } = req.body;
  if (!username || !deviceId || !subscription) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const key = `${username}-${deviceId}`;
  deviceSubscriptions[key] = subscription;
  res.json({ success: true });
});

bankApp.post("/send-chat-message", express.json(), async (req, res) => {
  const { username, message, recipient } = req.body;
  
  if (!message || message.length === 0) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  
  const chatMessage = {
    username: username,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (!recipient) {
    chatMessages.push(chatMessage);
    if (chatMessages.length > 100) chatMessages = chatMessages.slice(-100);
    res.json({ success: true, message: "Message sent!" });
    return;
  }
  
  const user1Lower = username ? username.toLowerCase() : null;
  const user2Lower = recipient ? recipient.toLowerCase() : null;
  
  if (!user1Lower || !user2Lower) {
    res.status(400).json({ error: "Username and recipient required" });
    return;
  }
  
  const chatKey = [user1Lower, user2Lower].sort().join("_");
  
  try {
    const keys = await db.list();
    let user1Key = null;
    let user2Key = null;
    
    for (const key of keys) {
      if (key.toLowerCase() === user1Lower) user1Key = key;
      if (key.toLowerCase() === user2Lower) user2Key = key;
    }
    
    if (!user1Key || !user2Key) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    
    let user1Data = await db.get(user1Key);
    let user2Data = await db.get(user2Key);
    
    if (!user1Data || !user2Data) {
      res.status(400).json({ error: "User data corrupted" });
      return;
    }
    
    if (!user1Data.privateChats) user1Data.privateChats = {};
    if (!user1Data.privateChats[chatKey]) user1Data.privateChats[chatKey] = [];
    if (!user2Data.privateChats) user2Data.privateChats = {};
    if (!user2Data.privateChats[chatKey]) user2Data.privateChats[chatKey] = [];
    
    user1Data.privateChats[chatKey].push(chatMessage);
    user2Data.privateChats[chatKey].push(chatMessage);
    
    await db.set(user1Key, user1Data);
    await db.set(user2Key, user2Data);
    
    for (const subKey in deviceSubscriptions) {
      if (subKey.startsWith(user2Key + '-')) {
        try {
          await fetch('https://updates.push.services.mozilla.com/wpush/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `💬 ${username}`,
              body: message.substring(0, 50)
            })
          }).catch(() => {});
        } catch (e) {}
      }
    }
    
    res.json({ success: true, message: "Private message sent!" });
  } catch (error) {
    console.error("Error sending private message:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

bankApp.get("/send-chat-message/:user/:message", async (req, res) => {
  const username = req.params.user.toLowerCase();
  const message = decodeURIComponent(req.params.message);
  
  if (!message || message.length === 0) {
    res.status(400).send("Message cannot be empty");
    return;
  }
  
  const chatMessage = {
    username: username,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  chatMessages.push(chatMessage);
  
  if (chatMessages.length > 100) {
    chatMessages = chatMessages.slice(-100);
  }
  
  res.send("Message sent!");
});

bankApp.get("/mod-list/:user/:pass", async (req, res) => {
  const user = req.params.user.toLowerCase();
  const userData = await db.get(user);
  
  if (!userData || userData.password !== req.params.pass) {
    res.status(403).send("Access denied");
    return;
  }
  
  if (!userData.isModerator) {
    res.status(403).send("Not a moderator");
    return;
  }
  
  const keys = await db.list();
  const accounts = {};
  for (const k of keys) {
    const account = await db.get(k);
    if (account && account.password) {
      accounts[k.toLowerCase()] = account;
    }
  }
  
  res.json(accounts);
});

bankApp.get("/grant-moderator/:modpass/:username", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  
  const usernameLower = req.params.username.toLowerCase();
  let data = await db.get(usernameLower);
  let actualKey = usernameLower;
  
  if (!data) {
    const keys = await db.list();
    for (const k of keys) {
      if (k.toLowerCase() === usernameLower) {
        data = await db.get(k);
        actualKey = k;
        break;
      }
    }
  }
  
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  if (data.isModerator) {
    res.send(`${usernameLower} is already a moderator`);
    return;
  }
  
  data.isModerator = true;
  await db.set(actualKey, data);
  
  res.send(`✅ Moderator access granted to ${usernameLower}`);
});

bankApp.get("/remove-moderator/:modpass/:username", async (req, res) => {
  if (req.params.modpass !== "MODxd259" && req.params.modpass !== "KoalaFarmMoney") {
    res.status(403).send("Access denied");
    return;
  }
  
  const usernameLower = req.params.username.toLowerCase();
  const keys = await db.list();
  let actualKey = null;
  let data = null;
  
  for (const k of keys) {
    if (k.toLowerCase() === usernameLower) {
      data = await db.get(k);
      actualKey = k;
      break;
    }
  }
  
  if (!data) {
    res.send("Account not found");
    return;
  }
  
  data.isModerator = false;
  await db.set(actualKey, data);
  
  res.send(`❌ Moderator access removed from ${usernameLower}`);
});


bankApp.post("/ai-shape/simulate", express.json(), (req, res) => {
  try {
    const prompt = (req.body && req.body.prompt) || "";
    if (!prompt.trim()) {
      res.status(400).json({ error: "A prompt is required." });
      return;
    }

    const result = simulateShapeFromPrompt(prompt);
    res.json(result);
  } catch (error) {
    console.error("AI shape simulation error:", error.message);
    res.status(500).json({ error: "Failed to simulate shape." });
  }
});

bankApp.listen(5000, () => console.log("🦌 DeerBank running on port 5000"));
