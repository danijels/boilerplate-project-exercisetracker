const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bodyParser = require('body-parser');
require('dotenv').config();

function displayObject(doc) {
  return {
    username: doc.userName,
    _id: doc._id
  }
}

function makeDate(string) {
  const array = string.split("-");
  const date = new Date(array[0], array[1] - 1, array[2]);
  return date;
}
const app = express();

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: Date
});
const userSchema = new Schema({
  userName: { type: String, unique: true },
  exercise: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

//Adding a new user
app.post('/api/exercise/new-user', (req, res) => {
  const user = new User({
    userName: req.body.username,
    exercise: []
  });

  user.save(err => {
    if (err) {
      if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(422).send(`User already exists!`);
      } else return console.error(err);
    }
    res.json(displayObject(user));
  });  
});

//Displaying all users(their name and id) in an array
app.get('/api/exercise/users', (req, res) => {
  const response = [];
  
  User.find({}, (err, users) => {
    if (err) return console.error(err);
    
    users.forEach(user => {      
      response.push(displayObject(user));
    });

    res.send(response);
  });
});

//Adding a new exercise record
app.post('/api/exercise/add', (req, res) => {
  const body = req.body;
  //If the user doesn't provide the date, it is set to the current date. Either way, a stringified date object is displayed.
  let date;
  if (body.date) {
    date = makeDate(body.date);
  } else {
    date = new Date();
  }
  //The base update object. For the response, it's going to be used as is, and for the doc it's going to passed into the Exercise constructor
  const update = {
    description: body.description,
    duration: body.duration,
    date: date
  }

  User.findById(body.userId, (err, user) => {
    if (err) return console.error(err);
    
    user.exercise.push(new Exercise(update));
    user.save();
    //Constructs the response that the test is expecting.
    const response = {
      _id: user._id,
      username: user.userName,
      date: date.toDateString(),
      duration: parseInt(update.duration),
      description: update.description
    }
    res.json(response);
  });
});

//Getting the log of all exercises for a user

app.get('/api/exercise/log', (req, res) => {
  let fr;
  let to;
  if (req.query.from) fr = makeDate(req.query.from).valueOf();
  if (req.query.to) to = makeDate(req.query.to).valueOf();
  console.log("hi", fr, to);
  User.findById(req.query.userId, (err, user) => {
    if (err) return console.error(err);
    //Constructing the log for the display.     
    //the doc is excluded if it's not within the provided time range
    //the doc's id and v are not displayed to the user 
    let log = user.exercise.filter(obj => {
      const target = obj.date.valueOf();
      //There is no from and to parameters and every exercise object is returned 
      return (fr === undefined && to === undefined) ||
      //If from is provided and not both of them AND the date is within the range, the object is returned. 
      ((fr !== undefined && to === undefined) && target >= fr) ||
      //If to is provided and not both of them AND the date is within the range, the object is returned. 
      ((to !== undefined && fr === undefined) && target <= to) ||
      //Both from and to are provided if we are here OR the date is not above/under the from/to value. 
      //We just have to check if the date is within the range.
      //In the case of from or to being undefined the final expression returns false. 
      (target >= fr && target <= to);      
    });
    log = log.map(obj => {
      return {
        description:obj.description,
        duration: obj.duration,
        date: obj.date.toDateString()
      };      
    });
    const response = {
      _id: user._id,
      username: user.userName,
      count: user.exercise.length,
      //If the limit is specified, the array will be cut to that length, and if not, the second param is undefined and the full array is returned
      log: log.slice(0, req.query.limit)
    };
    res.json(response);  
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
//improvement ideas:
//add passwords
//scratch the accessing your data by your user id completely
//make it look at least a little bit prettier
//? maybe add a data viz of how much you exercised? <-- if you have some spare time
//in each case make the data logs presentable
