const functions = require('firebase-functions');
const { Translate } = require('@google-cloud/translate').v2;
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

  exports.transcribeAudio = functions.https.onRequest((req, res) => {
    try {
      transcribe(req.body.link)
      .then(data => {
        return data;
      })
      .then(text => {
        // eslint-disable-next-line promise/always-return
        const result = JSON.stringify({
          transcript: text
        })
        return res.status(200).send(result);
      })
      .catch(error => {
        console.log(error);
        return res.status(400).end();
      })
    } catch(e) {
      console.log(e);
    }
  });

  exports.translateFile = functions.https.onRequest((req, res) => {
    try {
      translateText(req.body.text, req.body.target)
      .then(text => {
        const result = JSON.stringify({
          transcript: text
        })

        return res.status(200).send(result);
      })
      .catch(e => {
        console.log(e);
        return res.status(400).end();
      })
    } catch(e) {
      console.log(e);
      return res.status(400).end();
    }
  })

  async function transcribe(filePath) {
    // Imports the Google Cloud client library
    const speech = require('@google-cloud/speech');
    const fs = require('fs');
   
    // Creates a client
    const client = new speech.SpeechClient();
   
    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const audio = {
      uri: filePath,
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 44100,
      languageCode: 'en-US',
    };
    const request = {
      audio: audio,
      config: config,
    };
   
    // Detects speech in the audio file
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    return transcription;
  }

async function translateText(text, target) {
  const translate = new Translate();
  const textToTranslate = text;
  const languageTo = target //Also pass as arg

  const [translation] = await translate.translate(textToTranslate, languageTo);

  return translation;
}

exports.uploadLogFile = functions.https.onRequest((req, res) => {
  const logText = req.body.text;
  const devID = req.body.id;
  let path = db.collection('users').doc(devID);
  path.get()
  .then(result => {
    if (result.exists === false) { //user not in db
      path.create({
        logs: [
          logText
        ]
      });
      return res.status(200).end();
    } else {
      let logs = result.data().logs;
      logs.unshift(logText);
      path.update({
        logs: logs
      });

      return res.status(200).end();
    }
  })
  .catch(e => {
    console.log(e);

    return res.status(400).end();
  })
})

exports.retrieveLogs = functions.https.onRequest((req, res) => {
  const devID = req.body.id;
  let path = db.collection('users').doc(devID);
  path.get()
  .then(result => {
    if (result.exists === false) {
      const logs = JSON.stringify({
        logs: ['no logs yet. Your conversations will appear here once you start using ConvoCap !']
      })

      return res.status(200).send(logs);
    } else {
      const logs = JSON.stringify({
        logs: result.data().logs
      })

      return res.status(200).send(logs);
    }
  })
  .catch(error => {
    console.log(e);
    return res.status(400).end();
  })

})