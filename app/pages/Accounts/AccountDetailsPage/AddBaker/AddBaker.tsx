import React, {
    ComponentType,
    createContext,
    useContext,
    useState,
} from 'react';
import { connect } from 'react-redux';
import AddBakerStakeSettings, {
    StakeSettings,
} from '~/components/BakerTransactions/AddBakerStakeSettings';
import Radios from '~/components/Form/Radios';
import withExchangeRate, {
    ExchangeRate,
} from '~/components/Transfers/withExchangeRate';
import withNonce, { AccountAndNonce } from '~/components/Transfers/withNonce';
import Button from '~/cross-app-components/Button';
import { chosenAccountSelector } from '~/features/AccountSlice';
import { RootState } from '~/store/store';
import { useTransactionCostEstimate } from '~/utils/dataHooks';
import { Account, NotOptional, TransactionKindId } from '~/utils/types';
import withChainData, { ChainData } from '~/utils/withChainData';
import AccountTransactionFlow, {
    FlowPageProps,
    AccountTransactionFlowLoading,
} from '../../AccountTransactionFlow';

import styles from './AddBaker.module.scss';

type PoolOpenSettings = boolean;

type Dependencies = ChainData & ExchangeRate & AccountAndNonce;

const dependencies = createContext<NotOptional<Dependencies>>(
    {} as NotOptional<Dependencies>
);

const title = 'Add baker';

type StakePageProps = FlowPageProps<StakeSettings>;

function StakePage({ onNext, initial }: StakePageProps) {
    const { blockSummary, exchangeRate, account } = useContext(dependencies);
    const minimumStake = BigInt(
        blockSummary.updates.chainParameters.minimumThresholdForBaking
    );
    const estimatedFee = useTransactionCostEstimate(
        TransactionKindId.Add_baker, // TODO: change this to the correct transaction.
        exchangeRate,
        account?.signatureThreshold
    );

    return (
        <AddBakerStakeSettings
            onSubmit={onNext}
            initialData={initial}
            account={account}
            estimatedFee={estimatedFee}
            minimumStake={minimumStake}
            buttonClassName={styles.mainButton}
        />
    );
}

type PoolOpenPageProps = FlowPageProps<PoolOpenSettings>;

function PoolOpenPage({ initial = true, onNext }: PoolOpenPageProps) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <p>
                You have the option to open your baker as a pool for others to
                delegate their CCD to.
            </p>
            <Radios
                className="mT50"
                options={[
                    { label: 'Open pool', value: true },
                    { label: 'Keep closed', value: false },
                ]}
                value={value}
                onChange={setValue}
            />
            <Button className={styles.mainButton} onClick={() => onNext(value)}>
                Continue
            </Button>
        </>
    );
}

interface AddBakerState {
    stake: StakeSettings;
    poolOpen: PoolOpenSettings;
}

type Props = Dependencies;

const withData = (component: ComponentType<Props>) =>
    connect((s: RootState) => ({
        account: chosenAccountSelector(s) as Account,
    }))(withNonce(withExchangeRate(withChainData(component))));

export default withData(function AddBaker(props: Props) {
    const loading = Object.values(props).some((v) => !v);

    if (loading) {
        return <AccountTransactionFlowLoading title={title} />;
    }

    return (
        <dependencies.Provider value={props as NotOptional<Dependencies>}>
            <AccountTransactionFlow<AddBakerState>
                title={title}
                // eslint-disable-next-line no-console
                onDone={(values) => console.log(values)}
            >
                {{
                    stake: { component: StakePage },
                    poolOpen: { component: PoolOpenPage },
                }}
            </AccountTransactionFlow>
        </dependencies.Provider>
    );
});
