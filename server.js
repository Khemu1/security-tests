const helmet = require("helmet");
const express = require("express");
const http = require("node:http");
const path = require("path");
const passport = require("passport");
const cookieSession = require("cookie-session");
require("dotenv").config();
const { Strategy } = require("passport-google-oauth20");

const PORT = 3000;
const config = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  COOKIE_KEY_1: process.env.COOKIE_KEY_1,
  COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};
const app = express();

console.log("config ", config);

passport.use(
  new Strategy(
    {
      callbackURL: "/auth/google/callback",
      clientID: config.CLIENT_ID,
      clientSecret: config.CLIENT_SECRET,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("Google profile ", profile);
      done(null, profile); // Pass profile to serialize
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user ", user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("Deserializing id ", id);
  done(null, { id });
});

app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000, // 24h
    keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2],
  })
);
app.use(passport.initialize());
app.use(passport.session());

const checkLoggedIn = (req, res, next) => {
  const isLoggedIn = req.isAuthenticated() && req.user.id; // passport.js saves data inside user

  if (!isLoggedIn) {
    return res.status(401).json({
      message: "You must log in",
    });
  }
  next();
};

app.get("/auth/google", passport.authenticate("google", { scope: ["email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  })
);

app.get("/auth/logout", (req, res) => {
  req.logout(); // removes user from session
  res.redirect("/");
});

app.get("/secret", checkLoggedIn, (_req, res) => {
  return res.send("Your secret is 41");
});

app.get("/failure", (req, res) => {
  return res.send("Login failed");
});

app.get("/", (_req, res) => {
  console.log("Trying to serve file");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    type: "Invalid route",
  });
});
const server = http.createServer(app);

server.listen(PORT, () => {
  // ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
  console.log(`Server is running on http://localhost:${PORT}`);
});
