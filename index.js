require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const cartCollection = client.db("mediNexus").collection('cart');
    const paymentCollection = client.db("mediNexus").collection('payments');
    const categoryCollection = client.db("mediNexus").collection('categories');
    const advertisementCollection = client.db("mediNexus").collection('advertisements')

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
      const medicine = req?.body;
      const result = await cartCollection.insertOne(medicine);
      res.send(result);
    })

    app.get('/cart/:email', async (req, res) => {
      const email = req.params.email;
      const query = { buyerEmail: email }
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

    app.delete('/cart/:itemName', async (req, res) => {
      const itemName = req.params.itemName;
      const query = { itemName: itemName };
      const result = await cartCollection.find(query).toArray();

      const itemToDelete = result[0];
      const id = itemToDelete._id;

      const deletionOperation = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(deletionOperation);
    })

    app.get('/selected-medicine/:itemName', async (req, res) => {
      const itemName = req.params.itemName;
      const query = { itemName: itemName };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { discountedPrice } = req.body;
        const amount = discountedPrice * 100;
        if (!discountedPrice || amount < 1) return

        const { client_secret } = await stripe.paymentIntents.create({
          amount: amount ? parseInt(amount) : 0,
          currency: "usd",
          // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.send({
          clientSecret: client_secret,
        });

      } catch (error) {
        res.send({
          success: false,
          error: error.message

        })
      }
    })

    app.post('/billing', async (req, res) => {
      const billing = req.body;
      const result = await paymentCollection.insertOne(billing);
      res.send(result)
    })

    app.get('/billing-details/:id', async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.send(result);
    })

    app.get('/categories', async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    })

    app.get('/medicines-by-category/:label', async (req, res) => {
      const label = req?.params?.label;
      const query = { category: label };
      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const findItem = await categoryCollection.findOne(query)
      const itemCategory = findItem?.label;
      const findInMedicineCollection = await medicineCollection.find({ category: itemCategory }).toArray();
      const findInCartCollection = await cartCollection.find({ category: itemCategory }).toArray()
      if (findInMedicineCollection) {
        const result = await medicineCollection.deleteMany({ category: itemCategory });
      }

      if (findInCartCollection) {
        const result = await cartCollection.deleteMany({ category: itemCategory });
      }

      const result = await categoryCollection.deleteOne(query);
      res.send(result)

    })

    app.post('/category', async (req, res) => {
      const category = req.body;
      const result = await categoryCollection.insertOne(category);
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.patch('/user/:id', async (req, res) => {
      const id = req.params.id;
      const role = req?.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role?.role
        }
      }

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    app.patch('/payment/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'paid'
        }
      }

      const result = await paymentCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { sellerEmail: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/admin-dashboard', async (req, res) => {
      const result = await paymentCollection.find({}, {
        projection: {
          paid_total: 1, status: 1, category: 1
        }
      }).toArray();

      const total = result.reduce((accumulator, item) => {
        return accumulator + item?.paid_total;
      }, 0)

      let pending = result.filter(item => item?.status === 'pending')
      let pendingTotal = pending.reduce((accumulator, item) => {
        const total = accumulator + item?.paid_total;
        return total
      }, 0)

      let paid = result.filter((item) => item?.status === 'paid');
      let paidTotal = paid.reduce((accumulator, item) => {
        const total = accumulator + item?.paid_total;
        return total
      }, 0)

      const categorySpecification = result?.reduce((accumulator, item) => {
        if (accumulator[item?.category]) {
          accumulator[item?.category] += item?.paid_total
        } else {
          accumulator[item?.category] = item?.paid_total
        }

        return accumulator
      })

      delete categorySpecification.category;
      delete categorySpecification.status;
      delete categorySpecification._id;
      delete categorySpecification.paid_total;

      const categoryArray = Object.entries(categorySpecification);

      // Add the header row
      categoryArray.unshift(["Category", "Total Paid"]);

      res.send({ total, pendingTotal, paidTotal, categorySpecification: categoryArray });


    })

    app.get('/seller-dashboard/:email', async (req, res) => {
      const email = req.params?.email;
      const query = { sellerEmail: email };
      const result = await paymentCollection.find(query, {
        projection: {
          paid_total: 1, status: 1, category: 1
        }
      }).toArray()

      const pending = result?.filter(item => item?.status === 'pending');
      const pendingTotal = pending?.reduce((accumulator, item) => {
        return accumulator + item?.paid_total
      }, 0)

      const paid = result.filter(item => item?.status === 'paid');
      const paidTotal = paid.reduce((accumulator, item) => {
        return accumulator + item?.paid_total
      }, 0)

      const total = result?.reduce((accumulator, item) => {
        return accumulator + item?.paid_total;
      }, 0)

      const categorySpecification = result?.reduce((accumulator, item) => {
        if (accumulator[item?.category]) {
          accumulator[item?.category] += item?.paid_total
        } else {
          accumulator[item?.category] = item?.paid_total
        }

        return accumulator
      }, {})

      delete categorySpecification.category;
      delete categorySpecification.status;
      delete categorySpecification._id;
      delete categorySpecification.paid_total;

      const categoryArray = Object.entries(categorySpecification);

      // Add the header row
      categoryArray.unshift(["Category", "Total Paid"]);

      res.send({total, pendingTotal, paidTotal, categorySpecification: categoryArray });
    })

    app.get('/dashboard-user/:email', async(req, res) => {
      const email = req.params.email;
      const query = {buyerEmail : email};
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/advertisement-medicines/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email : email};
      const result = await medicineCollection.find(query).toArray();
      res.send(result);
    })

    app.put('/advertisement-request', async(req, res) => {
      const advertisement = req.body;
      const filter = {itemName : advertisement?.itemName}
      const options = {upsert : true}
      const updatedDoc = {
        $set : {
          ...advertisement
        }
      }
      const result = await advertisementCollection.updateOne(filter, updatedDoc, options);
      res.send(result)
    })

    app.get("/all-advertisements", async(req, res) => {
      const result = await advertisementCollection.find().toArray();
      res.send(result);
    })

    app.patch('/add-advertisement/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
    
      try {
        const isAccepted = await advertisementCollection.findOne(filter);
    
        if (!isAccepted) {
          return res.status(404).send({ error: 'Advertisement not found' });
        }
    
        if (isAccepted.status === 'accepted') {
          await advertisementCollection.deleteOne(filter);
          return res.send({ message: 'Advertisement deleted' });
        }
    
        const updateDoc = {
          $set: { status: 'accepted' }
        };
    
        const result = await advertisementCollection.updateOne(filter, updateDoc);
    
        if (result.modifiedCount === 0) {
          return res.status(500).send({ error: 'Failed to update advertisement' });
        }
    
        res.send({ message: 'Advertisement updated successfully' });
    
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'An error occurred while processing your request' });
      }
    });
    

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