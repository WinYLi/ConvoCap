import React from 'react';
import { fetchBlob, uploadRecording, recordingOptions, changeScreenOrientation } from '../modules.js';
import { View, TouchableOpacity, Image, Dimensions, Platform, Text } from 'react-native';

import ApiKeys from '../constants/ApiKeys';
import * as firebase from 'firebase';
import 'firebase/firestore';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import Dialog, { ScaleAnimation } from 'react-native-popup-dialog';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import { Audio } from 'expo-av';
import InfoScreen from './InfoScreen';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default class HomeScreen extends React.Component {

  constructor(props) {
    super(props);
    changeScreenOrientation();
    this.state = ({
      hasCameraPermission: false,
      cameraOn: false,
      showInfoScreen: false,
      showSettingsScreen: false,
      isRecording: false,
      transcription: '',
      manualStop: false,
      id: Constants.installationId,
      finishConversation: false,
    });

    this.uriQueue = [];
    this.recordingQueue = [];
    this.busyFetch = false;
    this.iterations = 0;

    if (!firebase.apps.length) {
      firebase.initializeApp(ApiKeys.FirebaseConfig);
    }
  }

  componentWillMount() {
    this.askCameraPermission();
  }

  async askCameraPermission() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  hideInfoScreen() {
    changeScreenOrientation()
    .then(
      this.setState({ showInfoScreen: false })
    );
  }

  hidenSettingsScreen() {
    this.setState({ showSettingsScreen: false });
  }

  decideMicAction() {
    if (this.state.isRecording) {
      this.recordStop();
      this.setState({ manualStop: true, isRecording: false });
      this.setState({ finishConversation: true });
    } else {
      this.setState({ manualStop: false, transcription: '' })
      this.recordingQueue = [];
      this.iterations = 0;
      this.recordBegin();
    }
  }

  checkRecordingState() {
    return this.state.manualStop
  }

  recordBegin = async() => {
    const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING); //Check that we have record permission
    if (status !== 'granted') { console.log('recording not allowed'); return; } //Should display some error message here

    this.setState({ isRecording: true }) //Prevent other actions from happening

    await Audio.setAudioModeAsync({ //Option stuff for both platforms
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: true,
    });
    let manualStop = this.checkRecordingState();
    this.iterations = 0;
    while (!manualStop) {
      this.recordingQueue.push(new Audio.Recording()); //Start recording
      try { //Recording begins
          await this.recordingQueue[this.iterations].prepareToRecordAsync(recordingOptions);
          await this.recordingQueue[this.iterations].startAsync();
      } catch (error) {
          console.log(error);
          this.cleanUpConversation();
      }
      await sleep(1500);
      await this.recordingQueue[this.iterations].stopAndUnloadAsync();
      this.recordStop();
      manualStop = this.checkRecordingState();
      this.iterations++;
    }
  }

  recordStop = async () => {
    //this.setState({ isRecording: false });
    try {
        this.transcribeAudio();
    } catch (error) {
        //Nothing should happen here
    }
  }

  deleteRecordingFile = async (recordingURI) => {
      try {
          await FileSystem.deleteAsync(recordingURI);
      } catch(error) {
          console.log("There was an error deleting recording file", error);
      }
  }

  uniqueString() {
    return Math.random().toString(36).substr(2, 9);
  }

  transcribeAudio = async() => {
    this.setState({ isFetching: true }) //Prevent other things from happening
    this.busyFetch = true;
    try {
      const recordingLocation = await FileSystem.getInfoAsync(this.recordingQueue[this.iterations].getURI()); //Path to recording
      const recordingURI = Platform.OS === 'ios' ? recordingLocation.uri.replace('file://', '') : recordingLocation.uri //remove prefix for ios
      this.uriQueue.push(recordingURI);
      const blobAudio = await fetchBlob(this.uriQueue.pop()); //make blob
      let unique_ID = this.uniqueString();
      const fileName = unique_ID.toString() + '.wav';
      const fileLink = 'gs://convocapp-29bc1.appspot.com/' + fileName;
      const downloadURL = await uploadRecording(blobAudio, fileName); //upload blob to firebase storage
      blobAudio.close();
      fetch('https://us-central1-convocapp-29bc1.cloudfunctions.net/transcribeAudio', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          link: fileLink,
        })
      })
      .then(res => {
        if (!res.ok) throw Error(res.statusText)
        return res.json();
      })
      .then(data => {
        console.log(data.transcript)
        this.setState({
          transcription: this.state.transcription + ' ' + data.transcript,
        });
        this.deleteRecordingFile(recordingLocation.uri)
        .then(() => {
          this.setState({ isFetching: false })
          const conversationEnd = this.state.finishConversation;
          if (conversationEnd) {
            this.cleanUpConversation();
            this.setState({ finishConversation: false });
          }
        })
      })
      .catch(error => {
        console.log('local error', error);
      })
    } catch(error) {
      console.log('something went wrong with the transcribe...', error);
    }
    this.busyFetch = false;
  }

  translateText = async(target, source) => {
    fetch('https://us-central1-convocapp-29bc1.cloudfunctions.net/translateFile', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        text: this.state.transcription,
        target: target,
        source: source
      })
    })
    .then(res => {
      if (!res.ok) throw Error(res.statusText)
      return res.json();
    })
    .then(data => {
      console.log(data.transcript)
      this.setState({
        transcription: data.transcript,
      });
    })
    .catch(error => {
      console.log('local error', error);
    })
  }

  cleanUpConversation = async() => {
    const { navigation } = this.props;
    const languageFrom = navigation.getParam('newLanguageFrom', 'english');
    const languageTo = navigation.getParam('newLanguageTo', 'english');
    if (languageTo !== languageFrom) {
      console.log('need to translate whole thing');
      await this.translateText(languageTo[0] + languageTo[1], languageFrom[0] + languageFrom[1]);
      this.uploadToFirebase();
    } else {
      this.uploadToFirebase();
    }
  }

  uploadToFirebase() {
    const { navigation } = this.props;
    if (!navigation.getParam('loggingPermission', false)) return;

    const newLogText = this.state.transcription;
    const devID = Constants.installationId;
    fetch('https://us-central1-convocapp-29bc1.cloudfunctions.net/uploadLogFile', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        text: newLogText,
        id: devID
      })
    })
    .then(res => {
      if (!res.ok) throw Error(res.statusText)
    })
    .catch(error => {
      console.log('local error', error);
    })
  }

  render() {

    const { hasCameraPermission } = this.state;
    const { navigate } = this.props.navigation;
    if (hasCameraPermission && this.state.cameraOn) {
      return (
        <View style={{
          backgroundColor: 'black',
          flex: 1
        }}
        >
          <Camera
            style={{
              flex: 1,
              backgroundColor: 'transparent'  
            }}
            type={this.state.cameraType}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }} >
              { this.renderTopFlexBox(navigate) }
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flex: 1 }} >
              { this.renderBottomFlexBox() }
            </View>
            
            { this.renderPopUp() }
          </Camera>
        </View>
      );
    }
    else {
      return (
        <View style={{
          backgroundColor: 'black',
          flex: 1
        }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }} >
            { this.renderTopFlexBox(navigate) }
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flex: 1 }} >
            { this.renderBottomFlexBox() }
          </View>
          
          { this.renderPopUp() }
        </View>
      );
    }
  }

  renderCameraToggle() {
    if(this.state.cameraOn) {
      return(
        <Image
          source={
            require('../assets/images/cameraToggled.png')
          }
          style={{
            width: Dimensions.get('window').width * 0.2,
            height: Dimensions.get('window').height * 0.09,
            marginTop : 30,
          }}
        />
      );
    }
    else {
      return(
        <Image
          source={
            require('../assets/images/noCamera.png')
          }
          style={{
            width: Dimensions.get('window').width * 0.2,
            height: Dimensions.get('window').height * 0.09,
            marginTop : 30,
          }}
        />
      );
    }
  }

  renderTopFlexBox(navigate) {
    const { navigation } = this.props;
    return(
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
        <TouchableOpacity
          onPress={() => navigate('Settings', {
            languageFrom: navigation.getParam('newLanguageFrom', 'english'),
            languageTo: navigation.getParam('newLanguageTo', 'english'),
            loggingPermission: navigation.getParam('loggingPermission', false),
            devID: this.state.id
          })}
        >
          <Image
            source={
              require('../assets/images/settings_white.png')
            }
            style={{
              width: Dimensions.get('window').height * 0.09,
              height: Dimensions.get('window').height * 0.09 ,
              marginLeft: 30,
              marginTop : 30,
            }}
        />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => this.setState(prevState => ({ cameraOn: !prevState.cameraOn }))}
        >
          { this.renderCameraToggle() }
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => this.setState({ showInfoScreen: true })}
        >
          <Image
            source={
              require('../assets/images/information_white.png')
            }
            style={{
              width: Dimensions.get('window').height * 0.09,
              height: Dimensions.get('window').height * 0.09,
              marginRight: 30,
              marginTop : 30,
            }}
        />
        </TouchableOpacity>
      </View>
    );
  }

  renderBottomFlexBox() {

    return(
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flex: 1 }} >
        <TouchableOpacity
          onPress={() => this.decideMicAction()}
        >
          <Image
                source={
                  require('../assets/images/speech.png')
                }
                style={{
                  width: Dimensions.get('window').height * 0.2,
                  height: Dimensions.get('window').height * 0.2,
                  marginLeft : 30,
                }}
          />
        </TouchableOpacity>
        <Text
          adjustsFontSizeToFit
          style={{
            color: 'white',
            marginLeft: 30,
            marginRight: 50,
            fontSize: 34,
            fontWeight: '700',
          }}
        >
          {this.state.transcription}
        </Text>
      </View>
    );
  }

  renderPopUp() {
    const { navigation } = this.props;
    return(
      <Dialog
        visible={this.state.showInfoScreen}
        onTouchOutside={() => {
          this.setState({ showInfoScreen: false });
        }}
        dialogAnimation={new ScaleAnimation({
          initialValue: 0,
          useNativeDriver: true,
        })}
        height={Dimensions.get('window').height * 0.9}
        width={Dimensions.get('window').width * 0.8}
      >
        <InfoScreen
          hide={this.hideInfoScreen.bind(this)}
          fromLanguage={navigation.getParam('newLanguageFrom', 'english')}
          toLanguage={navigation.getParam('newLanguageTo', 'english')}
        />
      </Dialog>
    );
  }

}
