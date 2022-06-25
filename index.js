import express, { json } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";

const app = express();
app.use(cors(), express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("projeto12-batepapo-uol-api-mongo");
});

app.post("/participants", async (request, response) => {
    const schema = Joi.object({
        name: Joi.string()
            .required()
            .alphanum()
    });
    const { error } = schema.validate(request.body);
    const user = await db.collection("users").findOne({name: request.body.name});

    if (error) {
        response.sendStatus(422);
        return;
    };
    if (user) {
        response.sendStatus(409);
        return
    };

    const name = request.body.name;
    const time = dayjs().format("HH:mm:ss");
    const participant = {name: name, lastStatus: Date.now()};
    const date = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time};

    try {
        await db.collection("users").insertOne(participant);
        await db.collection("menssages").insertOne(date);
        response.sendStatus(201);
    } catch (error) {
        response.status(500).send(error);
    };
});

app.get("/participants", async (request, response) => {
    let users;

    try {
        users = await db.collection("users").find().toArray();
        response.send(users);
    } catch (error) {
        response.status(500).send(error);
    };
});

app.post("/messages", async (request, response) => {
    const time = dayjs().format("HH:mm:ss");
    const data = {...request.body, from: request.headers.user};
    const existingUser = await db.collection("users").findOne({name: request.headers.user});
    const schema = Joi.object({
        to: Joi.string().required().min(1),
        text: Joi.string().required().min(1),
        type: Joi.string().valid("message", "private_message").required(),
        from: Joi.string().required().valid(existingUser.name)
    });
    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
        response.sendStatus(422);
        return;
    };

    let message = {...data, time: time}
    try {
        await db.collection("menssages").insertOne(message);
        response.sendStatus(201)
    } catch (error) {
        response.status(500).send(error);
    };
});






app.listen(5000);