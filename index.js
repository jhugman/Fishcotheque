const path = require('path');
const express = require('express');
const multer  = require('multer');
const string = require('string');
const promisify = require('promisify-node');

const fs = promisify('fs');
const rimraf = promisify('rimraf');

const upload = multer({ dest: 'uploads/' });
const mediaDirName = 'media';
const creatureUpload = upload.fields([
    { 
        name: 'src', maxCount: 1 
    }, { 
        name: 'media', maxCount: 24 
    }
]);

const app = express();

function checkCreatureDirectory(subPath) {
    return fs.stat(subPath).catch((err) => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }).then((stats) => {
        if (stats && stats.isDirectory()) {
            // Remove media
            return rimraf(path.join(subPath, mediaDirName)).then(() => {
                console.log('removed media');
                return {isOverwritten: true}
            });
        }

        return fs.mkdir(subPath).then(() => {
            console.log('made dir');
            return {isOverwritten: false}
        });
    });
}

function storeFiles(req, res, next) {
    console.log(req.body, req.files);

    const creatureId = req.body['creature-id'];
    const brainFileDescriptor = req.files.src[0];
    const mediaFileDescriptors = req.files.media;

    if(!creatureId || !brainFileDescriptor || !mediaFileDescriptors) {
        return res.send('Error: You must give your creature a name, a brain, and at least one image');
    }

    const creatureDirname = string(creatureId).slugify().s;
    const subPath = path.join(__dirname, 'creatures', creatureDirname);

    checkCreatureDirectory(subPath).then((results) => {
        console.log(brainFileDescriptor, subPath, results);

        fs.rename(path.join('uploads', brainFileDescriptor.filename), path.join(subPath, 'brain.js'))
            .then(next)
            .catch((err) => { 
                console.error('Error creating brain for ' + creatureId, err);
                res.status(500).end();
            });
    }).catch((err) => {
        console.error('Error checking creature directory.', err);
        res.status(500).end();
    });
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/uploads.html');
});

app.post('/upload-creature', creatureUpload, storeFiles, (req, res, next) => {
    res.send('<h1>Thanks!</h1><p><a href="/">Back to upload page</a></p>');
})

app.listen(4000, () => {
    console.log('listening on port http://127.0.0.1:4000');
});