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

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
    },
  },
  { versionKey: false }
);

const User = mongoose.model("User", userSchema);

const exercisesSchema = new mongoose.Schema(
  {
    username: String,
    description: String,
    duration: Number,
    date: Date,
    userId: String,
  },
  { versionKey: false }
);

const Exercises = mongoose.model("Exercises", exercisesSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.send(users);
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

app.get("/api/users/:_id/logs", async (req, res) => {
  let { from, to, limit } = req.query;
  const userId = req.params._id;

  const founduser = await User.findById(userId);
  if (!founduser) res.json({ message: "no user found " });

  let filter = { userId };
  let dateFilter = {};

  if (from) {
    dateFilter["$gte"] = new Date(from);
  }

  if (to) {
    dateFilter["$lte"] = new Date(to);
  }

  if (from || to) {
    filter.date = dateFilter;
  }

  if (!limit) {
    limit = 100;
  }
  let exercises = await Exercises.find(filter).limit(limit);
  exercises = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    };
  });
  res.json({
    username: founduser.username,
    count: exercises.length,
    _id: userId,
    log: exercises,
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;
  const userid = req.body[":_id"];
  const founduser = await User.findById(userid);

  if (!founduser) res.json({ message: "no user found " });

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  await Exercises.create({
    username: founduser.username,
    description,
    duration,
    date,
    userid,
  });

  res.send({
    username: founduser.username,
    description,
    duration,
    date: date.toDateString(),
    _id: userid,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
