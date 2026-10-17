import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NODE_FILE = join(__dirname, 'nodes', 'nodes.json')

let nodes = JSON.parse(fs.readFileSync(NODE_FILE, 'utf8')).nodes

/*

Node: {
    id: unique number,
    content: string,
    connections: [id of node],
}

*/

let updateNodeFile = (nodes) => {
    fs.writeFileSync(NODE_FILE, JSON.stringify({nodes}, null, 2))
}

let addNode = (node) => {
    nodes.push(node)
    updateNodeFile(nodes)
}

let connectNodes = (nodeIds) => {
    for (let i = 0; i < nodeIds.length; i++) {
        let node = nodes.find(node => node.id === nodeIds[i])
        // add all other nodeIds to the connections array except the current node
        node.connections = node.connections.concat(nodeIds.filter(id => id !== node.id))

        // check for duplicates and remove them
        node.connections = node.connections.filter((value, index, self) => self.indexOf(value) === index)
    }
    updateNodeFile(nodes)
}

let removeNode = (nodeId) => {
    let nodeIndex = nodes.findIndex(node => node.id === nodeId)
    nodes.splice(nodeIndex, 1)
    updateNodeFile(nodes)
}

let getNodeById = (nodeId) => {
    return nodes.find(node => node.id === nodeId)
}

let getNodes = () => {
    return nodes
}

let editNode = (nodeId, newContent) => {
    let node = nodes.find(node => node.id === nodeId)
    node.content = newContent
    updateNodeFile(nodes)
}

let deleteConnection = (nodeId1, nodeId2) => {
    // delete connection for both the nodes
    let node1 = nodes.find(node => node.id === nodeId1)
    let node2 = nodes.find(node => node.id === nodeId2)
    node1.connections = node1.connections.filter(id => id !== nodeId2)
    node2.connections = node2.connections.filter(id => id !== nodeId1)

    updateNodeFile(nodes)
}

export {
    addNode,
    connectNodes,
    removeNode,
    getNodeById,
    getNodes,
    editNode,
    deleteConnection
}