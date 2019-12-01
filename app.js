var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon=require('serve-favicon');
var bodyParser=require('body-parser');
var session=require('express-session');
var api=require('instagram-node').instagram();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:'secret',
  saveUninitialized:true,
  resave:true
}));
//global vars
app.use(function (req,res,next) {
  //Format Date
  res.locals.formDate=function (date) {
    var myDate=new Date(date *1000);
    return myDate.toLocaleString();
  }
  if(req.session.accesstoken && req.session.accesstoken != 'undefined'){
    res.locals.isLoggedIn=true;
  }
  else{
    res.locals.isLoggedIn=false;
  }
  next();
})
//instagram stuff
api.use({
  client_id:'ce5c640a788e488d96032a62f3b86bf9',
  client_secret:'541a6e03cadb46d1a6fcbe6249d5018b'
});
var redirect_uri='http://localhost:3450/handleAuth';
exports.authorize_user = function(req, res) {
  res.redirect(api.get_authorization_url(redirect_uri, { scope: ['basic'], state: 'a state' }));
};

exports.handleauth = function(req, res) {
  api.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
      console.log(err.body);
      res.send("Didn't work");
    } else {
      /*console.log('Access Token ' + result.access_token);
      console.log('User ID ' + result.user.id);
      res.send('You made it!!');*/
      req.session.accesstoken=result.access_token;
      req.session.uid=result.user.id;
      api.use({access_token:req.session.accesstoken});
      res.redirect('/main');
    }
  });
};
//Index route
app.get('/',function (req,res,next) {
  res.render('index',{
    title:'Welcome'
  });
});
//Main route
app.get('/main',function(req,res,next) {
  api.user(req.session.uid,function(err,result,remaining,limit) {
    if(err){
      res.send(err);
    }
    api.user_media_recent(req.session.uid,{},function(err,medias,pagination,remaining,limit) {
      if(err){
        res.send(err);
      }
      res.render('main',{
        title:'My Instagram',
        user:result,
        medias:medias
    });
    });
  });
});
//logout route
app.get('/logout',function (req,res,next) {

    req.session.accesstoken=false;
    req.session.uid=false;
res.redirect('/');
});

//login routes
app.get('/login',exports.authorize_user);
//handleauth
app.get('/handleauth',exports.handleauth);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
