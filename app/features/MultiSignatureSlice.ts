import { createSlice, Dispatch } from '@reduxjs/toolkit';
import { getAll, updateEntry } from '../database/MultiSignatureProposalDao';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store/store';
import {
    MultiSignatureMenuItems,
    MultiSignatureTransaction,
} from '../utils/types';

type MultiSignatureSliceState = {
    chosenMenu: MultiSignatureMenuItems;
    currentProposal: MultiSignatureTransaction | undefined;
    proposals: MultiSignatureTransaction[];
};

const multiSignatureSlice = createSlice({
    name: 'multisignature',
    initialState: {
        chosenMenu: MultiSignatureMenuItems.MakeNewProposal,
        currentProposal: undefined,
        proposals: [],
    } as MultiSignatureSliceState,
    reducers: {
        chooseMenuItem: (state, input) => {
            state.chosenMenu =
                MultiSignatureMenuItems[
                    input.payload as keyof typeof MultiSignatureMenuItems
                ];
        },
        setCurrentProposal: (state, input) => {
            state.currentProposal = input.payload;
        },
        setProposals: (state, input) => {
            state.proposals = input.payload;
        },
    },
});

export const {
    chooseMenuItem,
    setCurrentProposal,
    setProposals,
} = multiSignatureSlice.actions;

export const chosenMenuSelector = (state: RootState) =>
    state.multisignature.chosenMenu;

export const currentProposalSelector = (state: RootState) =>
    state.multisignature.currentProposal;

export const proposalsSelector = (state: RootState) =>
    state.multisignature.proposals;

/**
 * Updates the multi signature transaction in the database, and updates the
 * state with the updated transaction.
 * @param proposals if provided the state for the list of proposals is updated as well
 */
export async function updateCurrentProposal(
    dispatch: Dispatch,
    multiSignatureTransactionProposal: MultiSignatureTransaction,
    proposals?: MultiSignatureTransaction[]
) {
    updateEntry(multiSignatureTransactionProposal);
    dispatch(setCurrentProposal(multiSignatureTransactionProposal));

    if (proposals) {
        const newProposals = proposals.map((prop) => {
            if (prop.id === multiSignatureTransactionProposal.id) {
                return multiSignatureTransactionProposal;
            }
            return prop;
        });
        dispatch(setProposals(newProposals));
    }
}

/**
 * Loads all proposals from the database and sets the state to be
 * exactly what was loaded from the database
 */
export async function loadProposals(dispatch: Dispatch) {
    const allProposals = await getAll();
    dispatch(setProposals(allProposals));
}

export default multiSignatureSlice.reducer;
