import express from "express";
import swaggerUi from "swagger-ui-express";
import bodyParser from "body-parser";
import morgan from "morgan";

import { accessLogStream } from './logger';
import { SecretManager } from './manager';

import schema from "./schema.json";

const projectId = process.argv[2];
if (!projectId) {
    console.error("Error : GCP project required")
}

const manager = new SecretManager(projectId);

const app = express();
app.use(morgan("combined", {stream: accessLogStream}))
app.use(bodyParser.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(schema));

app.get('/secrets', async (req, res) => {
    const secrets = await manager.listSecrets();
    if (!secrets) {
        res.status(403).json({
            "message": "Unable to retrieve secrets from project."
        })
        return
    }
    res.status(200).json(secrets)
});

app.post('/secrets', async (req, res) => {
    if (!req.body.name || !req.body.value) {
        res.status(400).json({
            "message": "Invalid secret input."
        });
        return
    }
    const secret = await manager.createSecret(req.body.name, req.body.value);
    if (!secret) {
        res.status(403).json({
            "message": "Unable to create secret in project."
        })
        return
    }
    res.status(201).json(secret);
});

app.get('/secrets/:name', async (req, res) => {
    if (!req.params.name) {
        res.status(400).json({
            "message": "Secret name is required."
        })
        return
    }
    const secret = await manager.getSecret(req.params.name);
    if (!secret) {
        res.status(404).json({
            "message": "Secret not found."
        })
        return
    }
    res.status(200).json(secret);
});

app.put('/secrets/:name', async(req, res) => {
    if (!req.params.name) {
        res.status(400).json({
            "message": "Secret name is required."
        })
        return
    }
    if (!req.body.value) {
        res.status(400).json({
            "message": "Invalid secret value."
        });
        return
    }
    const secret = await manager.updateSecret(req.params.name, req.body.value);
    if (!secret) {
        res.status(403).json({
            "message": "Unable to update secret in project."
        })
        return
    }
    res.status(200).json(secret);
})

app.delete('/secrets/:name', async (req, res) => {
    if (!req.params.name) {
        res.status(400).json({
            "message": "Secret name is required."
        })
        return
    }
    const done = await manager.deleteSecret(req.params.name);
    if (!done) {
        res.status(403).json({
            "message": "Unable to delete secret in project."
        })
        return
    }
    res.status(204).send()
})

app.listen(8080, () => {
    console.log('Listening on port: 8080')
});