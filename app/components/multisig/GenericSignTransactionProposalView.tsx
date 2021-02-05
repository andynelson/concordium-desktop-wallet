import React, { useState } from 'react';
import {
    Button,
    Checkbox,
    Container,
    Divider,
    Form,
    Grid,
    Header,
    Segment,
} from 'semantic-ui-react';
import { parse } from 'json-bigint';
import LedgerComponent from '../ledger/LedgerComponent';
import TransactionDetails from '../TransactionDetails';
import TransactionHashView from '../TransactionHashView';
import { AccountTransaction, UpdateInstruction } from '../../utils/types';
import ConcordiumLedgerClient from '../../features/ledger/ConcordiumLedgerClient';

interface Props<T> {
    transaction: string;
    transactionHash: string;
    signFunction: (input: T) => Promise<void>;
    checkboxes: string[];
    signText: string;
}

export default function GenericSignTransactionProposalView({
    transaction,
    transactionHash,
    signFunction,
    checkboxes,
    signText,
}: Props<ConcordiumLedgerClient>) {
    const [signing, setSigning] = useState(false);
    const [checkboxesStatus, setCheckBoxesStatus] = useState(
        new Array(checkboxes.length).fill(false)
    );

    const transactionObject: UpdateInstruction | AccountTransaction = parse(
        transaction
    );

    // The device component should only be displayed if the user has clicked
    // to sign the transaction.
    let ledgerComponent;
    if (signing) {
        ledgerComponent = <LedgerComponent ledgerCall={signFunction} />;
    } else {
        ledgerComponent = null;
    }

    return (
        <Container>
            <Segment>
                <Header textAlign="center">
                    Transaction signing confirmation | Transaction Type
                </Header>
                <Divider />
                <Grid columns={2} divided textAlign="center" padded>
                    <Grid.Row>
                        <Grid.Column>
                            <TransactionDetails
                                transaction={transactionObject}
                            />
                        </Grid.Column>
                        <Grid.Column>
                            <TransactionHashView
                                transactionHash={transactionHash}
                            />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Form>
                            {checkboxes.map((label, index) => (
                                <Form.Field key={label}>
                                    <Checkbox
                                        label={label}
                                        defaultChecked={checkboxesStatus[index]}
                                        disabled={signing}
                                        onChange={() => {
                                            const updatedStatus = [
                                                ...checkboxesStatus,
                                            ];
                                            updatedStatus[
                                                index
                                            ] = !updatedStatus[index];
                                            setCheckBoxesStatus(updatedStatus);
                                        }}
                                    />
                                </Form.Field>
                            ))}
                            <Form.Field>
                                <Button
                                    positive
                                    fluid
                                    onClick={() => setSigning(true)}
                                    disabled={
                                        signing ||
                                        !checkboxesStatus.every(Boolean)
                                    }
                                >
                                    {signText}
                                </Button>
                            </Form.Field>
                        </Form>
                    </Grid.Row>
                </Grid>
            </Segment>
            {ledgerComponent}
        </Container>
    );
}
