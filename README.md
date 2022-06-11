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
Native (usingTypeScript) and the [react-native-ble-plx](https://dotintent.github.io/react-native-ble-plx/) library for bluetooth integration. 
A link to the GitHub repo containing the final React Native code and C++ firmware is 
provided at the end of this article.

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

### Step 2 Scaffolding 
Let's create some folders. 