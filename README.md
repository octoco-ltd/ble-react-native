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
To start this project, we will write the firmware for our BLE server. Because this guide
is intended to be generic, I will not go into too much detail regarding the sensor used
(HX711 load cell amplifier). The focus will be on the implementation of the BLE server.
Feel free to use any other sensor you have available. Alternatively, you can also simply
sample the ADC input if you do not have other sensors available.

### BLE Theory
If this is your first BLE project I highly recommend learning some basic theoretical concepts
of BLE and how it works. A basic understanding of BLE theory will greatly assist you when 
following this guide. There are many BLE learning resources available, depending on which
level of depth you want to learn. For the purposes of this guide the 
[Introduction to Bluetooth Low Energy](https://learn.adafruit.com/introduction-to-bluetooth-low-energy?view=all)
post by Adafruit should give you enough insight. I also highly recommend the 
[BLE C++ Guide](https://github.com/nkolban/esp32-snippets/blob/master/Documentation/BLE%20C%2B%2B%20Guide.pdf)
by Neil Kolban, the author of the library we will be using. This guide will give some
more insights into the BLE implementation from a firmware perspective, as it will be done in this
guide.

### Step 1: Hardware Setup
For a detailed guide on setting up the load cells, please refer to the
[Load Cell Amplifier HX711 Breakout Hookup Guide](https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide)
provided by SparkFun. The only thing to note for this guide is that the
sensor 'CLK' and 'DAT' pins will be connected to GPIO pins 4 and 5 respectively.
Feel free to use any other suitable pin and change the pin numbers in the upcoming code 
accordingly.

### Step 2: IDE Setup and Libraries
For simplicity the firmware is implemented in the Arduino IDE, however you may use any
IDE of your choice. The firmware has also been successfully implemented in PlatformIO.
The external libraries required for this project, other than the HX711 library used in the
load cell guide linked earlier, is the [ESP 32 Arduino](https://github.com/nkolban/ESP32_BLE_Arduino)
by Neil Kolban. To use this library, in the Arduino IDE, select *Tools -> Manage Libraries...*
and search for *bledevice*. Then install the library by Neil Kolban:
![img.png](guide/assets/arduino_ide_ble.png)


### Step 3: Firmware
In the Arduino IDE create a new project: *ble-firmware.ino* (or *ble-firmware.cpp* for PlatformIO) and 
include the required libraries:

```
//=========================
// Libraries
//=========================
#include <Arduino.h>
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <HX711.h>
#include <Wire.h>
```

Our BLE server will only be transmitting weight data, therefore only 1 service is required, the 
'SAMPLE_SERVICE', which relates to our sampling data. The only data we are sampling is a weight 
measurement. Therefore, we only have a single characteristic for our sampling service - the load
cell sampling characteristic 'SAMPLE_LOAD_CELLS'. You can use an online 
[UUID generation tool](https://www.uuidgenerator.net/) to generate any two UUID values for the 
service and characteristic. In this guide we will use the following values, which you can add to your
code if you're following along, below the libraries:

```
// ...
//=========================
// Compiler Constants
//=========================
// SAMPLE Service
#define SAMPLE_SERVICE_UUID "cb0f22c6-1000-4737-9f86-1c33f4ee9eea"
#define SAMPLE_LOAD_CELLS_CHARACTERISTIC_UUID "cb0f22c6-1001-41a0-93d4-9025f8b5eafe"
```

Next, we define some global variables (refer to the code comments for clarity):
```
// ...
//=========================
// Device Instantiations
//=========================
// HX711 Load Cell Amplifier
HX711 scale;

//=========================
// Global Variables
//=========================
float calibration_factor = -24000; // Follow the SparkFun guide to get this value
bool client_is_connected = false; // Only sample when a client is connected
// Load Cell Amplifier Pins. You can change this to match your setup
const int HX711_DOUT = GPIO_NUM_5;
const int HX711_CLK = GPIO_NUM_4;
// BLE Server
BLEServer *pServer; 
// Characteristics: Load Cells
BLECharacteristic *loadCellCharacteristic;

//=========================
// State Machine Flags
//=========================
bool load_cell_sampling_enabled = false; // Only sample the load cells if a client requested
```

To optimize power usage and performance, we define some flags which we will use in a 
state machine in our loop code. For example, we use the `client_is_connected` flag
to track when a client connects/disconnects. When no client is connected the device
should remain in an idle state. When a client connects and requests notifications
on our load cell sampling service the `load_cell_sampling_enabled` flag is enabled,
indicating to our state machine that the load cell amplifier should be sampled and
the BLE notifications should be triggered.

Now, some configuration/setup is required to get everything working.
Let's start with the BLE server. We need to initialize the BLE server on our device
with a server name, create the server and then define a basic server callback which
is triggered whenever a device connects and disconnects to our server:

```
void setupBLEServer(void)
{
  BLEDevice::init("BLE_SERVER");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BaseBLEServerCallbacks());
}
```

We write the callback function for the server events by extending the base
`BLEServerCallbacks` class provided by the BLE library:

```
class BaseBLEServerCallbacks : public BLEServerCallbacks
// Callback triggered when a client device connects or disconnects
{
  void onConnect(BLEServer *pServer)
  {
    client_is_connected = true;
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer *pServer)
  {
    client_is_connected = false;
    Serial.println("Device disconnected");
    // Restart advertising
    pServer->getAdvertising()->start();
  }
};
```

As seen in the code, the `client_is_connected` flag is toggled depending on device
connection status using this callback.

With our server initiated, we can define the services and characteristics. We require 
only a single sampling service containing the load cell sampling characteristic. The 
characteristic will have a 'read' property (for manually requesting samples) as well as
a 'notify' property which is used to provide realtime samples to the app. Whenever
the 'notify' property is used, it is also important to assign a 'Client Characteristic 
Configuration Descriptor' (CCCD) to that characteristic. The CCCD is an unsigned integer
value which, amongst other things, is used to determine whether a client is subscribed
to a notifier. We will later use this descriptor value to toggle load cell sampling.

```
void setupSampleService(void)
{
  BLEService *sampleService = pServer->createService(SAMPLE_SERVICE_UUID);

  // Weight/Load Cell Sample Characteristic
  loadCellCharacteristic = sampleService->createCharacteristic(
      SAMPLE_LOAD_CELLS_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_NOTIFY);
  loadCellCharacteristic->setCallbacks(new SampleLoadCellCallback());
  loadCellCharacteristic->setValue("PENDING");

  // -- create CCC descriptors for notification service and listener callbacks --
  // Load Cell CCC descriptor
  BLEDescriptor *pLoadCellCCCDescriptor = new BLEDescriptor((uint16_t)0x2902);
  pLoadCellCCCDescriptor->setCallbacks(new LoadCellDescriptorCallback());
  loadCellCharacteristic->addDescriptor(pLoadCellCCCDescriptor);

  sampleService->start();
}
```

The final step in setting up our BLE server is to set up and start the advertising.
We will not be setting any custom advertisement data, but feel free to add some
advertisement data to your own project:

```
void setupAdvertisementData(void)
{
  BLEAdvertising *pAdvertising = pServer->getAdvertising();
  BLEAdvertisementData advertisementData;
  // Set properties of advertisement data
  pAdvertising->setAdvertisementData(advertisementData);
  pAdvertising->start();
}
```

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

The manager consists of three `useEffect` hooks. The first hook subscribes to the `bleManager.onStateChange`
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

#### Step 8: Completing the BLE Screen
Now that the brunt of the work is done for managing BLE connectivity we can start implementing the BLE
screen.

## Resources
### React Native GitHub Repository:
https://github.com/octoco-ltd/ble-react-native.git

