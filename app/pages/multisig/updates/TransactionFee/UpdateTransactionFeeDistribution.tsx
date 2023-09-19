import React from 'react';

import { EqualRecord } from '~/utils/types';
import { UpdateProps } from '~/utils/transactionTypes';
import {
    RewardDistributionValue,
    FormRewardDistribution,
    RewardDistribution,
} from '../../common/RewardDistribution';
import { getCurrentValue, rewardDistributionLabels } from './util';

export interface UpdateTransactionFeeDistributionFields {
    rewardDistribution: RewardDistributionValue;
}

const fieldNames: EqualRecord<UpdateTransactionFeeDistributionFields> = {
    rewardDistribution: 'rewardDistribution',
};

export default function UpdateTransactionFeeDistribution({
    defaults,
    chainParameters,
}: UpdateProps) {
    const currentValue: RewardDistributionValue = getCurrentValue(
        chainParameters
    );

    return (
        <>
            <div>
                <h5>Current transaction fee distribuition</h5>
                <RewardDistribution
                    value={currentValue}
                    labels={rewardDistributionLabels}
                    disabled
                />
            </div>
            <div>
                <h5>New transaction fee distribuition</h5>
                <FormRewardDistribution
                    name={fieldNames.rewardDistribution}
                    defaultValue={defaults.rewardDistribution || currentValue}
                    labels={rewardDistributionLabels}
                    rules={{
                        required: 'Must specify a valid reward distribution',
                    }}
                />
            </div>
        </>
    );
}
