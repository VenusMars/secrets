//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));

const PORT = process.env.PORT || 3000;

// Connect to a database
mongoose.connect("mongodb://127.0.0.1:27017/userDB",{ useNewUrlParser: true});
const userSchema = new mongoose.Schema ({
    email: String,
    password:String
});

const User = mongoose.model("User",userSchema);

app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});
app.post("/login",async(req,res)=>{
    const userEmail = req.body.username;
    const password = md5(req.body.password);
    try{
        const results = await User.findOne({email:userEmail});
        if(results){
            if(results.password === password){
                res.render("secrets");
            }else{
                res.send("Incorrect password");
            }
        }
    }catch(err){
        res.send(err);
    }
});


app.get("/register",function(req,res){
    res.render("register");
});
app.post("/register",function(req,res){
        const newUser = new User({
            email:req.body.username,
            password:md5(req.body.password)
        });
        try{
            newUser.save();
            res.render("secrets");
        }catch(err){
            console.log(err);
        }
});

app.get("/logout",function(req,res){
    res.render("home");
});

app.listen(process.env.PORT||3000,function(){
    console.log("Listening to port 3000");
});