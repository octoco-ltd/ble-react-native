import * as Location from 'expo-location';

export enum NetworkState {
    PENDING="PENDING",
    LOADING="LOADING",
    SUCCESS="SUCCESS",
    ERROR="ERROR",
    CANCELED="CANCELED"
}

export interface IBLEDevice {
    serviceUUIDs: Array<string>;
    isConnectable: boolean;
    overflowServiceUUIDs: Array<string>;
    txPowerLevel: string;
    serviceData?: any;
    manufacturerData?: any;
    name: string;
    mtu: number;
    rssi: string;
    solicitedServiceUUIDs: Array<string>;
    localName: string;
    id: string;
    _manager?: any;
}

export const toBLEDeviceVM = (device: any) => {
    const result = {
        serviceUUIDs: device.serviceUUIDs,
        isConnectable: device.isConnectable,
        overflowServiceUUIDs: device.overflowServiceUUIDs,
        txPowerLevel: device.txPowerLevel,
        serviceData: device.serviceData,
        manufacturerData: device.manufacturerData,
        name: device.name,
        mtu: device.mtu,
        rssi: device.rssi,
        solicitedServiceUUIDs: device.solicitedServiceUUIDs,
        localName: device.localName,
        id: device.id,
    };
    return result;
};

export interface IDeviceConnectionState {
    status: NetworkState;
    error: string;
}

export interface IDeviceScan {
    devices: Array<IBLEDevice | null>;
    status: NetworkState;
    error: string;
}

export interface connectDeviceByIdParams {
    id: string
}

export type IAdapterState =
/**
 * The current state of the manager is unknown; an update is imminent.
 */
    | 'Unknown'
    /**
     * The connection with the system service was momentarily lost; an update is imminent.
     */
    | 'Resetting'
    /**
     * The platform does not support Bluetooth low energy.
     */
    | 'Unsupported'
    /**
     * The app is not authorized to use Bluetooth low energy.
     */
    | 'Unauthorized'
    /**
     * Bluetooth is currently powered off.
     */
    | 'PoweredOff'
    /**
     * Bluetooth is currently powered on and available to use.
     */
    | 'PoweredOn';

export interface bleSliceInterface {
    adapterState: IAdapterState;
    deviceConnectionState: IDeviceConnectionState;
    deviceScan: IDeviceScan;
    locationPermission: Location.LocationPermissionResponse['status'] | null;
    connectedDevice: IBLEDevice | null;
}
