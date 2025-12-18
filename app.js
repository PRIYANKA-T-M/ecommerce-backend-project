const express=require('express')
//steps to create a connection between database and the server
//step 1-import the package
const mongoose=require('mongoose')
const cors=require('cors')
const {rateLimit}=require('express-rate-limit')
const bcrypt = require('bcrypt');
const jwt=require("jsonwebtoken") ;
const nodemailer=require('nodemailer')
const dotenv=require("dotenv")
const helmet=require('helmet')
dotenv.config()
const app=express()
const port=process.env.PORT
const secretkey=process.env.SECRET_KEY
app.use(helmet());//here helemet is a middleware
//helemt is used nto secure express by setting HTTP response protocals
//each header solves one 


//for server crash
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 55, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
})

app.use(express.json())
//step 2-establish a connection
async function connection(){
   await mongoose.connect(process.env.MONGODBURL)
}
//step 3-create a schema
let productSchema = new mongoose.Schema({
    title:{type:String, required:true},
    price:{type:Number, required:true},
    img:{type:String, required:true}});

//step 4: create a model
const finalproducts=mongoose.model('products',productSchema)
// Apply the rate limiting middleware to all requests.
app.use(limiter)
//connecting the frontend with backend
app.use(cors())

//-------------------------USER MODEL------------------------------------------
let userSchema=new mongoose.Schema({
    username:{type:String, required:true},
    email:{type:String, required:true},
    password:{type:String, required:true}
});

let usermodel=mongoose.model("users",userSchema)



//-------------------------API------------------------------------------

//api-1 store products in the database

app.post('/products',async (req,res)=>{
    try{
        const{title,price,img}=req.body
        let newproduct={title,price,img}
        await finalproducts.create(newproduct)
        
        res.status(201).json({
            msg:"Products are added successfully"
        });

    }catch(error){
        
        res.json({
            msg:error.message
        });
    }
        
})
//api-1.2 registration details

app.post('/signup',async(req,res)=>{
    try{
        const {username,email,password}=req.body;
        let isuser=await usermodel.findOne({username})
        if(isuser){
            return res.json({msg : "user already exists"});
        }
        let hashedpassword=await bcrypt.hash(password,10)
        await usermodel.create({username,email,password:hashedpassword})
        //send a mail to registered user
        const transporter=nodemailer.createTransport({
            service:'gmail',
            auth:{
                user:process.env.GMAIL_USER,
                pass:process.env.GMAIL_APP_PASSWORD
            }
        })
        const format={
            from:process.env.GMAIL_USER,
            to:email,
            subject:'Account Registration',
            text:'Account registration mail from web',
            html:`
            <p>Hi ${username}, your account has been registered successfully</p>
            `
        }
        transporter.sendMail(format,(error,info)=>{
            if(error){
                console.log(error.message)
            }
            else{
                console.log("mail sent successfully")
            }
        })
        res.json({
            msg:"user created successfully..."

        })
        
        
    }
    catch(error){
        res.json({
            msg:error.message
        })
    }
    })
    //api for sign in
    app.post('/signin',async(req,res)=>{
        try{
            const {username,password}=req.body;
        let userdetails=await usermodel.findOne({username})
        if(!userdetails) return res.json({msg:"user not found"})
        //username check
        //if(userdetails.username===username) return res.json({msg:"enter the password"})
            let checkpassword=await bcrypt.compare(password,userdetails.password)
        if(!checkpassword) 
            return res.json({msg :"username or password is incorrect "})
        
        let payload={username:username}
        let token=jwt.sign(payload,secretkey,{expiresIn:"1hr"})
        res.json({msg: "Signed in successfully", token:token})

        }
        catch(error){
            res.json({
                msg:error.message
            })
        }
        


    })
//api-2 fetch all the products

// app.get('/fetch',async (req,res)=>{
//     try{
//         let userdata = await finalproducts.find()
//         res.json({userdata})

//     }
//     catch(error){
//         res.json({
//             msg:error.message
//         })
//     }
    
// })

app.get('/products', async (req, res) => {
    try {
        let products = await finalproducts.find()
        res.json({ products })
    } catch (error) {
        res.json({
            msg: error.message
        })
    }
})

//api-3 delete a product
app.delete('/deleteproducts',async (req,res)=>{
    try{
        const {id}=req.body
        finalproducts.findByIdAndDelete(id)
        res.json({
            msg:"Product is deleted"
        })
    }
    catch(error){
        res.json({
            msg:error.message
        })
    }
})
//api-4 update a product

app.put('/updateproducts',async(req,res)=>{
    try{
        const {id,title,price,img}=req.body
        let updatedetails=finalproducts.findById({id})
        if(title) updatedetails.title=title
        if(price) updatedetails.price=price
        if(img) updatedetails.img=img
        res.json({
            msg:"product update successfully"
        })


    }
    catch(error){
        res.json({
            msg:error.message
        })
    }
})
//dummy api
app.get('/dummy',(req,res)=>{
    const age=req.query.age
    const location=req.query.location
    const name=req.query.name
    res.send(`my name is ${name} and age is ${age} and i live in ${location}`)

})

//fetch single data
app.get('/product/:id',async(req,res)=>{ //":/" acts  as foreign 
    id=req.params.id
    const product=await finalproducts.findById(id)
    res.json({
        productid
    })
})
app.listen(port,async()=>{
    console.log(`The server is running on ${port}`)
    connection();
    
})