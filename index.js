const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);



app.use(cors({
  origin: ['http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.sk1ew0y.mongodb.net/?retryWrites=true&w=majority&appName=cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const ScholarShipCollection = client.db("education-elite").collection("ScholarShip")
    const userCollection = client.db("education-elite").collection("users")
    const reviewsCollection = client.db("education-elite").collection("reviews")
    const paymentCollection = client.db("education-elite").collection("payment")
    const appliedScholarshipCollection = client.db("education-elite").collection("apply")
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCRSS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })
    // Logout
    app.post('/logout', async (req, res) => {
      const user = req.body;

      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })
    // ......................................................
    //......................all scholarship........................
    // app.get('/allScholarShip', async (req, res) => {
    //   const result = await ScholarShipCollection.find().toArray()
    //   res.send(result)
    // })

    app.get('/ScholarShip', async (req, res) => {
      const sort = req.query.sort

      let options = {}
      if (sort) options = { sort: { ApplicationFees: sort === 'asc' ? 1 : -1 } }
      const result = await ScholarShipCollection.find(options).toArray();
      res.send(result)
    })
    //................details......................

    app.get('/ScholarShip/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await ScholarShipCollection.findOne(query)
      res.send(result);
    })

    //.................................................................

    //.................................................................

    app.get('/ScholarShips', async (req, res) => {
      const result = await ScholarShipCollection.find().toArray()
      res.send(result)
    })


    app.get('/ScholarShips/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: {
          _id: 1, ScholarshipName: 1, TuitionFees: 1,
          ApplicationFees: 1, ServiceCharge: 1, UniversityName: 1, ScholarshipCategory: 1, SubjectCategorey: 1
        },
      };
      const result = await ScholarShipCollection.findOne(query, options)
      res.send(result);
    })
    //..................................................
    app.get('/allScholarship', async (req, res) => {
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const filter = req.query.filter
      const sort = req.query.sort
      let search = req.query.search

      search = `${search}`;


      let query = {
        ScholarshipName: { $regex: search, $options: 'i' },
      }
      if (filter) query.SubjectCategorey = filter
      let options = {}
      if (sort) options = { sort: { postDate: sort === 'asc' ? 1 : -1 } }
      const result = await ScholarShipCollection.find(query, options).skip(page * size).limit(size).toArray()

      res.send(result)
    })
    app.get('/ScholarshipCount', async (req, res) => {
      const filter = req.query.filter
      let search = req.query.search
      search = `${search}`;
      let query = {
        ScholarshipName: { $regex: search, $options: 'i' },
      }
      if (filter) query.SubjectCategorey = filter
      const count = await ScholarShipCollection.estimatedDocumentCount(query);
      // const count = await ScholarShipCollection.countDocuments(query);
      res.send({ count })
    })

    //..................................................
    app.post('/addScholarShip', async (req, res) => {
      const art = req.body;
      // console.log('properties', art)
      const result = await ScholarShipCollection.insertOne(art)
      res.send(result);
    })

    // update a job in db
    app.put('/ScholarShips/:id', async (req, res) => {
      const id = req.params.id
      const scholarShipsData = req.body
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...scholarShipsData,
        },
      }
      const result = await ScholarShipCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    app.delete('/ScholarShips/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await ScholarShipCollection.deleteOne(query)
      res.send(result)
    })


    //....................apply scholarship..............................


    app.get('/applyScholarShip', async (req, res) => {
      const result = await appliedScholarshipCollection.find().toArray()
      res.send(result)
    })

    app.post('/applyScholarShip', async (req, res) => {
      const art = req.body;
      // console.log('properties', art)
      const result = await appliedScholarshipCollection.insertOne(art)
      res.send(result);
    })

    //...................review...........................
    //....................review add ........................
    app.post('/reviews', async (req, res) => {
      const querie = req.body;
      const result = await reviewsCollection.insertOne(querie)
      res.send(result);
    })

    //..................... review show..........................


    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray()
      res.send(result)
    })
    app.delete('/reviews/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await reviewsCollection.deleteOne(query)
      res.send(result)
    })

    // ...............................users...................................

    app.put('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      const isExist = await userCollection.findOne(query)
      if (isExist) {
        if (user.status === 'Requested') {
          const result = await userCollection.updateOne(query, {
            $set: { status: user?.status },
          })
          return res.send(result)
        } else {
          return res.send(isExist)
        }
      }

      const options = { upsert: true }

      const updateDoc = {
        $set: {
          ...user,
          Timestamp: Date.now(),
        },
      }
      const result = await userCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await userCollection.findOne({ email })
      res.send(result)
    })
    // ...........................
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/update/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email }
      const updateDoc = {
        $set: { ...user, Timestamp: Date.now() },

      }
      const result = await userCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // .......................payments..........................
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],

      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // app.get('/payments/:email',verifyToken,async(req,res)=>{
    //   const query = {email:req.params.email}
    //   if(req.params.email !== req.decoded.email){
    //     return res.status(403).send({message:'forbidden access'})
    //   }
    //   const result = await paymentCollection.find(query).toArray();
    //   res.send(result)
    // })

    app.post('/payments', async (req, res) => {
      const payment = req.body
      const result = await paymentCollection.insertOne(payment)
      // console.log('payments info',payment);
      // const query = {_id:{
      //   $in:payment.cartIds.map(id => new ObjectId(id))

      // }};

      // const deleteResult = await paymentCollection.deleteMany(query)
      res.send({ result })
    })


    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})