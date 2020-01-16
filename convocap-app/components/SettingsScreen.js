import React from 'react';
import {
  Text,
  View,
  Dimensions,
  Image,
  TouchableOpacity,
  Picker,
} from 'react-native';
import LogScreen from './LogScreen';
import ModalDropdown from 'react-native-modal-dropdown';
import Dialog, { ScaleAnimation } from 'react-native-popup-dialog';

export default class SettingsScreen extends React.Component {
  constructor(props) {
    super(props);
    const { navigation } = this.props;
    this.state = ({
      selectedLanguageTo: navigation.getParam('languageTo', 'english'),
      selectedLanguageFrom: navigation.getParam('languageFrom', 'english'),
      loggingPermission: navigation.getParam('loggingPermission', false),
      id: navigation.getParam('devID', 0),
      showLogs: false,
    });
  }

  setLanguageFrom(lang) {
    const newLanguage = lang;
    this.setState({
      selectedLanguageFrom: newLanguage
    })

    console.log(newLanguage);
  }

  setLanguageTo(lang) {
    const newLanguage = lang;
    this.setState({
      selectedLanguageTo: newLanguage
    })
  }

  renderLogs() {
    if (!this.state.loggingPermission) return;

    fetch('https://us-central1-convocapp-29bc1.cloudfunctions.net/retrieveLogs', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        id: this.state.id
      })
    })
    .then(res => {
      if (!res.ok) throw Error(res.statusText)
      return res.json()
    })
    .then(data => {
      this.setState({
        logs: data,
        showLogs: true,
      })
    })
    .catch(error => {
      console.log('local error', error);
    })
  }

  hideLogScreen() {
    this.setState({
      showLogs: false
    });
  }

  render() {
    const { navigate } = this.props.navigation;
    const logStatus = this.state.loggingPermission ? 'enabled' : 'disabled';
    const logAccess = this.state.loggingPermission ? (
      <TouchableOpacity
        onPress={() => this.renderLogs()}
      >
        <Text style={{ fontSize: 17, fontWeight: '300', marginLeft: 52, marginTop: 20 }}>
          View Logs
        </Text>
      </TouchableOpacity>
    ) : null;
  
    return(
      <View>
        <TouchableOpacity
          onPress={() => navigate('Home', {
            newLanguageFrom: this.state.selectedLanguageFrom,
            newLanguageTo: this.state.selectedLanguageTo,
            loggingPermission: this.state.loggingPermission
          })}
        >
          <Image
            source={
              require('../assets/images/delete-button.png')
            }
            style={{
              width: Dimensions.get('window').height * 0.09,
              height: Dimensions.get('window').height * 0.09,
              marginLeft: 30,
              marginTop : 30,
            }}
          />
        </TouchableOpacity>
        <Text style={{
            textAlign: 'center',
            fontSize: 32,
            fontWeight: '900',
          }}
          >
            Settings
            {'\n'}
        </Text>
        <View style={{flexDirection: 'row'}}>
          <Text style={{ marginLeft: 50, fontSize: 27, fontWeight: '700' }}> Language</Text>
          <ModalDropdown
            options={['english', 'francais', 'espanol']}
            style={{ marginLeft: 50, marginTop: 5 }}
            onSelect={(idx, value) => this.setLanguageFrom(value)}
            dropdownTextStyle={{fontSize: 20, fontWeight: '500'}}
            textStyle={{ fontSize: 20, fontWeight: '500' }}
            defaultValue={this.state.selectedLanguageFrom}
          />
          <Text style={{ marginLeft: 30, marginTop: 5, fontSize: 20, fontWeight: '500'}}> to </Text>
          <ModalDropdown
            options={['english', 'francais', 'espanol']}
            style={{marginLeft: 30, marginTop: 5}}
            onSelect={(idx, value) => this.setLanguageTo(value)}
            dropdownTextStyle={{ fontSize: 20, fontWeight: '500' }}
            textStyle={{ fontSize: 20, fontWeight: '500' }}
            defaultValue={this.state.selectedLanguageTo}
          />
        </View>
        <View style={{ height: 50 }} />
        <TouchableOpacity
          onPress={() => this.setState({ loggingPermission: !this.state.loggingPermission }) }
        >
          <Text style={{ marginLeft: 50, fontSize: 27, fontWeight: '700' }}> Conversation Logging: {logStatus} </Text> 
        </TouchableOpacity>
        {logAccess}
        <Dialog
          visible={this.state.showLogs}
          onTouchOutside={() => {
            this.setState({ showLogs: false });
          }}
          dialogAnimation={new ScaleAnimation({
            initialValue: 0,
            useNativeDriver: true,
          })}
          height={Dimensions.get('window').height * 0.9}
          width={Dimensions.get('window').width * 0.8}
        >
          <LogScreen
            hide={this.hideLogScreen.bind(this)}
            data={this.state.logs}
          />
        </Dialog>
      </View>
    );
  }
}