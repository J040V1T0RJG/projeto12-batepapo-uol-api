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

let name;

app.post("/participants", async (request, response) => {
    const schema = Joi.object({
        name: Joi.string()
            .required()
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

    name = request.body.name;
    const time = dayjs().format("HH:mm:ss");
    const participant = {name: name, lastStatus: Date.now()};
    const date = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time};

    try {
        await db.collection("users").insertOne(participant);
        await db.collection("messages").insertOne(date);
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
    name = request.headers.user;
    const time = dayjs().format("HH:mm:ss");
    const data = {...request.body, from: request.headers.user};
    const existingUser = await db.collection("users").findOne({name: name});
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
        await db.collection("messages").insertOne(message);
        response.sendStatus(201)
    } catch (error) {
        response.status(500).send(error);
    };
});
let messagesArray = []
app.get("/messages", async (request, response) => {
    let messages = [];
    const limit = parseInt(request.query.limit);

    messagesArray = await db.collection("messages").find({$or: [
                                                                {to: "Todos"},
                                                                {to: name},
                                                                {from: name}
                                                            ]}).toArray(); 
    if (limit) {
        if (limit >= messagesArray.length) {
            messages = [...messagesArray]
        } else {
            for(let i = messagesArray.length - limit; i <= messagesArray.length - 1; i++) {
            messages.push(messagesArray[i])
            }
        };
    } else {
        messages = [...messagesArray]
    };
    
    response.send(messages)
});

app.post("/status", async (request, response) => {
    name = request.headers.user;
    const existingUser = await db.collection("users").findOne({name: name});

    if (!existingUser) {
        response.sendStatus(404);
        return;
    };

    try {
        await db.collection("users").updateOne({name: name}, {$set: {lastStatus: Date.now()} });
        response.sendStatus(200);
    } catch (error) {
        response.status(500).send(error);
    }
});

setInterval(removeUser, 15000);

async function removeUser () {
    const time = dayjs().format("HH:mm:ss");

    try {
        const { value } =  await db.collection("users").findOneAndDelete({lastStatus: {$lt: Date.now() - 10000 }})

        if (value) {
            await db.collection("messages").insertOne({from: value.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time})
        }
    } catch (error) {
        response.status(500).send(error);
    };
};


///// quando coloquei as funcoes, o time parou de funcionar, a mensagem que eu digitei não aparecia mais
/*
async function findUser (username) {
    const existingUser = await db.collection("users").findOne({name: username});
    return existingUser;
};
*/

/*
function nowTime () {
    const time =  dayjs().format("HH:mm:ss")
    return time;
};
*/

app.listen(5000);