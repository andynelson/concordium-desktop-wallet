import { AccountAddress } from '../proto/api_pb';

type Hex = string;

enum SchemeId {
    Ed25519 = 0,
}

export interface VerifyKey {
    scheme: SchemeId;
    key: Hex;
}

export interface NewAccount {
    keys: VerifyKey[];
    threshold: number;
}

// AccountAddress if deploying credentials to an existing account, and
// NewAccount for deployment of a new account.
// TODO: Add support for AccountAddress for updating existing account credentials.
type CredentialAccount = NewAccount;

export interface AccountTransaction {
    sender: AccountAddress;
    nonce: number;
    energyAmount: number;
    expiry: number;
    transactionKind: TransactionKind;
    payload;
}

export enum TransactionKind {
    Deploy_module = 0,
    Initialize_smart_contract_instance = 1,
    Update_smart_contract_instance = 2,
    Simple_transfer = 3,
    Add_baker = 4,
    Remove_baker = 5,
    Update_baker_account = 6,
    Update_baker_sign_key = 7,
    Delegate_stake = 8,
    Undelegate_stake = 9,
    Transfer_with_schedule = 19,
} // TODO: Add all kinds (11- 18)

export enum BlockItemKind {
    AccountTransactionKind = 0,
    CredentialDeploymentKind = 1,
    UpdateInstructionKind = 2,
}

export interface CredentialDeploymentInformation {
    account: CredentialAccount;
    regId: RegId;
    ipId: IpIdentity;
    revocationThreshold: Threshold;
    arData: any; // Map with ar data
    policy: Policy;
    proofs: Proofs;
}

type AccountAddress = Uint8Array;

// 48 bytes containing a group element.
type RegId = Hex;

// An integer (32 bit) specifying the identity provider.
type IpIdentity = number;

// An integer (8 bit) specifying the revocation threshold.
type Threshold = number;

export interface Policy {
    validTo: YearMonth; // CredentialValidTo
    createdAt: YearMonth; // CredentialCreatedAt
    revealedAttributes: any; // Map.Map AttributeTag AttributeValue
}

type YearMonth = string; // "YYYYMM"

export enum AttributeTag {
    firstName = 0,
    lastName = 1,
    sex = 2,
    dob = 3,
    countryOfResidence = 4,
    nationality = 5,
    idDocType = 6,
    idDocNo = 7,
    idDocIssuer = 8,
    idDocIssuedAt = 9,
    idDocExpiresAt = 10,
    nationalIdNo = 11,
    taxIdNo = 12,
}

type Proofs = Hex;

export interface PublicInformationForIp {
    idCredPub: Hex;
    regId: RegId;
    publicKeys: NewAccount;
}
