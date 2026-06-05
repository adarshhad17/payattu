import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';
import { updatePersonInList } from './personsSlice';

export const fetchKoduthath = createAsyncThunk('koduthath/fetchByPerson', async (personId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/koduthath/${personId}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load entries');
  }
});

export const addKoduthath = createAsyncThunk('koduthath/add', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.post('/koduthath', payload);
    dispatch(updatePersonInList(data.person));
    return data.entry;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add entry');
  }
});

export const deleteKoduthath = createAsyncThunk('koduthath/delete', async (id, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await api.delete(`/koduthath/${id}`);
    if (data.person) dispatch(updatePersonInList(data.person));
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete entry');
  }
});

const koduthathSlice = createSlice({
  name: 'koduthath',
  initialState: { entries: [], loading: false, error: null },
  reducers: {
    clearKoduthathError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKoduthath.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchKoduthath.fulfilled, (state, action) => { state.loading = false; state.entries = action.payload; })
      .addCase(fetchKoduthath.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(addKoduthath.fulfilled, (state, action) => { state.entries.unshift(action.payload); })
      .addCase(addKoduthath.rejected, (state, action) => { state.error = action.payload; })
      .addCase(deleteKoduthath.fulfilled, (state, action) => {
        state.entries = state.entries.filter(e => e._id !== action.payload);
      });
  },
});

export const { clearKoduthathError } = koduthathSlice.actions;
export default koduthathSlice.reducer;
