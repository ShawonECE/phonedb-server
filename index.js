const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();

app.use(cors(
  {
    origin: ['http://localhost:5173', 'https://phonedb-c4301.web.app'],
    credentials: true
  }
));
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5yhhqym.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("phoneDB");
const coll = db.collection("phones");
const collOrders = db.collection("orders");

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.send({message: 'no token provided'});
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({message: 'token error'});
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // await client.connect();

    app.post('/jwt', async (req, res) => {
      const user = req.body.user;
      const token = jwt.sign({ data: user }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log(token);
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
      }).send({success: true});
    });

    app.post('/', async (req, res) => {
        const result = await coll.insertOne(req.body);
        res.send(result);
    });
    app.post('/order', async (req, res) => {
      const result = await collOrders.insertOne(req.body);
      res.send(result);
    });

    app.get('/', async (req, res) => {
      res.send('Welcome to phoneDB');
    });

    app.get('/phones', async (req, res) => {
        const result = await coll.find({}).toArray();
        res.send(result);
    });

    app.get('/orders', verifyToken, async (req, res) => {
      if (req.query.email !== req.user.data) {
        return res.status(403).send({message: 'Forbidden'});
      }
      const query = {userEmail: req.query.email};
      const result = await collOrders.find(query).toArray();
      res.send(result);
  });

    app.get('/phones/:id', async (req, res) => {
        const id = new ObjectId(req.params.id);
        const result = await coll.findOne({_id: id});
        res.send(result);
    });

    app.delete('/delete/:id', async (req, res) => {
        const id = new ObjectId(req.params.id);
        const result = await coll.deleteOne({_id: id});
        res.send(result);
    });

    app.put('/update/:id', async (req, res) => {
        const id = new ObjectId(req.params.id);
        const data = req.body;
        const updateDoc = {
            $set: {
              price: data.price,
              features: data.features
            },
        };
        const result = await coll.updateOne({_id: id}, updateDoc, {upsert: true});
        res.send(result);
    });
    
  } 
  finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port);