import { credentials, Metadata } from '@grpc/grpc-js';
import { P2PClient } from '../proto/concordium_p2p_rpc_grpc_pb';
import {
    BlockHash,
    JsonResponse,
    SendTransactionRequest,
    TransactionHash,
    AccountAddress,
    GetAddressInfoRequest,
    Empty,
} from '../proto/concordium_p2p_rpc_pb';
import { BlockSummary, ConsensusStatus } from './NodeApiTypes';

/**
 * All these methods are wrappers to call a Concordium Node / P2PClient using GRPC.
 */

const defaultDeadlineMs = 15000;
let client;
const clientCredentials = credentials.createInsecure();

export function setClientLocation(address, port) {
    client = new P2PClient(`${address}:${port}`, clientCredentials);
}

function buildMetaData(): MetaData {
    const meta = new Metadata();
    meta.add('authentication', 'rpcadmin');
    return meta;
}

function buildSendTransactionRequest(
    payload: Uint8Array,
    networkId: number
): SendTransactionRequest {
    const request = new SendTransactionRequest();
    request.setNetworkId(networkId);
    request.setPayload(payload);
    return request;
}

/**
 * Sends a command with GRPC to the node with the provided input.
 * @param command command to execute
 * @param input input for the command
 */
function sendPromise(command, input) {
    const defaultDeadline = new Date(new Date().getTime() + defaultDeadlineMs);
    return new Promise<JsonResponse>((resolve, reject) => {
        client.waitForReady(defaultDeadline, (error) => {
            if (error) {
                return reject(error);
            }

            return command.bind(client)(
                input,
                buildMetaData(),
                (err, response) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(response);
                }
            );
        });
    });
}

export function sendTransaction(
    transactionPayload: Uint8Array,
    networkId = 100
): Promise<JsonResponse> {
    const request = buildSendTransactionRequest(transactionPayload, networkId);

    return sendPromise(client.sendTransaction, request);
}

export function getTransactionStatus(
    transactionId: string
): Promise<JsonResponse> {
    const transactionHash = new TransactionHash();
    transactionHash.setTransactionHash(transactionId);

    return sendPromise(client.getTransactionStatus, transactionHash);
}

export function getNextAccountNonce(address: string): Promise<JsonResponse> {
    const accountAddress = new AccountAddress();
    accountAddress.setAccountAddress(address);

    return sendPromise(client.getNextAccountNonce, accountAddress);
}

/**
 * Executes the provided GRPC command towards the node with the provided
 * input.
 * @param command command to execute towards the node
 * @param input input for the command
 */
function sendPromiseParseResult<T>(command, input) {
    const defaultDeadline = new Date(new Date().getTime() + defaultDeadlineMs);
    return new Promise<T>((resolve, reject) => {
        client.waitForReady(defaultDeadline, (error) => {
            if (error) {
                return reject(error);
            }

            return command.bind(client)(
                input,
                buildMetaData(),
                (err, response) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(JSON.parse(response.getValue()));
                }
            );
        });
    });
}

/**
 * Retrieves the ConsensusStatus information from the node.
 */
export function getConsensusStatus(): Promise<ConsensusStatus> {
    return sendPromiseParseResult<ConsensusStatus>(
        client.getConsensusStatus,
        new Empty()
    );
}

/**
 * Retrieves the block summary for the provided block hash from the node.
 * @param blockHashValue the block hash to retrieve the block summary for
 */
export function getBlockSummary(blockHashValue: string): Promise<BlockSummary> {
    const blockHash = new BlockHash();
    blockHash.setBlockHash(blockHashValue);
    return sendPromiseParseResult<BlockSummary>(
        client.getBlockSummary,
        blockHash
    );
}

export function getAccountInfo(
    address: string,
    blockHash: string
): Promise<JsonResponse> {
    const requestData = new GetAddressInfoRequest();
    requestData.setAddress(address);
    requestData.setBlockHash(blockHash);

    return sendPromise(client.getAccountInfo, requestData);
}

export function getNodeInfo(): Promise<NodeInfoResponse> {
    return sendPromise(client.nodeInfo, new Empty());
}
