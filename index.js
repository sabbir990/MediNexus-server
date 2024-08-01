const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion } = require('mongodb');
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
    
    const userCollection = client.db("mediNexus").collection("users")

    app.put('/user', async(req, res) => {
        const user = req.body;
        const query = {email :  user?.email}
        // const isExists = await userCollection.findOne(query)
        const options = {upsert : true}
        const updatedDoc = {
            $set : {
                ...user,
                timeStamp : Date.now()
            }
        }
        const result = await userCollection.updateOne(query, updatedDoc, options)
        res.send(result)
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