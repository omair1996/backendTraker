const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("connected to db");
  })
  .catch((error) => {
    console.error(`error connecting to the db.${error}`);
  });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
});

const User = mongoose.model("User", userSchema);

const exercisesSchema = new mongoose.Schema({
  username: String,
  description: { type: String, require: true },
  duration: Number,
  date: Date,
  userId: { type: String, require: true },
});

const Exercise = mongoose.model("Exercise", exercisesSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const foundUser = await User.find();
  res.send(foundUser);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;

  const foundUser = await User.findOne({ username });

  if (foundUser) return res.json(foundUser);

  const user = await User.create({
    username,
  });
  res.json(user);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.json({ message: "no user found " });
    } else {
      const exercisesObj = new Exercise({
        userId: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });

      const exercises = await exercisesObj.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercises.description,
        duration: exercises.duration,
        date: new Date(exercises.date).toDateString(),
      });
    }
  } catch (err) {
    console.log(err);
    res.send("Sorry an error occured");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  const user = await User.findById(id);
  if (!user) {
    res.send("no user found ");
    return;
  }
  let dateObj = {};

  if (from) {
    dateObj["$gte"] = new Date(from);
  }

  if (to) {
    dateObj["$lte"] = new Date(to);
  }

  let filter = {
    userId: id,
  };

  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(limit ?? 500);

  const logs = exercises.map((exercises) => ({
    description: exercises.description,
    duration: exercises.duration,
    date: exercises.date.toDateString(),
  }));

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: logs,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
