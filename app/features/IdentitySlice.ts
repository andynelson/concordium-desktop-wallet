import { createSlice, Dispatch } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import {
    getAllIdentities,
    insertIdentity,
    updateIdentity,
} from '../database/IdentityDao';
import { Identity, IdentityStatus } from '../utils/types';

const identitySlice = createSlice({
    name: 'identities',
    initialState: {
        identities: undefined,
        chosenIdentity: undefined,
    },
    reducers: {
        updateIdentities: (state, input) => {
            state.identities = input.payload;
        },
        chooseIdentity: (state, input) => {
            state.chosenIdentity = state.identities[input.payload];
        },
    },
});

export const { updateIdentities, chooseIdentity } = identitySlice.actions;

export const identitiesSelector = (state: RootState) =>
    state.identities.identities;

export const chosenIdentitySelector = (state: RootState) =>
    state.identities.chosenIdentity;

export async function loadIdentities(dispatch: Dispatch) {
    const identities: Identity[] = await getAllIdentities();
    dispatch(updateIdentities(identities));
}

export async function addPendingIdentity(
    dispatch: Dispatch,
    identityName: string,
    codeUri: string,
    identityProvider,
    randomness: string
) {
    const identity = {
        name: identityName,
        status: IdentityStatus.pending,
        codeUri,
        identityProvider: JSON.stringify(identityProvider),
        randomness,
    };
    await insertIdentity(identity);
    return loadIdentities(dispatch);
}

export async function confirmIdentity(
    dispatch: Dispatch,
    identityName: string,
    identityObject
) {
    await updateIdentity(identityName, {
        status: IdentityStatus.confirmed,
        identityObject: JSON.stringify(identityObject),
    });
    await loadIdentities(dispatch);
}

export async function rejectIdentity(dispatch: Dispatch, identityName: string) {
    await updateIdentity(identityName, { status: IdentityStatus.rejected });
    await loadIdentities(dispatch);
}

export default identitySlice.reducer;
