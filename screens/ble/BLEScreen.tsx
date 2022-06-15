import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { appColors, globalStyles, windowWidth } from '../../constants/globalStyles';
import PrimaryButton from '../../components/button/PrimaryButton';
import { useAppDispatch, useAppSelector } from '../../hooks/hooks';
import {
    connectDeviceById, scanBleDevices,
    selectAdapterState,
    selectConnectedDevice,
    selectScannedDevices, stopDeviceScan
} from '../../store/ble/bleSlice';
import { IBLEDevice } from '../../store/ble/bleSlice.contracts';
import { Icon, useToast } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

interface DeviceItemProps {
    device: IBLEDevice | null
}

const DeviceItem = (props: DeviceItemProps) => {
    const { device } = props;
    const [isConnecting, setIsConnecting] = useState(false);
    const connectedDevice = useAppSelector(selectConnectedDevice)
    const dispatch = useAppDispatch();

    const toast = useToast();

    const connectHandler = async () => {
        if (isConnecting) return;
        if (device?.id){
            setIsConnecting(true);
            const result = await dispatch(connectDeviceById({ id: device?.id }))
            if (result.meta.requestStatus === 'fulfilled') {
                toast.show({
                    description: 'Connection successful',
                    ...globalStyles.toast.default,
                });
            }
            else if (result.meta.requestStatus === 'rejected') {
                toast.show({
                    description: 'Connection unsuccessful',
                    ...globalStyles.toast.default,
                });
            }
            setIsConnecting(false);
        }
        else {
            toast.show({
                description: 'Connection unsuccessful (No ID)',
                ...globalStyles.toast.default,
            });
        }
    }

    return (
        <TouchableOpacity style={{ ...globalStyles.card.shadow, width: windowWidth*0.8, backgroundColor: (connectedDevice?.id === device?.id)? 'green' : 'white' }} onPress={connectHandler}>
            <Text style={{ ...globalStyles.text.p, paddingVertical: 10 }}>{device?.name}</Text>
        </TouchableOpacity>
    )
}

const BLEScreen = () => {
    const [buttonText, setButtonText] = useState('Start Scan');
    const [isScanning, setIsScanning] = useState(false);
    const [iconName, setIconName] = useState('bluetooth-disabled');
    const [stateText, setStateText] = useState('');
    const bleDevice = useAppSelector(selectConnectedDevice);
    const adapterState = useAppSelector(selectAdapterState);
    const scannedDevices = useAppSelector(selectScannedDevices).devices;
    const toast = useToast();
    const dispatch = useAppDispatch();

    const scanPressHandler = () => {
        if (isScanning) {
            dispatch(stopDeviceScan({}));
            setIsScanning(false);
            setButtonText('Start Scan');
        }
        else if (adapterState.toLowerCase() === 'poweredon') {
            dispatch(scanBleDevices());
            setIsScanning(true);
            setButtonText('Stop Scan');
        }
        else {
            toast.show({
                description: stateText,
                ...globalStyles.toast.default,
            });
        }
    }

    useEffect(() => {
        if (bleDevice) {
            setIconName('bluetooth-connected');
            setStateText('Connected');
            dispatch(stopDeviceScan({}));
            setIsScanning(false);
            setButtonText('Start Scan');
        }
        else if (isScanning) {
            setStateText('Scanning...')
        }
        else {
            switch (adapterState.toLowerCase()) {
                case 'poweredoff':
                    setIconName('bluetooth-disabled');
                    setStateText('Bluetooth Disabled');
                    break;
                case 'poweredon':
                    setIconName('bluetooth');
                    setStateText('Ready To Connect');
                    break;
                default:
                    setStateText(adapterState);
                    setIconName('bluetooth-disabled');
                    break;
            }
        }
    }, [adapterState, bleDevice, isScanning]);

    return (
        <View style={globalStyles.container.spacedBetween}>
            <View style={globalStyles.card.shadow}>
                <View style={globalStyles.div.row}>
                    <Text style={{ ...globalStyles.text.p, color: appColors.primary }}>{stateText}</Text>
                    <Icon as={MaterialIcons} name={iconName} color={appColors.primary} size={7}/>
                </View>
            </View>
            {(scannedDevices?.length > 0) &&
                <Text style={{ ...globalStyles.text.p, color: 'grey', textAlign: 'center' }}>Select a device below to connect.</Text>
            }
            <FlatList
                style={{ height: '100%' }}
                contentContainerStyle={{ width: '100%', justifyContent: 'center' }}
                data={scannedDevices}
                renderItem={({ item }) => (
                    <DeviceItem device={item} />
                )}
                />
            <PrimaryButton text={buttonText} style={{ marginBottom: 10 }} onPress={scanPressHandler} loading={isScanning} />
        </View>
    );
};

export default BLEScreen;
