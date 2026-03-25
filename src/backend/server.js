import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import passport from "./config/passport.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({
  origin: process.env.FRONTEND_URL
}));
app.use(passport.initialize());

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});