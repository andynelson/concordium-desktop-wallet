import type Transport from '@ledgerhq/hw-transport';
import {
    AccountTransaction,
    TransactionKindId,
    SimpleTransfer,
    ScheduledTransfer,
    instanceOfSimpleTransfer,
    instanceOfScheduledTransfer,
} from '../../utils/types';
import {
    serializeTransactionHeader,
    serializeTransferPayload,
    serializeSchedulePoint,
    serializeScheduledTransferPayloadBase,
} from '../../utils/transactionSerialization';
import pathAsBuffer from './Path';

const INS_SIMPLE_TRANSFER = 0x02;
const INS_TRANSFER_WITH_SCHEDULE = 0x03;

async function signSimpleTransfer(
    transport: Transport,
    path: number[],
    transaction: SimpleTransfer
): Promise<Buffer> {
    const payload = serializeTransferPayload(
        TransactionKindId.Simple_transfer,
        transaction.payload
    );

    const header = serializeTransactionHeader(
        transaction.sender,
        transaction.nonce,
        transaction.energyAmount,
        payload.length,
        transaction.expiry
    );

    const data = Buffer.concat([pathAsBuffer(path), header, payload]);

    const p1 = 0x00;
    const p2 = 0x00;

    const response = await transport.send(
        0xe0,
        INS_SIMPLE_TRANSFER,
        p1,
        p2,
        data
    );
    const signature = response.slice(0, 64);
    return signature;
}

async function signTransferWithSchedule(
    transport: Transport,
    path: number[],
    transaction: ScheduledTransfer
): Promise<Buffer> {
    const scheduleLength = transaction.payload.schedule.length;

    const payload = serializeTransferPayload(
        TransactionKindId.Transfer_with_schedule,
        transaction.payload
    );

    const header = serializeTransactionHeader(
        transaction.sender,
        transaction.nonce,
        transaction.energyAmount,
        payload.length,
        transaction.expiry
    );

    const data = Buffer.concat([
        pathAsBuffer(path),
        header,
        serializeScheduledTransferPayloadBase(transaction.payload),
    ]);

    let p1 = 0x00;
    const p2 = 0x00;

    await transport.send(0xe0, INS_TRANSFER_WITH_SCHEDULE, p1, p2, data);

    const { schedule } = transaction.payload;

    p1 = 0x01;

    let i = 0;
    let response;
    while (i < scheduleLength) {
        // eslint-disable-next-line  no-await-in-loop
        response = await transport.send(
            0xe0,
            INS_TRANSFER_WITH_SCHEDULE,
            p1,
            p2,
            Buffer.concat(
                schedule
                    .slice(i, Math.min(i + 15, scheduleLength))
                    .map(serializeSchedulePoint)
            )
        );
        i += 15;
    }
    if (!response) {
        throw new Error('Unexpected missing response from ledger;');
    }

    const signature = response.slice(0, 64);
    return signature;
}

export default async function signTransfer(
    transport: Transport,
    path: number[],
    transaction: AccountTransaction
): Promise<Buffer> {
    if (instanceOfSimpleTransfer(transaction)) {
        return signSimpleTransfer(transport, path, transaction);
    }
    if (instanceOfScheduledTransfer(transaction)) {
        return signTransferWithSchedule(transport, path, transaction);
    }

    throw new Error(
        `The received transaction was not a supported transaction type`
    );
}
