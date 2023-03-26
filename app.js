//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const _ = require("lodash");

const PORT = process.env.PORT || 3000;
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.use(session({
    secret:"LittleSecret",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());


// Connect to a database
mongoose.connect("mongodb://127.0.0.1:27017/userDB",{ useNewUrlParser: true});
const userSchema = new mongoose.Schema ({
    username: String,
    password:String,
    email:String,
    displayName: String,
    googleId:String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id).then(user => {
      done(null, user);
    }).catch((err) => {
      return done(err)
    });
});

// create a strategy for Google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets'
  },
  async function (accessToken, refreshToken, profile, done) {
    try {
      console.log(profile);
      // Find or create user in your database
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        const newUser = new User({
          username: profile.displayName,
          googleId: profile.id,
          displayName: profile.displayName
        });
        user = await newUser.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Create a strategy for facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/secrets'
  },
  async function (accessToken, refreshToken, profile, done) {
    try {
      // Find or create user in your database
      let user = await User.findOne({ facebookId: profile.id });
      if (!user) {
        // Create new user in database
        const newUser = new User({
          username: profile.displayName,
          facebookId: profile.id,
          displayName:profile.displayName
        });
        user = await newUser.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Home route
app.get("/",function(req,res){
    res.render("home");
});

// Passport authentication for Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
});

// Passport authentication for Facebook
app.get('/auth/facebook',  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets', passport.authenticate('facebook', { 
  failureRedirect: '/login' 
}), function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
});


// Login route
app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});


app.get("/secrets", function(req, res) {
    User.find({secret: {$ne: null}}).then((foundUsers) => {
      res.render("secrets", {
        usersWithSecrets: foundUsers,
        currentUser:req.user
      })
    }).catch((err) => {
      console.log(err)
    });
  });


// Sublit routes
app.get("/submit",function(req,res){
    if (req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",function(req,res){
  const submittedsecret = req.body.secret;
  User.findById(req.user.id).then((foundUser) => {
    if (foundUser) {
      foundUser.secret = submittedsecret;
      foundUser.save().then(() => {
        res.redirect("/secrets")
      }).catch((err) => {
        console.log(err)
      });
    }
  }).catch((err) => {
    console.log(err)
  });
     
});

app.post("/register",function(req,res){
   const nameOfUser = _.capitalize(req.body.username.replace(/@.*$/,""));
   const newUser = new User({
    username:req.body.username,
    email:req.body.username,
    displayName:nameOfUser
   });
   User.register(newUser,req.body.password,function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
   })
});

app.post("/login",async function(req,res){
   const user = new User({
    username:req.body.username,
    password: req.body.password
   });
   req.login(user,function(err){
    if(err){
        console.log(err);
        res.redirect("/login");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
   })
});

app.get("/logout",function(req,res,next){
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect("/");
    });
    
});

app.listen(process.env.PORT||3000,function(){
    console.log("Listening to port 3000");
});