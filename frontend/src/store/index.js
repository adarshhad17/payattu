import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import personsReducer from './personsSlice';
import koduthathReducer from './koduthathSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    persons: personsReducer,
    koduthath: koduthathReducer,
  },
});
