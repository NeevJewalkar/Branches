import express from 'express';
import { addNode, connectNodes, removeNode, getNodeById, getNodes, editNode, deleteConnection } from './nodeHelper.js'
import { getSuggestions, getCompletion, describeLlmError } from './llmHelper.js'
import { getPublicSettings, updateSettings, resolveLlmConfig } from './settingsHelper.js'

const app = express();
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/nodes/getNodes', (req, res) => {
    res.send(getNodes());
});

app.post('/nodes/addNode', (req, res) => {
    let node = req.body
    let id = Date.now()
    node.id = id
    addNode(node)
    res.send({id})
})

app.post('/nodes/connectNodes', (req, res) => {
    let nodeIds = req.body
    connectNodes(nodeIds)
    res.send('Nodes connected successfully!')
})

app.post('/nodes/removeNode', (req, res) => {
    let nodeId = req.body
    removeNode(nodeId.id)
    res.send('Node removed successfully!')
})

app.post('/nodes/getNodeById', (req, res) => {
    let nodeId = req.body.id
    res.send(getNodeById(nodeId))
})

app.post('/nodes/editNode', (req, res) => {
    let nodeId = req.body.id
    let newContent = req.body.content
    editNode(nodeId, newContent)
    res.send('Node edited successfully!')
})

app.post('/nodes/deleteConnection', (req, res) => {
    let nodeId1 = req.body.nodeId1
    let nodeId2 = req.body.nodeId2
    deleteConnection(nodeId1, nodeId2)
    res.send('Connection deleted successfully!')
})

app.post('/nodes/extendNode', async (req, res) => {
    let nodeId = Number(req.body.id)
    let node = getNodeById(nodeId)
    let content = (node ? node.content : req.body.content || '').trim()
    if (!content) {
        res.status(400).send({ error: 'node has no content to extend' })
        return
    }
    try {
        let suggestions = await getSuggestions(content)
        if (suggestions.length === 0) {
            res.status(502).send({ error: 'the model returned no usable thoughts — try again' })
            return
        }
        res.send(suggestions)
    } catch (err) {
        console.error('extendNode failed:', err)
        let { status, message } = describeLlmError(err)
        res.status(status).send({ error: message })
    }
})

app.get('/settings', (req, res) => {
    res.send(getPublicSettings())
})

app.post('/settings', (req, res) => {
    res.send(updateSettings(req.body || {}))
})

app.post('/settings/test', async (req, res) => {
    let { baseURL, model, apiKey } = req.body || {}
    let config = resolveLlmConfig()
    try {
        let sample = await getCompletion({
            input: 'Reply with the single word: ok',
            baseURL: baseURL && baseURL.trim() ? baseURL.trim() : config.baseURL,
            model: model && model.trim() ? model.trim() : config.model,
            apiKey: apiKey && apiKey.trim() ? apiKey.trim() : config.apiKey,
        })
        res.send({ ok: true, sample: sample.trim() })
    } catch (err) {
        console.error('settings test failed:', err)
        let { status, message } = describeLlmError(err)
        res.status(status).send({ ok: false, error: message })
    }
})

// Bind to loopback only: the API (and the settings/key endpoints) must not be
// reachable from other devices on the network. Vite on :5173 is the LAN entry
// point and proxies /nodes and /settings to here.
app.listen(3000, '127.0.0.1', () => {
    console.log('branch server listening on http://127.0.0.1:3000');
});

/*

/nodes/getNodes
Returns all nodes

/nodes/addNode (POST)
{
    content: string,
    connections: [id of node],
}

/nodes/connectNodes (POST)
[id of node]

/nodes/removeNode (POST)
{"id": id of node}

/nodes/getNodeById (POST)
{"id": id of node}

/nodes/editNode (POST)
{"id": id of node, "content": new content}

/nodes/deleteConnection (POST)
{"nodeId1": id of node, "nodeId2": id of node}

/nodes/extendNode (POST)
{"id": id of node}
Returns: [{ "lens": "challenge" | "angle" | "extend", "content": string }]

/settings (GET)
Returns: { baseURL, model, hasKey, keySource, keyHint, defaults }

/settings (POST)
{ baseURL?, model?, apiKey?, clearKey? }  // empty apiKey keeps the existing one
Returns the updated public settings.

/settings/test (POST)
{ baseURL?, model?, apiKey? }             // optional overrides
Returns: { ok: true, sample } | error status { ok: false, error }

*/