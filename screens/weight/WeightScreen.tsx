import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { appColors, globalStyles, screenWidth } from '../../constants/globalStyles';
import { useAppSelector } from '../../hooks/hooks';
import { selectConnectedDevice } from '../../store/ble/bleSlice';
import { BleError, BleManager, Characteristic, Subscription } from 'react-native-ble-plx';
import { useToast } from 'native-base';
import bleServices from '../../constants/bleServices';
import { Buffer } from 'buffer';

const bleManager = new BleManager();
let MAX_WEIGHT = 2; // Maximum expected weight in kg. Used for visuals only
MAX_WEIGHT = MAX_WEIGHT*1000;

interface WeightWidgetProps {
    weight: number | null
}

const WeightWidget = (props: WeightWidgetProps) => {
    const { weight } = props;
    const [renderedWeight, setRenderedWeight] = useState<string>('');
    const [ratio, setRatio] = useState(0);
    const MAX_SIZE = screenWidth*0.8

    useEffect(() => {
        if (weight) {
            setRatio(weight / MAX_WEIGHT);
            setRenderedWeight(Math.round(weight).toString())
        }
        console.log(MAX_WEIGHT)
    }, [weight]);

    return (
        <View style={{
            alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(25,180,${ratio*255}, ${ratio})`,
            height: ratio*MAX_SIZE, width: ratio*MAX_SIZE, borderRadius: (ratio*MAX_SIZE)/2,
            minHeight: 20, minWidth: 20
        }}>
            <View style={{ ...globalStyles.div.centered, height: 30, width: 50, backgroundColor: appColors.primary, borderRadius: 5 }}>
                <Text style={{ ...globalStyles.text.p, color: 'white', textAlign: 'center' }}>{renderedWeight}g</Text>
            </View>
        </View>
    )
}

const WeightScreen = (props: { navigation: any }) => {
    const [weight, setWeight] = useState<number | null>(null)
    const device = useAppSelector(selectConnectedDevice);

    let weightMonitorSubscription: Subscription;

    const weightMonitorCallbackHandler = (bleError: BleError | null, characteristic: Characteristic | null) => {
        if (characteristic?.value){
            const res = Buffer.from(characteristic.value, 'base64').readFloatLE();
            setWeight(res*1000);
        }
    }

    useEffect(() => {
        if (device?.id) {
            console.log('Registered notification callback')
            weightMonitorSubscription = bleManager.monitorCharacteristicForDevice(device.id, bleServices.sample.SAMPLE_SERVICE_UUID, bleServices.sample.SAMPLE_LOAD_CELLS_CHARACTERISTIC_UUID, weightMonitorCallbackHandler)
        }

        // Remove characteristic monitoring subscriptions
        return function cleanupSubscriptions() {
            if (weightMonitorSubscription) {
                weightMonitorSubscription.remove();
            }
        };
    }, [props.navigation, device]);

    if (device?.id) {
        return (
            <View style={globalStyles.container.center}>
                {weight && <WeightWidget weight={weight}/>}
            </View>
        )
    }
    return (
        <View style={globalStyles.container.center}>
            <Text style={globalStyles.text.emptyText}>No device connected</Text>
        </View>
    );
};

export default WeightScreen;
