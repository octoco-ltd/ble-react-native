import { configureStore, combineReducers, AnyAction } from '@reduxjs/toolkit';

import bleSlice from './ble/bleSlice';

const combinedReducer = combineReducers({
    ble: bleSlice,
});

const rootReducer = (state: any, action: AnyAction) => {
    return combinedReducer(state, action);
};

const store = configureStore({
    reducer: rootReducer,
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
