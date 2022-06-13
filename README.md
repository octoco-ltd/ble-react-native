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
- `hooks`
- `screens`
- `store`

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
├── hooks                      # Custom hooks
|
├── screens                    # Main app screens we navigate between
|
├── store                      # Redux store
|
├── package.json               # Node module dependencies
|
└── tsconfig.json              # TypeScript compiler options
```

It will be useful to define some styles that we use throughout the app. Create a new
file `globalStyles.ts` within the *constants* folder and paste the following code:

<div style="text-align: center; font-weight: bold">constants/globalSyles.ts</div>

```
// constants/globalSyles.ts
import { StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';

export const windowWidth = Dimensions.get('window').width;
export const windowHeight = Dimensions.get('window').height;
export const screenWidth = Dimensions.get('screen').width;
export const screenHeight = Dimensions.get('screen').height;
export const isSmallDevice = windowWidth < 400;

export const appColors = {
    primary: '#007FFF',
    primaryInactive: 'rgba(0,127,255,0.75)',
    secondary: '#99FFFF',
    error: '#fc6d47',
}

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

<div style="text-align: center; font-weight: bold">screens/weight/WeightScreen.tsx</div>

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

<div style="text-align: center; font-weight: bold">screens/weight/BLEScreen.tsx</div>

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
will consist of 2 bottom tabs, one for each screen. To set up our navigation stack, create
2 new files in the *navigation* folder with the following content:

<div style="text-align: center; font-weight: bold">navigation/AppStack.tsx</div>

```
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, Text } from 'react-native';
import { appColors, globalStyles } from '../constants/globalStyles';
import WeightScreen from '../screens/weight/WeightScreen';
import { Icon } from 'native-base';
import { MaterialIcons } from "@expo/vector-icons";
import BLEScreen from '../screens/ble/BLEScreen';

const Tab = createBottomTabNavigator();

const TabStack = () => {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{ headerShown: false, tabBarActiveBackgroundColor: appColors.primary, tabBarInactiveBackgroundColor: appColors.primaryInactive, tabBarHideOnKeyboard: true }}
            >
                <Tab.Screen
                    name={'weight'}
                    component={WeightScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) => {
                            return <Icon as={MaterialIcons} name="home" size={focused? 7 : 6} color={'white'}/>;
                        },
                        tabBarLabel: ({focused}) => {
                            return <Text style={{ color: 'white', fontSize: focused? 14 : 12, marginLeft: 10 }}>Weight</Text>;
                        }
                    }}
                />
                <Tab.Screen
                    name={'ble'}
                    component={BLEScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) => {
                            return <Icon as={MaterialIcons} name="bluetooth" size={focused? 7 : 6} color={'white'}/>;
                        },
                        tabBarLabel: ({focused}) => {
                            return <Text style={{ color: 'white', fontSize: focused? 14 : 12, marginLeft: 10 }}>BLE</Text>;
                        }
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
};

export const AppStack = () => {
    return (
        <SafeAreaView style={globalStyles.container.base}>
            <TabStack />
        </SafeAreaView>
    );
};
```

<div style="text-align: center; font-weight: bold">navigation/index.tsx</div>

```
import { NativeBaseProvider } from "native-base";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';
import { AppStack } from './AppStack';

export default function Providers() {
    return (
        <NativeBaseProvider>
            <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1 }}>
                    <AppStack />
                </SafeAreaView>
            </SafeAreaProvider>
        </NativeBaseProvider>
    )
}
```

The last step required to finish our navigation setup is to update the `App.tsx` file as 
follows:

<div style="text-align: center; font-weight: bold">App.tsx</div>

```
import 'expo-dev-client';
import Providers from './navigation';

export default function App() {
  return <Providers />
}
```

That's it! Now we can open our app with working navigation using the custom dev client
we have created, and it should look something like this:

<img src="guide/assets/screenshot_1.jpg" style="align-self: center" height="500">

#### Step 6: BLE Integration
Now - for the main event - we will integrate the app with the BLE device. To ensure we have
access to the BLE device from anywhere within the app, we will be managing the BLE 
connections using Redux. Create a new folder in the *store* directory named *ble* and within 
it create the BLE slice file `bleSlice.ts` and slice interface file `bleSlice.contracts.ts`.
I will explain some code snippets from our Redux implementation, but for now you can copy the 
full code for each file from the [GitHub repository](https://github.com/octoco-ltd/ble-react-native).
Ensure that you also create the actual store file, `store.ts`, within the *store* directory and also
copy the store configuration code from the repository.
Your *store* directory should now have the following structure, with the completed code:

```
.
├── store    
|   ├── bleSlice.contracts.ts         
│   └── bleSlice.ts           
└── store.ts                
```

Taking a look at the code in our `bleSlice.ts` file, we can see 3 `asyncThunks` (simply put, [thunks](https://redux-toolkit.js.org/api/createAsyncThunk) 
are the recommended way to implement async functions in our redux slices, which can be dispatched):

```
export const scanBleDevices = createAsyncThunk('ble/scanBleDevices', async (_, thunkAPI) => {
    try {
        bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
            if (error) {
                console.log('startDeviceScan error: ', error);
                throw new Error(error.toString());
            }
            if (scannedDevice && scannedDevice.name?.includes('BLE_SERVER')) {
                thunkAPI.dispatch(addScannedDevice({ device: toBLEDeviceVM(scannedDevice) }));
            }
        });
    } catch (error: any) {
        throw new Error(error.toString);
    }
});
```
The `scanBleDevices` function will start the `startDeviceScan` subscription, which return a BLE
device whenever it is detected. Thereafter, we compare the detected device name to our expected
BLE server name (BLE_SERVER) and dispatch `addScannedDevice` to add the device to our store,
along with other servers which may have the same name. 

```
export const connectDeviceById = createAsyncThunk('ble/connectDeviceById', async (params: connectDeviceByIdParams, thunkAPI) => {
    const { id } = params;

    try {
        stopScan();
        device = await bleManager.connectToDevice(id);
        const deviceChars = await bleManager.discoverAllServicesAndCharacteristicsForDevice(id);
        const services = await deviceChars.services();
        const serviceUUIDs = services.map(service => service.uuid);
        return toBLEDeviceVM({ ...device, serviceUUIDs });
    } catch (error: any) {
        throw new Error(error.toString);
    }
});
```

When the desired BLE device has been found, the `connectDeviceById` thunk may be dispatched by
providing the ID of the scanned device. This function handles pairing with the device, as well
as detecting all the characteristics and services we have programmed into our BLE server. 
Because Redux is designed to work with serializable data a mapper function, `toBLEDeviceVM`,
is used to extract the fields we are interested in before returning the object. The
`disconnectDevice` function simply disconnects the connected BLE device and resets the device 
state in the Redux store.

The final step to complete our Redux implementation is to wrap our application with the Redux 
store provider in the `navigation/index.tsx` file:

```
...
import store from '../store/store';
import { Provider } from 'react-redux';

export default function Providers() {
    return (
        <Provider store={store}>
            <NativeBaseProvider>
                ...
            </NativeBaseProvider>
        </Provider>
    )
}
```

To get the full benefits of TypeScript we will use 'typed' hooks, which we define in `hooks/hooks.ts`:

<div style="text-align: center; font-weight: bold">hooks/hooks.ts</div>

```
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../store/store';

// Use throughout app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

#### Step 7: The BLE component
To simplify device and permission management, we will create an 'invisible' component that we name
*BLEManager*. Even though this component will not have any visual elements, this component will 
still be mounted once the app starts and stays mounted regardless of which screen we navigate to.
Why do we need a component if we can't see it? Because we need certain functionality that can only
be implemented by a mounted React component. If we do this in one of our screens, we will lose that 
functionality once we navigate away from that screen. Of course, we can implement the required logic
on every screen, but this leads to unnecessary duplication and messy state management. By placing
this component in our `AppStack` at the same level as the `TabStack` this component will be mounted
when the app starts and remain mounted throughout navigation lifecycles. 

To explain this, let's implement the component and go through the code. In the *components* 
directory, create the folder *BLEManager* and file `BLEManager.tsx`

<div style="text-align: center; font-weight: bold">components/BLEManager/BLEManager.tsx</div>

```
// ==============================================
// Void top-level component to manage BLE devices
// ==============================================
import React, { useEffect, useState } from 'react';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { useAppDispatch, useAppSelector } from '../../hooks/hooks';
import {
    disconnectDevice,
    selectConnectedDevice,
    setAdapterState,
    setLocationPermissionStatus,
} from '../../store/ble/bleSlice';
import * as Location from 'expo-location';
import { useToast } from 'native-base';
import { globalStyles } from '../../constants/globalStyles';

const bleManager = new BleManager();
let device: Device;

const BLEManager = () => {
    const [subscriptions, setSubscriptions] = useState<Array<Subscription>>([]);
    const connectedDevice = useAppSelector(selectConnectedDevice);
    const dispatch = useAppDispatch();
    const toast = useToast();

    const disconnectCallback = () => {
        console.log('BLEManager: disconnectCallback triggered');
        if (connectedDevice) dispatch(disconnectDevice());
        toast.show({
            description: 'Disconnected from device',
            ...globalStyles.toast.default,
        });
    }

    const checkDevices = async () => {
        if (connectedDevice && !device) {
            console.log('BLEManager: Creating new device');
            device = await bleManager.connectToDevice(connectedDevice.id);
            const subscription = device.onDisconnected(disconnectCallback);
            setSubscriptions(prevState => [...prevState, subscription])
        }
    }

    // BLE Adapter State Manager
    useEffect(() => {
        const subscription = bleManager.onStateChange((state) => {
            dispatch(setAdapterState({ adapterState: state }));
            setSubscriptions(prevState => [...prevState, subscription])
        }, true);
        return function cleanup() {
            // Remove all subscriptions when manager unmounts
            subscriptions.map(_subscription => {
                _subscription.remove();
                return true;
            });
            setSubscriptions([]);
        };
    }, []);

    useEffect(() => {
        // Manage device connection changes
        checkDevices();
    }, [connectedDevice])

    // Permissions manager
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            dispatch(setLocationPermissionStatus({ status }));
        })();
    }, []);

    return null;
};

export default BLEManager;
```

The manager consists of 3 `useEffect` hooks. The first hook subscribes to the `bleManager.onStateChange`
event. This allows us to update the state of the BLE network adapter in our Redux store. Tracking this
state allows us to know, for example, whether bluetooth is available to make new connections.

The second hook is fired whenever there is a change in the connected device state in our Redux store,
such as when a device is connected or disconnected. This ensures that the device managed by the BLE
library is in sync with the device details we have stored in Redux.

The last hook checks whether the app has access to location permissions, a strict requirement for
BLE functionality, and ask the user for permissions if they do not exist. This also updates the
permissions state in the Redux store.

To use this component, simply place it in the `AppStack`:

<div style="text-align: center; font-weight: bold">navigation/AppStack.tsx</div>

```
...
export const AppStack = () => {
    return (
        <SafeAreaView style={globalStyles.container.base}>
            <BLEManager />
            <TabStack />
        </SafeAreaView>
    );
};
```