const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
require("dotenv").config();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// JWT-STEPS-2: CREATE JWT MIDDLEWARE
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorize user" });
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorize user" });
    }
    req.decoded = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("<h1>Server is Running..</h1>");
});

const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const DB = client.db("ARTICIO-DB");
    const studentsCollections = DB.collection("students");
    const instructorsCollections = DB.collection("instructors");
    const classesCollections = DB.collection("classes");

    // JWT-STEPS-1 CREATE A JWT TOKEN
    const secret = process.env.ACCESS_TOKEN_SECRET;
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, secret, { expiresIn: "1h" });
      res.send(token);
    });

    app.get("/students", verifyJWT, async (req, res) => {
      const result = await studentsCollections.find().toArray();
      res.send(result);
    });

    // logged in students
    app.post("/students", async (req, res) => {
      const studentsInfo = req.body;
      const query = { email: studentsInfo.email };
      const existingStudents = await studentsCollections.findOne(query);
      if (existingStudents) {
        return res.send({ message: "Students already registered..." });
      }
      const result = await studentsCollections.insertOne(studentsInfo);
      res.send(result);
    });

    // admin user info
    app.patch("/student/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await studentsCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructor user info
    app.patch("/student/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await studentsCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Students
    app.get("/classes", async (req, res) => {
      const result = await classesCollections
        .find()
        .sort({ Enrolled: -1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .toArray();
      res.send(result);
    });
    // Instructors
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollections
        .find()
        .sort({ enrolled: -1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
