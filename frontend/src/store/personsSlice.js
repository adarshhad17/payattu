import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchPersons = createAsyncThunk('persons/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/persons');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load persons');
  }
});

export const fetchPerson = createAsyncThunk('persons/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/persons/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load person');
  }
});

export const createPerson = createAsyncThunk('persons/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/persons', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create person');
  }
});

export const updatePerson = createAsyncThunk('persons/update', async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/persons/${id}`, body);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update person');
  }
});

export const deletePerson = createAsyncThunk('persons/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/persons/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete person');
  }
});

const personsSlice = createSlice({
  name: 'persons',
  initialState: { list: [], current: null, loading: false, error: null },
  reducers: {
    clearPersonError(state) { state.error = null; },
    updatePersonInList(state, action) {
      const idx = state.list.findIndex(p => p._id === action.payload._id);
      if (idx !== -1) state.list[idx] = action.payload;
      if (state.current?._id === action.payload._id) state.current = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersons.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPersons.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchPersons.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchPerson.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPerson.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchPerson.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createPerson.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updatePerson.fulfilled, (state, action) => {
        const idx = state.list.findIndex(p => p._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.current?._id === action.payload._id) state.current = action.payload;
      })
      .addCase(deletePerson.fulfilled, (state, action) => {
        state.list = state.list.filter(p => p._id !== action.payload);
      });
  },
});

export const { clearPersonError, updatePersonInList } = personsSlice.actions;
export default personsSlice.reducer;
