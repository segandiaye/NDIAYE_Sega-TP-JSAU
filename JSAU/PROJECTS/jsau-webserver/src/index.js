'use strict'

const express = require('express')
const cors = require('cors')
const app = express()
const methodOverride = require('method-override')
const fs = require('fs')
const morgan = require('morgan')
app.use(morgan('dev'))
const bodyParser = require('body-parser')
app.set('view engine', 'ejs')
const path = require('path')
const dirTree = require('directory-tree');

const util = require('util')
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

let fixtureData = require('./resource/data/d3.json');
app.locals.barChartHelper = require('./resource/js/bar_chart_helper');

const urlencodedParser = bodyParser.urlencoded({extended: true})

app.use('/', express.static(path.join(__dirname, '/resource/css')))
app.use('/', express.static(path.join(__dirname, '/resource/js')))
app.use('/', express.static(path.join(__dirname, '/resource/images')))

app.use(urlencodedParser)
app.use(methodOverride((req, res) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        let method = req.body._method
        delete req.body._method
        return method
    }
}))

app.use(cors())
app.options('*', cors())

let matiere = {
    name : '',
    id: 0
}
let smsModif = ''
let edit = false
let color = ''
let style = {
    style : 'style.css',
    d3 : 'd3.css',
    img : 'logo.jpg'
}

const my_shared_code_headless = require('./my_shared_code_headless')
let even_numbers = my_shared_code_headless.premiersNumbers(100)

app.get('/', (req, res) => {
    res.render(path.join(__dirname, '/resource/views/premiers.ejs'), {premiers : even_numbers, style})
})

let items = {
    path: '',
    name: '',
    children:[]
}

function listHtml(children) {
    return '<ul>' + children.map((node) =>
        '<li>' + node.name +
                    (node.type === 'file' ? '' : listHtml(node.children)) +
                '</li>'
    ).join('\n') +
            '</ul>';
}

app.get('/etc/ejs', (req, res) => {
    dirTree('../', {extensions:/\.ejs$/}, null, (item, PATH, stats) => {
        let data = []
        items.path = '/etc/ejs/'
        items.name = '/etc/ejs/'
        items.children = item.children
        data.push(items)
        let html = listHtml(data)
        res.send(html)
    });
})

app.get('/etc/json', (req, res) => {
    dirTree('../', {extensions:/\.json$/}, null, (item, PATH, stats) => {
        let data = []
        items.path = '/etc/json/'
        items.name = '/etc/json/'
        items.children = item.children
        data.push(items)
        let html = listHtml(data)
        res.send(html)
    });
})

app.get('/etc/js', (req, res) => {
    dirTree('../', {extensions:/\.js$/}, null, (item, PATH, stats) => {
        let data = []
        items.path = '/etc/js/'
        items.name = '/etc/js/'
        items.children = item.children
        data.push(items)
        let html = listHtml(data)
        res.send(html)
    })
})

app.get('/etc/html', (req, res) => {
    dirTree('../', {extensions:/\.html$/}, null, (item, PATH, stats) => {
        let data = []
        items.path = '/etc/html/'
        items.name = '/etc/html/'
        items.children = item.children
        data.push(items)
        let html = listHtml(data)
        res.send(html)
    })
})

app.get('/etc/css', (req, res) => {
    dirTree('../', {extensions:/\.css$/}, null, (item, PATH, stats) => {
        let data = []
        items.path = '/etc/css/'
        items.name = '/etc/css/'
        items.children = item.children
        data.push(items)
        let html = listHtml(data)
        res.send(html)
    })
})

app.get('/d3', (req, res) => {
    res.render(path.join(__dirname, '/resource/views/d3.ejs'), {fixtureData, style})
})

app.get('/info', (req, res) => {
    res.send('jsau-webserver-1.0.0')
})

app.get('/accueil', (req, res) => {
    edit = false
    color = ''
    smsModif = ''

    readFile('./src/resource/data/data.json', {encoding: 'utf8'})
        .then(JSON.parse)
        .then((obj) => {
            res.render(path.join(__dirname, '/resource/views/index.ejs'), {matieres:obj, matiere, smsModif, color, edit, style})
        })
        .catch((err) => {
        console.error("Some error occurred", err); // eslint-disable-line no-console
        })
})

app.post('/add', urlencodedParser, (req, res) => {
    color = ''
    readFile('./src/resource/data/data.json', {encoding: 'utf8'})
        .then(JSON.parse)
        .then((obj) => {
            let inc = 0
            if (obj.length > 0) {
                inc = obj[obj.length - 1].id + 1
            }
            matiere = {
                name : '' + req.body.name,
                id: inc
            }
            obj.push(matiere)
            let json = JSON.stringify(obj)
            color = 'color:green'
            smsModif = 'Opération éffectuée.'
            writeFile('./src/resource/data/data.json', json)
                .then(() => {
                    res.render(path.join(__dirname, '/resource/views/index.ejs'), {matieres:obj, matiere, smsModif, color, edit, style})
                })
                .catch((err) => {
                })
        })
        .catch((err) => {
        console.error("Some error occurred", err); // eslint-disable-line no-console
        })
})

app.get('/detail/:id', (req, res) => {
    color = ''
    edit = true
    color = ''
    smsModif = ''
    readFile('./src/resource/data/data.json', {encoding: 'utf8'})
        .then(JSON.parse)
        .then((obj) => {
            matiere = []
            for (let i = 0;i < obj.length;i++) {
                if (obj[i].id == req.params.id) {
                    matiere = obj[i]
                }
            }
            res.render(path.join(__dirname, '/resource/views/index.ejs'), {matieres : obj, matiere, smsModif, color, edit, style})
        })
        .catch((err) => {
        console.error("Some error occurred", err); // eslint-disable-line no-console
        })
})

app.put('/update/:id', urlencodedParser, (req, res) => {
    color = ''
    readFile('./src/resource/data/data.json', {encoding: 'utf8'})
        .then(JSON.parse)
        .then((obj) => {
            const requestId = req.params.id

            let matiere_ = obj.filter((matiere_) => {
                return matiere_.id == requestId
            })[0]

            const index = obj.indexOf(matiere_)

            const keys = Object.keys(req.body)

            keys.forEach((key) => {
                matiere_[key] = req.body[key]
            })
            obj[index] = matiere_
            color = 'color:green'
            smsModif = 'Modification éffectuée.'
            matiere = obj[index]
            let json = JSON.stringify(obj)
            writeFile('./src/resource/data/data.json', JSON.stringify(json))
                .then(() => {
                    edit = false
                    res.render(path.join(__dirname, '/resource/views/index.ejs'), {matieres : obj, matiere, smsModif, color, edit, style})
                })
                .catch((err) => {
                })
        })
        .catch((err) => {
        console.error("Some error occurred", err); // eslint-disable-line no-console
        })
})

app.delete('/delete/:id', (req, res) => {
    color = ''
    edit = false
    readFile('./src/resource/data/data.json', {encoding: 'utf8'})
        .then(JSON.parse)
        .then((obj) => {
            delete obj['' + req.params.id]
            obj.splice(obj.indexOf(null), 1)
            let json = JSON.stringify(obj)
            /*ECRITURE DANS LE FICHIER JSON*/
            writeFile('./src/resource/data/data.json', JSON.stringify(json))
                .then(() => {
                    color = 'color:green'
                    smsModif = 'Opération éffectuée.'
                    res.render(path.join(__dirname, '/resource/views/index.ejs'), {matieres:obj, matiere, smsModif, color, edit, style})
                })
                .catch((err) => {
                })
        })
        .catch((err) => {
        console.error("Some error occurred", err); // eslint-disable-line no-console
        })
})


app.listen(8083, () => {
})
