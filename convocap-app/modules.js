import { ScreenOrientation } from 'expo';
import { Audio } from 'expo-av';  
import * as firebase from 'firebase';
import 'firebase/firestore';


export async function changeScreenOrientation() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
}

export const fetchBlob = uri => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      resolve(xhr.response);
    };
    xhr.onerror = function() {
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadRecording(blob, name) {
  const ref = firebase
    .storage()
    .ref()
    .child(name);
  const snapshot = await ref.put(blob);
  return snapshot.ref.getDownloadURL();
}

export const recordingOptions = {
  // android not currently in use. Not getting results from speech to text with .m4a
  // but parameters are required
  android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
  },
  ios: {
      extension: '.wav',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
      IncludeBase64: true,
      MeteringEnabled: true,
  },
};

