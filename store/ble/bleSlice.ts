import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { BleManager, Device } from 'react-native-ble-plx';
import { RootState } from '../store';
import { bleSliceInterface, connectDeviceByIdParams, NetworkState, toBLEDeviceVM } from './bleSlice.contracts';

const bleManager = new BleManager();
let device: Device;

const stopScan = () => {
    console.log('Stopping scan');
    bleManager.stopDeviceScan();
};

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

export const disconnectDevice = createAsyncThunk('ble/disconnectDevice', async (_, thunkAPI) => {
    console.log('Disconnecting')
    if (device) {
        const isDeviceConnected = await device.isConnected();
        if (isDeviceConnected) {
            console.log('Disconnecting device');
            await device.cancelConnection();
            return { isSuccess: true }
        }
        else {
            throw new Error('No device connected');
        }
    }
    else {
        throw new Error('Device is undefined.')
    }
});

const initialState: bleSliceInterface = {
    adapterState: 'Unknown',
    deviceConnectionState: { status: NetworkState.PENDING, error: '' },
    deviceScan: { devices: [], status: NetworkState.PENDING, error: '' },
    locationPermission: null,
    connectedDevice: null,
};

const bleSlice = createSlice({
    name: 'ble',
    initialState,
    reducers: {
        setAdapterState(state, action) {
            const { adapterState } = action.payload;
            state.adapterState = adapterState;
        },
        setLocationPermissionStatus(state, action) {
            const { status } = action.payload;
            state.locationPermission = status;
        },
        setConnectedDevice(state, action) {
            const { device } = action.payload;
            state.connectedDevice = device;
        },
        addScannedDevice(state, action) {
            const { device } = action.payload;
            const existingDevices = state.deviceScan.devices.filter(existingDevice => device.id !== existingDevice?.id);
            const updatedDevices = [device, ...existingDevices];
            const sorted = updatedDevices.sort((a, b) => {
                a.rssi = a.rssi || -100;
                b.rssi = b.rssi || -100;
                return a.rssi > b.rssi ? -1 : b.rssi > a.rssi ? 1 : 0;
            });
            state.deviceScan.devices = sorted;
        },
        clearScannedDevices(state, action) {
            state.deviceScan = { devices: [], status: NetworkState.PENDING, error: '' };
        },
        stopDeviceScan(state, action) {
            bleManager.stopDeviceScan();
        },
    },
    extraReducers(builder) {
        builder
            .addCase(connectDeviceById.pending, (state, action) => {
                state.deviceConnectionState.status = NetworkState.LOADING;
                state.deviceConnectionState.error = '';
            })
            .addCase(connectDeviceById.fulfilled, (state, action: any) => {
                state.deviceConnectionState.status = NetworkState.SUCCESS;
                const device = action.payload;
                state.connectedDevice = device;
            })
            .addCase(connectDeviceById.rejected, (state, action) => {
                if (action.error.message === NetworkState.CANCELED) {
                    state.deviceConnectionState.status = NetworkState.CANCELED;
                    state.deviceConnectionState.error = action.error.message;
                } else {
                    state.deviceConnectionState.status = NetworkState.ERROR;
                    state.deviceConnectionState.error = action.error.message ?? '';
                }
            })
            .addCase(disconnectDevice.pending, (state, action) => {
                state.deviceConnectionState.status = NetworkState.LOADING;
                state.deviceConnectionState.error = '';
            })
            .addCase(disconnectDevice.fulfilled, (state, action: any) => {
                state.deviceConnectionState.status = NetworkState.CANCELED;
                state.connectedDevice = null;
            })
            .addCase(disconnectDevice.rejected, (state, action) => {
                if (action.error.message === NetworkState.CANCELED) {
                    state.deviceConnectionState.status = NetworkState.CANCELED;
                    state.deviceConnectionState.error = action.error.message;
                } else {
                    state.deviceConnectionState.status = NetworkState.ERROR;
                    state.deviceConnectionState.error = action.error.message ?? '';
                }
                state.connectedDevice = null;
            })
        ;
    },
});

export default bleSlice.reducer;

export const { setAdapterState, setLocationPermissionStatus, setConnectedDevice, addScannedDevice, clearScannedDevices, stopDeviceScan } = bleSlice.actions;

export const selectAdapterState = (state: RootState) => state.ble.adapterState;
export const selectConnectedDevice = (state: RootState) => state.ble.connectedDevice;
export const selectScannedDevices = (state: RootState) => state.ble.deviceScan;
