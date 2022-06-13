import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, Text } from 'react-native';
import { appColors, globalStyles } from '../constants/globalStyles';
import WeightScreen from '../screens/weight/WeightScreen';
import { Icon } from 'native-base';
import { MaterialIcons } from "@expo/vector-icons";

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
                    component={WeightScreen}
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