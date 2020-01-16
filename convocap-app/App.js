import React from 'react';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

import HomeScreen from './components/HomeScreen';
import SettingsScreen from './components/SettingsScreen';

const AppNavigator = createStackNavigator({
  Home: {
    screen: HomeScreen
  },
  Settings: {
    screen: SettingsScreen
  },
}, 
{
  headerMode: 'none',
});

const AppContainer = createAppContainer(AppNavigator);

export default class App extends React.Component{
  render() {
    return <AppContainer />;
  }
}
