const express = require('express')
const path = require('path')
const mongoose = require('mongoose');
const Product = require('./models/product');
const Cart = require('./models/Cart');
const session = require('express-session')
const Razorpay = require('razorpay')

mongoose.connect('mongodb://localhost:27017/e-commerce', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})

const db = mongoose.connection;
db.on("error", console.error.bind(console, 'connection error:'));
db.once("open", () =>{
    console.log("Database connected")
})

const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({extended: true}))

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 180 * 60 * 1000 },
  }))

  app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
  });



  // routes

app.get('/', (req, res)=>{
    res.render('home')
})

app.get('/products', async (req, res)=>{
    const products = await Product.find({});
    res.render('products/index', {products})
})

app.get('/products/new', (req, res) =>{
    res.render('products/new')
})

app.post('/products', async (req, res) =>{
    const product = new Product(req.body.product)
    await product.save();
    res.redirect('/products')
})

app.get('/products/:id', async (req, res)=>{
    const product = await Product.findById(req.params.id);
    res.render('products/show', {product})
})



// Cart

app.get("/add-to-cart/:id", function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
  
    Product.findById(productId, function (err, product) {
      if (err) {
        return res.redirect("/");
      }
      cart.add(product, product.id);
      req.session.cart = cart;
      res.redirect("/products");
    });
  });

app.get("/shopping-cart", function (req, res, next) {
    if (!req.session.cart || req.session.cart.totalQty === 0) {
      if (req.session.cart === undefined) {
        req.session.cart = null;
      }
      return res.render("shop/shopping-cart", { products: null });
    }
    var cart = new Cart(req.session.cart);
    res.render("shop/shopping-cart", {
      products: cart.generateArray(),
      totalPrice: cart.totalPrice,
    });
  });
  

//Cart Add
app.get("/add/:id", function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
  
    cart.addByOne(productId);
    req.session.cart = cart;
    res.redirect("/shopping-cart");
  });
  
  app.get("/reduce/:id", function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
  
    cart.reducedByOne(productId);
    req.session.cart = cart;
    res.redirect("/shopping-cart");
  });
  
  app.get("/remove/:id", function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
  
    cart.removeItem(productId);
    req.session.cart = cart;
    res.redirect("/shopping-cart");
  });


    //payment

    let razorpay = new Razorpay({
      key_id: 'rzp_test_WLANMe64tLmDaL',
      key_secret: 'yOAGw4JYiOoucKI4s3i30Y9G'
    })

      app.get('/shopping-cart', (req, res)=>{
        res.render('shop/shopping-cart')
      })
      
    app.post('/order', (req, res) =>{
      var cart = new Cart(req.session.cart);
      let options = {
        amount: `${cart.totalPrice * 100}`, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
    };

    razorpay.orders.create(options, function(err, order) {
      if(err){
        console.log(err)
      }else{
        res.json(order)
      }
    });
  
    })

    app.post('/check-payment', (req,res)=>{

      razorpay.payments.fetch(req.body.razorpay_payment_id).then((paymentDocument) =>{
        if(paymentDocument.status == 'captured'){
          res.redirect('/products')
          req.session.destroy();
        }else{
          res.redirect('/checkout')
        }
      })

    })
  
  

app.listen(3000, ()=>{
    console.log('Server Started')
})