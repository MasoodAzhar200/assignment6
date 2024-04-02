/********************************************************************************
* WEB322 – Assignment 4
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* Name: __Muhammad Masood Azhar____________________ Student ID: _149328221_____________ Date: ___2024-04-02___________
*
********************************************************************************/
require('dotenv').config();
const express = require("express");
const path = require("path");
const legoData = require("./modules/legoSets");
const clientSessions = require('client-sessions');
const mongoose=require('mongoose');
const { getAllThemes, addSet, editSet, getSetByNum, deleteSet} = require('./modules/legoSets'); 

const authData = require('./modules/auth-service');

const app = express();
const PORT = process.env.PORT||8080;
mongoose.set('strictQuery',false);
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 


legoData.initialize()
.then(authData.initialize) 
.then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
  });
}).catch((err) => {
  console.log(`Unable to start the server: ${err}`);
});

app.use((req, res, next) => {
  res.locals.page = req.path; 
  next();
});


app.use(clientSessions({
  cookieName: "session", 
  secret: "YourSecretKeyHere", // should be a large unguessable string or Buffer
  duration: 30 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 5 * 60 * 1000, // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// GET route for login view
app.get("/login", (req, res) => {
  res.render("login", { errorMessage: req.session.errorMessage });
});

// GET route for rendering the registration page
app.get("/register", (req, res) => {
  let successMessage = req.session.successMessage;
  let errorMessage = req.session.errorMessage;

  // Clear the messages from the session so they don't reappear on refresh
  delete req.session.successMessage;
  delete req.session.errorMessage;

  res.render("register", { 
    successMessage: successMessage,
    errorMessage: errorMessage,
    userName: "" // Or any other default value or previously entered username
  });
});

// POST route for registering a new user
app.post("/register", async (req, res) => {
  try {
    await authData.registerUser(req.body);
    req.session.successMessage = "User created successfully";
    res.redirect("/register");
  } catch (err) {
    req.session.errorMessage = err;
    req.session.userName = req.body.userName; // Capture the entered username
    res.redirect("/register");
  }
});

// POST route for user login
app.post("/login", async (req, res) => {
  console.log(req);
  req.body.userAgent = req.get('User-Agent');
  try {
    const user = await authData.checkUser(req.body);
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect("/lego/sets");
  } catch (err) {
    req.session.errorMessage = err;
    res.redirect("/login");
  }
});

// GET route for logging out
app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

// GET route for viewing user history - protected by ensureLogin
app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory", {
    user: req.session.user
  });
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');


app.get("/", (req, res) => {
  res.render("home", { active: 'home' });
});


app.get("/about", (req, res) => {
  res.render("about", { active: 'about' });
});


app.get("/lego/sets", async (req, res) => {
  try {
    const sets = await legoData.getAllSets();
    res.render("sets", { sets: sets, active: 'collection' });
  } catch (error) {
    res.status(404).render("404");
  }
});


app.get("/lego/sets/:set_num", async (req, res) => {
  try {
    const setNum = req.params.set_num;
    const set = await legoData.getSetByNum(setNum); 
    if (set) {
      
      res.render("setDetail", { set: set, active: 'set' }); 
    } else {
      res.status(404).render("404", { active: '404' }); 
    }
  } catch (error) {
    res.status(500).render("500", { active: '500' }); 
  }
});


app.get('/lego/addSet', ensureLogin, async (req, res) => {
  const themes = await getAllThemes();
  res.render('addSet', { themes: themes, active: 'addSet', session: req.session });
});



app.post('/lego/addSet', ensureLogin, async (req, res) => {
  try {
    await addSet(req.body);
    res.redirect('/lego/sets');
  } catch (err) {
    res.render('500', { message: `An error occurred: ${err.message}` });
  }
});


app.get('/lego/editSet/:num', ensureLogin, async (req, res) => {
  try {
    const set = await getSetByNum(req.params.num);
    const themes = await getAllThemes();
    if (set) {
      res.render('editSet', { set: set, themes: themes, active: 'editSet', session: req.session });
    } else {
      res.status(404).send('Set not found');
    }
  } catch (error) {
    res.status(500).render('500', { message: error.message });
  }
});


app.post('/lego/editSet', ensureLogin, async (req, res) => {
  try {
    await editSet(req.body.set_num, req.body);
    res.redirect('/lego/sets');
  } catch (error) {
    res.status(500).render('500', { message: error.message });
  }
});

app.get('/lego/deleteSet/:num', ensureLogin, async (req, res) => {
  try {
    await deleteSet(req.params.num);
    res.redirect('/lego/sets');
  } catch (error) {
    res.status(500).render('500', { message: `Sorry, encountered the following error: ${error.message}` });
  }
});


app.use((req, res) => {
  res.status(404).render("404", { message: "The specific set or theme you're looking for cannot be found." });
});
