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
    const selectedCollections = DB.collection("selected");

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

    // get all instructors
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const instructors = await studentsCollections.find(query).toArray();
      res.send(instructors);
    });

    // get data by role

    app.get("/students/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      if (req.decoded.email !== email) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorize user" });
      }
      const user = await studentsCollections.findOne(query);

      if (user?.role == "instructor") {
        const result = { instructor: user?.role == "instructor" };
        return res.send(result);
      }
      const result = { admin: user?.role == "admin" };
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

    // get all approved class
    app.get("/all-classes", verifyJWT, async (req, res) => {
      const result = await classesCollections.find().toArray();
      res.send(result);
    });
    // get all approved class
    app.get("/classes", async (req, res) => {
      const query = { status: "approve" };
      const result = await classesCollections.find(query).toArray();
      res.send(result);
    });
    // get All instructor Class
    app.get("/my-classes/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.send([]);
      }
      const query = { instructorEmail: email };
      const result = await classesCollections.find(query).toArray();
      res.send(result);
    });

    // update classes approve status
    app.patch("/classes/feedback/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const feedback = req.headers.feedback;
      // console.log(req.headers.feedback);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classesCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    // update classes approve status
    app.patch("/classes/approve/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      const result = await classesCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    // update classes approve status
    app.patch("/classes/deny/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "deny",
        },
      };
      const result = await classesCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get class
    app.get("/popular-classes", async (req, res) => {
      const result = await classesCollections
        .find()
        .sort({ Enrolled: -1 })
        .collation({ locale: "en_US", numericOrdering: true })
        .toArray();
      res.send(result);
    });

    // post class by instructor
    app.post("/classes", async (req, res) => {
      const classes = req.body;
      const result = await classesCollections.insertOne(classes);
      res.send(result);
    });

    // get all selected Class by email
    app.get("/selected/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await selectedCollections.find(query).toArray();
      res.send(result);
    });

    // save  selected class
    app.post("/selected", verifyJWT, async (req, res) => {
      const classId = req.body.classId;
      const query = { email: req.body.email, classId: classId };
      const existingData = await selectedCollections.find(query).toArray();
      const getClass = existingData.map((data) => data.classId == classId);

      if (getClass != [] && getClass[0] == true) {
        return res.send({ message: "class already added" });
      }
      const selected = req.body;
      const result = await selectedCollections.insertOne(selected);
      res.send(result);
    });

    // Instructors
    app.get("/popular-instructors", async (req, res) => {
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
