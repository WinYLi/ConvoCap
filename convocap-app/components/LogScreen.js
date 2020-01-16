import React from 'react';
import {
  Text,
  View,
  Button,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export default class LogScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let key = 0
    return(
      <View style={{flex: 1}}>
        <ScrollView>
          {this.props.data.logs.map(log => {
            key++;
            return (
              <Text key={key}>
                {log}
              </Text>
            )
          })}
        </ScrollView>
        <TouchableOpacity
          onPress={() => this.props.hide()}>
          <Text style={{fontSize: 20, fontWeight: '500', textAlign: 'center', marginBottom: 40}}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}