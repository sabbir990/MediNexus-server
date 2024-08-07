const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p2btb5w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(express.json());
app.use(cors());



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

    const userCollection = client.db("mediNexus").collection("users");
    const medicineCollection = client.db("mediNexus").collection('medicines');
    const cartCollection = client.db("mediNexus").collection('cart')

    app.put('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
      // const isExists = await userCollection.findOne(query)
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          ...user,
          timeStamp: Date.now()
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc, options)
      res.send(result)
    })

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result)
    })

    app.post('/medicines', async (req, res) => {
      const medicine = req.body;
      const result = await medicineCollection.insertOne(medicine)
      res.send(result)
    })

    app.get('/medicines/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/medicine/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await medicineCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/medicine/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await medicineCollection.findOne(query);
      res.send(result)
    })

    app.patch('/medicine', async (req, res) => {
      const medicine = req.body;
      const filter = { _id: new ObjectId(medicine?._id) }
      const updatedDoc = {
        $set: {
          ...medicine
        }
      }
      const result = await medicineCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })


    app.get('/medicine-number', async (req, res) => {
      const result = await medicineCollection.find().toArray();
      res.send(result);
    })

    app.get('/medicine-by-category', async (req, res) => {
      const category = req.query.category;
      let query = {}
      if (category && category !== null) {
        query = {
          category: category
        }
      }

      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/cart', async (req, res) => {
      const medicine = req.body;
      const result = await cartCollection.insertOne(medicine);
      res.send(result);
    })

    app.get('/cart/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email }
      const result = await cartCollection.find(query).toArray();

      const groupedData = result?.reduce((accumulator, elements) => {
        const existingItem = accumulator.find(item => item.itemName === elements.itemName);
        if (existingItem) {
          existingItem.quantity += 1
        } else {
          accumulator.push({ ...elements, quantity: 1 })
        }
        return accumulator
      }, [])
      res.send(groupedData)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("My Assignment 12 server is running...")
})

app.listen(port, () => {
  console.log(`This server is running on port ${port}`)
})