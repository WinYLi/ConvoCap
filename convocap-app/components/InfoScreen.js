import React from 'react';
import {
  Text,
  Button,
  TouchableOpacity,
  View
} from 'react-native';

export default class InfoScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = ({
      infoText: {
        'english' : 'ConvoCap is an accessibility app that provides instant captioning to facilitate communication for hard-of-hearing users and for cross-lingual conversationists.',
        'francais' : 'ConvoCap est une application utilitaire qui donne accès au sous-titrage instantané pour faciliter la communication pour les malentendants et les voyageurs',
        'espanol' : 'ConvoCap es una aplicación de accesibilidad que proporciona subtítulos instantáneos para facilitar la comunicación para usuarios con problemas de audición y para conversadores multilingües.'
      },
      instructionsText: {
        'english': 'This page uses the \'Translate From\' language to quickly inform others about the purpose of this app.',
        'francais': 'Cette page utilise la langue «Traduire depuis» pour informer rapidement les autres de l\'objectif de cette application.',
        'espanol': 'Esta página utiliza el lenguaje \'Traducir desde\' para informar rápidamente a otros sobre el propósito de esta aplicación.'
      }
    });
  }

  render() {
    return(
      <View>
        <Text style={{
          textAlign: 'center',
          fontWeight: '700',
          fontSize: 24,
          marginTop: 30,
        }}>
          {this.state.infoText[this.props.fromLanguage]}
        </Text>
        <View style={{ height: 50 }} />
        <TouchableOpacity
          onPress={() => this.props.hide() }
        >
          <Text style={{
            fontSize: 30,
            fontWeight: '700',
            textAlign: 'center'
          }}>
            OK
          </Text>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center',
            margin: 10,
            bottom: -70,
            textAlignVertical: 'bottom',
          }}>
          {this.state.instructionsText[this.props.toLanguage]}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }
}