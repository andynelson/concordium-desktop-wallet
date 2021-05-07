import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Redirect, Route, Switch, useRouteMatch } from 'react-router';
import { push } from 'connected-react-router';
import MultiSignatureLayout from '../MultiSignatureLayout/MultiSignatureLayout';
import Columns from '~/components/Columns';
import Button from '~/cross-app-components/Button';
import {
    Identity,
    Account,
    TransactionKindId,
    AccountTransaction,
    AddBakerPayload,
} from '~/utils/types';
import PickIdentity from '~/components/PickIdentity';
import PickAccount from './PickAccount';
import styles from './MultisignatureAccountTransactions.module.scss';
import { toMicroUnits } from '~/utils/gtu';
import PickAmount from './PickAmount';
import SimpleErrorModal from '~/components/SimpleErrorModal';
import { BakerKeys, generateBakerKeys } from '~/utils/rustInterface';
import SignTransactionColumn from '../SignTransactionProposal/SignTransaction';

import { createAddBakerTransaction } from '~/utils/transactionHelpers';
import { selectedProposalRoute } from '~/utils/routerHelper';
import routes from '~/constants/routes.json';
import { saveFile } from '~/utils/FileHelper';
import { useAccountInfo, useTransactionCostEstimate } from '~/utils/hooks';
import ConcordiumLedgerClient from '~/features/ledger/ConcordiumLedgerClient';
import { signUsingLedger } from './SignTransaction';
import { addProposal } from '~/features/MultiSignatureSlice';
import ButtonGroup from '~/components/ButtonGroup';
import AddBakerProposalDetails from './proposal-details/AddBakerProposalDetails';

const pageTitle = 'Multi Signature Transactions | Add Baker';

enum SubRoutes {
    proposal = 'proposal',
    downloadKeys = 'download-keys',
}

export default function AddBakerPage() {
    const { path, url } = useRouteMatch();
    const dispatch = useDispatch();
    const [proposalId, setProposalId] = useState<number>();
    const [bakerKeys, setBakerKeys] = useState<BakerKeys>();
    const [senderAddress, setSenderAddress] = useState<string>();

    return (
        <Switch>
            <Route path={path} exact>
                <Redirect to={`${url}/${SubRoutes.proposal}`} />
            </Route>
            <Route path={`${path}/${SubRoutes.proposal}`}>
                <BuildAddBakerTransactionProposalStep
                    onNewProposal={(id, keys, address) => {
                        setProposalId(id);
                        setBakerKeys(keys);
                        setSenderAddress(address);
                        dispatch(push(`${url}/${SubRoutes.downloadKeys}`));
                    }}
                />
            </Route>
            <Route path={`${path}/${SubRoutes.downloadKeys}`}>
                {bakerKeys !== undefined &&
                proposalId !== undefined &&
                senderAddress !== undefined ? (
                    <DownloadBakerCredentialsStep
                        pageTitle={pageTitle}
                        bakerKeys={bakerKeys}
                        accountAddress={senderAddress}
                        onContinue={() => {
                            dispatch(push(selectedProposalRoute(proposalId)));
                        }}
                    />
                ) : null}
            </Route>
        </Switch>
    );
}

type BuildTransactionProposalStepProps = {
    onNewProposal: (
        proposalId: number,
        keys: BakerKeys,
        accountAddress: string
    ) => void;
};

enum BuildSubRoutes {
    accounts = 'accounts',
    stake = 'stake',
    keys = 'keys',
    sign = 'sign',
}

function BuildAddBakerTransactionProposalStep({
    onNewProposal,
}: BuildTransactionProposalStepProps) {
    const dispatch = useDispatch();
    const { path, url } = useRouteMatch();
    const [identity, setIdentity] = useState<Identity>();
    const [account, setAccount] = useState<Account>();
    const [stake, setStake] = useState<string>('0');
    const [restakeEnabled, setRestakeEnabled] = useState(true);
    const [error, setError] = useState<string>();
    const [bakerKeys, setBakerKeys] = useState<BakerKeys>();
    const [transaction, setTransaction] = useState<
        AccountTransaction<AddBakerPayload>
    >();

    const estimatedFee = useTransactionCostEstimate(
        TransactionKindId.Add_baker,
        account?.signatureThreshold
    );

    const onGenerateKeys = () => {
        if (account === undefined) {
            setError('An account is needed to generate baker keys');
            return;
        }
        generateBakerKeys(account.address, 'ADD')
            .then((keys) => setBakerKeys(keys))
            .catch(() => setError('Failed generating baker keys'));
    };

    const onCreateTransaction = () => {
        if (bakerKeys === undefined) {
            setError('Baker keys are needed to make transaction');
            return;
        }
        if (account === undefined) {
            setError('Account is needed to make transaction');
            return;
        }

        const payload: AddBakerPayload = {
            electionVerifyKey: bakerKeys.electionPublic,
            signatureVerifyKey: bakerKeys.signaturePublic,
            aggregationVerifyKey: bakerKeys.aggregationPublic,
            proofElection: bakerKeys.proofElection,
            proofSignature: bakerKeys.proofSignature,
            proofAggregation: bakerKeys.proofAggregation,
            bakingStake: toMicroUnits(stake),
            restakeEarnings: restakeEnabled,
        };
        createAddBakerTransaction(
            account.address,
            payload,
            account.signatureThreshold
        )
            .then(setTransaction)
            .catch(() => setError('Failed create transaction'));
    };

    const signingFunction = async (ledger: ConcordiumLedgerClient) => {
        if (!account) {
            throw new Error('unexpected missing account');
        }
        if (transaction === undefined) {
            throw new Error('unexpected missing transaction');
        }
        if (bakerKeys === undefined) {
            throw new Error('unexpected missing bakerKeys');
        }

        const proposal = await signUsingLedger(ledger, transaction, account);
        if (proposal.id === undefined) {
            throw new Error('unexpected undefined proposal id');
        }

        // Set the current proposal in the state to the one that was just generated.
        dispatch(addProposal(proposal));
        onNewProposal(proposal.id, bakerKeys, account.address);
    };

    return (
        <MultiSignatureLayout
            pageTitle={pageTitle}
            stepTitle="Transaction Proposal - Add Baker"
        >
            <SimpleErrorModal
                show={Boolean(error)}
                header="Unable to perform transfer"
                content={error}
                onClick={() => dispatch(push(routes.MULTISIGTRANSACTIONS))}
            />
            <Columns divider columnScroll>
                <Columns.Column header="Transaction Details">
                    <AddBakerProposalDetails
                        identity={identity}
                        account={account}
                        stake={stake}
                        estimatedFee={estimatedFee}
                        restakeEarnings={restakeEnabled}
                        bakerVerifyKeys={
                            bakerKeys === undefined
                                ? undefined
                                : {
                                      electionVerifyKey:
                                          bakerKeys.electionPublic,
                                      signatureVerifyKey:
                                          bakerKeys.signaturePublic,
                                      aggregationVerifyKey:
                                          bakerKeys.aggregationPublic,
                                  }
                        }
                    />
                </Columns.Column>
                <Switch>
                    <Route exact path={path}>
                        <Columns.Column header="Identities">
                            <div className={styles.descriptionStep}>
                                <div className={styles.flex1}>
                                    <PickIdentity
                                        setReady={() => {}}
                                        setIdentity={setIdentity}
                                        chosenIdentity={identity}
                                    />
                                </div>
                                <Button
                                    disabled={identity === undefined}
                                    onClick={() =>
                                        dispatch(
                                            push(
                                                `${url}/${BuildSubRoutes.accounts}`
                                            )
                                        )
                                    }
                                >
                                    Continue
                                </Button>
                            </div>
                        </Columns.Column>
                    </Route>
                    <Route path={`${path}/${BuildSubRoutes.accounts}`}>
                        <Columns.Column header="Accounts">
                            <div className={styles.descriptionStep}>
                                <div className={styles.flex1}>
                                    <PickAccount
                                        setReady={() => {}}
                                        identity={identity}
                                        setAccount={setAccount}
                                        chosenAccount={account}
                                        filter={(_, info) =>
                                            info?.accountBaker === undefined
                                        }
                                    />
                                </div>
                                <Button
                                    disabled={account === undefined}
                                    onClick={() =>
                                        dispatch(
                                            push(
                                                `${url}/${BuildSubRoutes.stake}`
                                            )
                                        )
                                    }
                                >
                                    Continue
                                </Button>
                            </div>
                        </Columns.Column>
                    </Route>
                    <Route path={`${path}/${BuildSubRoutes.stake}`}>
                        <Columns.Column header="Stake">
                            <div className={styles.descriptionStep}>
                                <div className={styles.flex1}>
                                    <p>
                                        To add a baker you must choose an amount
                                        to stake on the account. The staked
                                        amount will be part of the balance, but
                                        while staked the amount is unavailable
                                        for transactions.{' '}
                                    </p>
                                    <PickAmount
                                        setReady={() => {}}
                                        amount={stake.toString() ?? '0'}
                                        account={account}
                                        estimatedFee={estimatedFee}
                                        setAmount={(gtuString) =>
                                            setStake(gtuString)
                                        }
                                    />
                                    <p>
                                        By default all baker rewards are added
                                        to the staked amount. This can be
                                        disabled below.
                                    </p>
                                    <ButtonGroup
                                        title="Enable restake earnings"
                                        name="restake"
                                        buttons={[
                                            {
                                                label: 'Yes, restake',
                                                value: true,
                                            },
                                            {
                                                label: 'No, don’t restake',
                                                value: false,
                                            },
                                        ]}
                                        isSelected={({ value }) =>
                                            value === restakeEnabled
                                        }
                                        onClick={({ value }) =>
                                            setRestakeEnabled(value)
                                        }
                                    />
                                </div>
                                <Button
                                    onClick={() => {
                                        onGenerateKeys();
                                        dispatch(
                                            push(
                                                `${url}/${BuildSubRoutes.keys}`
                                            )
                                        );
                                    }}
                                >
                                    Generate keys
                                </Button>
                            </div>
                        </Columns.Column>
                    </Route>
                    <Route path={`${path}/${BuildSubRoutes.keys}`}>
                        <Columns.Column header="Baker keys">
                            <div className={styles.descriptionStep}>
                                <div className={styles.flex1}>
                                    {bakerKeys === undefined ? (
                                        <p>Generating keys...</p>
                                    ) : (
                                        <p>
                                            Your baker keys have been generated,
                                            and the public keys can be seen to
                                            the left.
                                        </p>
                                    )}
                                </div>
                                <Button
                                    disabled={bakerKeys === undefined}
                                    onClick={() => {
                                        onCreateTransaction();
                                        dispatch(
                                            push(
                                                `${url}/${BuildSubRoutes.sign}`
                                            )
                                        );
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Columns.Column>
                    </Route>
                    <Route path={`${path}/${BuildSubRoutes.sign}`}>
                        <Columns.Column header="Signature and Hardware Wallet">
                            <SignTransactionColumn
                                signingFunction={signingFunction}
                            />
                        </Columns.Column>
                    </Route>
                </Switch>
            </Columns>
        </MultiSignatureLayout>
    );
}

type DownloadBakerCredentialsStepProps = {
    accountAddress: string;
    bakerKeys: BakerKeys;
    pageTitle: string;
    onContinue: () => void;
};

export function DownloadBakerCredentialsStep({
    accountAddress,
    bakerKeys,
    pageTitle: pageTitle_,
    onContinue,
}: DownloadBakerCredentialsStepProps) {
    const accountInfo = useAccountInfo(accountAddress);

    const onExport = async () => {
        if (accountInfo === undefined) {
            return;
        }
        const fileString = JSON.stringify({
            bakerId: accountInfo.accountIndex,
            aggregationSignKey: bakerKeys.aggregationSecret,
            aggregationVerifyKey: bakerKeys.aggregationPublic,
            electionPrivateKey: bakerKeys.electionSecret,
            electionVerifyKey: bakerKeys.electionPublic,
            signatureSignKey: bakerKeys.signatureSecret,
            signatureVerifyKey: bakerKeys.signaturePublic,
        });
        const success = await saveFile(fileString, {
            title: 'Save Baker Credentials',
            defaultPath: 'baker-credentials.json',
        });
        if (success) {
            onContinue();
        }
    };

    return (
        <MultiSignatureLayout
            pageTitle={pageTitle_}
            stepTitle="Baker Credentials"
        >
            <div className={styles.descriptionStep}>
                <div className={styles.flex1}>
                    <p>
                        Make sure to export and backup your Baker Credentials,
                        as this will be the only chance to export them.
                    </p>
                    <p>
                        Baker credentials are used by the concordium node for
                        baking and contains private keys, which should only
                        transferred on a secure channel.
                    </p>
                    <p>
                        If the Baker Credentials are lost or compromised, new
                        ones should be generated by updating Baker Keys.
                    </p>
                </div>
                <Button onClick={onExport}>Export Baker Credentials</Button>
            </div>
        </MultiSignatureLayout>
    );
}
