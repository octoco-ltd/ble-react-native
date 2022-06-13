# Building a BLE live data feed application with React Native and ESP32
## Overview
Getting started with a BLE project and don’t know where to start? Search no further.
In this code-along tutorial we will be developing a simple, yet thorough, BLE project
that will teach you everything you need to know in order to get started on your own
BLE projects with minimal effort. While keeping things simple and to the point, this 
guide will still apply best practices, ensuring you can easily scale and build upon what
you have learnt.

In this guide, we will be using an ESP32 microcontroller connected to an HX711 load cell
amplifier to collect our live data - however any other type of sensor can be used with 
minimal code adjustment. You can even do this tutorial without any external sensor and 
simply sample values from the ADC. For the mobile application, we will be using React 
Native (usingTypeScript) and the [react-native-ble-plx](https://dotintent.github.io/react-native-ble-plx/) 
library for bluetooth integration. A link to the GitHub repo containing the final React Native code and
C++ firmware is provided at the end of this article.

## Requirements
This guide will be kept as generic as possible to ensure that you can easily swap 
out components with whatever your project requirements are.
- ESP32-S3 (or any other BLE enabled MCU supported by the Arduino framework)
- Physical Android or iOS device (simulators are not supported)
- HX711 load cell amplifier with 4 load cells (Optional)

## System Architecture
A high level system architecture diagram is shown below. The diagram consists of a 
physical mobile device running our React Native application, connected to the ESP32 via 
a BLE connection. The ESP32 is connected to our load cell amplifier via an I2C connection
to sample our data and stream the reading to our application in real time.

![img.png](guide/assets/SystemArchitectureDiagram.png)

## ESP32 Bluetooth Server

## React Native Application
Now that we have our basic BLE server running, let's build our client React application.
For this project, we will be using Expo to manage our application. 

### Step 1: Initialize the project
To get started, create a new folder for the project and name it *ble-react-native*. You may
also use an alternative name if you wish.
Within this new folder, open a terminal or command window to initialize the project
using the official [Expo TypeScript template](https://docs.expo.dev/guides/typescript/#starting-from-scratch-using-a-typescript-template)
To do this, simply type `expo init -t expo-template-blank-typescript` in the terminal and
run the command. When prompted to give your project a name you can use any name that you 
prefer - for this project the name will be *ble-react-native*. 
Once the project is created, open the project folder in your IDE of choice.

### Step 2: Libraries
Because bluetooth functionality is not included within the Expo Go client by default,
we need to build our own development client to use BLE functionality - described
in the next section. The downside of this is that we need to rebuild the dev client
every time we add new native libraries. To avoid this, let's add all the libraries
that we will require before building the dev client. For this project we will be using
the following libraries:

#### [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx)
Library used to manage our BLE functionality.
```
expo add react-native-ble-plx @config-plugins/react-native-ble-plx expo-dev-client
```

#### [expo-location](https://docs.expo.dev/versions/latest/sdk/location/)
Location permissions are required to use BLE.
```
expo install expo-location
```

#### [React Navigation](https://reactnavigation.org/)
Used for our navigation and bottom tabs.
```
yarn add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
```
```
expo install react-native-screens react-native-safe-area-context
```

#### [react-redux](https://react-redux.js.org/)
For global state management.
```
yarn add react-redux @reduxjs/toolkit
```

#### Others
Finally, run the following to install the remaining libraries that we will use:
```
yarn add native-base
```
```
expo install react-native-svg
```

### Step 3: Create custom dev client
Typical development using the default Expo Go application from the app store will not
work for our BLE application, because the required bluetooth libraries are not shipped
with the Expo Go app. Therefore, we need to build our own custom dev client.
To get started, install the dev client library
```
expo install expo-dev-client
```
Now, add the import to the top of your `App.tsx` file:
```
import 'expo-dev-client';
```
Because the Expo ecosystem is rapidly evolving the further steps for creating our dev
client are deferred to the [official Expo documentation](https://docs.expo.dev/development/getting-started/). 
Simply follow the steps provided in the documentation according to your platform (iOS or Android).

### Step 4: Scaffolding 
Let's create some folders. Within the project root directory create the following folders, 
if they do not exist already:

- `components`
- `constants`
- `navigation`
- `screens`
- `store`
- `utilities`

Your project structure should now look similar to the tree below:
```
.
├── assets                     # Images, fonts, sounds and other assets
│
├── components                 # Components reused on different screens
|
├── constants                  # Main app screens we navigate between
|
├── navigation                 # React Navigation controllers
|
├── screens                    # Main app screens we navigate between
|
├── store                      # Redux store
|
├── utilities                  # App utility helpers
|
├── package.json               # Node module dependencies
|
└── tsconfig.json              # TypeScript compiler options
```

It will be useful to define some styles that we use throughout the app. Create a new
file `globalStyles.ts` within the *constants* folder and paste the following code:

```
import { StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';

export const windowWidth = Dimensions.get('window').width;
export const windowHeight = Dimensions.get('window').height;
export const screenWidth = Dimensions.get('screen').width;
export const screenHeight = Dimensions.get('screen').height;
export const isSmallDevice = windowWidth < 400;

export const containerStyles = StyleSheet.create({
    base: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    center: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    spacedBetween: {
        flex: 1,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});

export const divStyles = StyleSheet.create({
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    row: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flexDirection: 'row'
    }
});

export const toastStyles = {
    default: {
        width: windowWidth / 1.2,
        duration: 3000,
        bottom: -20,
    },
};

export const textStyles = StyleSheet.create({
    p: {
        fontSize: 14,
    },
    heading: {
        fontSize: isSmallDevice ? 22 : 28,
        fontWeight: 'bold'
    },
    error: {
        color: '#fc6d47',
        fontSize: 14,
    },
    emptyText: {
        marginVertical: 15,
        color: 'grey',
        fontSize: isSmallDevice ? 16 : 22,
        fontWeight: 'bold'
    }
});

export const cardStyles = StyleSheet.create({
    shadow: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 15,
        shadowColor: 'grey',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        paddingLeft: 14,
        paddingRight: 14,
        marginTop: 6,
        marginBottom: 6,
        marginLeft: 16,
        marginRight: 16,
    }
});

export const globalStyles = {
    card: {
        ...cardStyles,
    },
    container: {
        ...containerStyles,
    },
    div: {
        ...divStyles
    },
    text: {
        ...textStyles,
    },
    toast: {
        ...toastStyles,
    }
};

```

Now, on to our screens. This simple app will consist of 2 screens, in a bottom tab navigator:

- Weight: Display the current live weight reading
- BLE: Manage and connect to BLE device

Within the *screens* folder we now create 2 new folders for our screens: 
*weight* and *ble*. 

Starting with the weight screen, within the *weight* directory, create a file
`WeightScreen.tsx` and paste the following code:

```
import React from 'react';
import { Text, View } from 'react-native';
import { globalStyles } from '../../constants/globalStyles';

const WeightScreen = () => {
    return (
        <View style={globalStyles.container.spacedBetween}>
            <Text>WeightScreen</Text>
        </View>
    );
};

export default WeightScreen;
```

Similarly, for the BLE screen, within the *ble* directory create a file
`BLEScreen.tsx` and paste the following code:

```
import React from 'react';
import { Text, View } from 'react-native';
import { globalStyles } from '../../constants/globalStyles';

const BLEScreen = () => {
    return (
        <View style={globalStyles.container.spacedBetween}>
            <Text>BLEScreen</Text>
        </View>
    );
};

export default BLEScreen;
```

#### Step 5: Navigation
Now that we have a basic skeleton for our app, we can set up the navigation. The navigator
will consist of 2 bottom tabs, one for each screen. Create a new file, `index.tsx`, in 
the *navigation* folder.