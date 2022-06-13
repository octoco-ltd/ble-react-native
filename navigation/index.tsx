import { NativeBaseProvider } from "native-base";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';
import { AppStack } from './AppStack';
import store from '../store/store';
import { Provider } from 'react-redux';

export default function Providers() {
    return (
        <Provider store={store}>
            <NativeBaseProvider>
                <SafeAreaProvider>
                    <SafeAreaView style={{ flex: 1 }}>
                        <AppStack />
                    </SafeAreaView>
                </SafeAreaProvider>
            </NativeBaseProvider>
        </Provider>
    )
}