use ps_sig::unknown_message::SigRetrievalRandomness;
use crypto_common::*;
use curve_arithmetic::{Curve, Pairing};
use std::collections::BTreeMap;
use either::Either;
use id::types::*;

pub struct InitialAccountDataStruct {
    pub public_keys: Vec<VerifyKey>,
    pub threshold: SignatureThreshold,
}

impl PublicInitialAccountData for InitialAccountDataStruct {
    fn get_threshold(&self) -> SignatureThreshold {
        self.threshold
    }

    fn get_public_keys(&self) -> Vec<VerifyKey> {
        (&self.public_keys).to_vec()
    }
}

pub struct InitialAccountDataWithSignature {
    pub signature: AccountOwnershipSignature,
    pub public_keys: Vec<VerifyKey>,
    pub threshold: SignatureThreshold,
}

impl PublicInitialAccountData for InitialAccountDataWithSignature {
    fn get_threshold(&self) -> SignatureThreshold {
        self.threshold
    }

    fn get_public_keys(&self) -> Vec<VerifyKey> {
        (&self.public_keys).to_vec()
    }
}

impl InitialAccountDataWithSigning for InitialAccountDataWithSignature {
    fn sign_public_information_for_ip<C: Curve>(
        &self,
        _: &PublicInformationForIP<C>,
    ) -> BTreeMap<KeyIndex, AccountOwnershipSignature> {
        let mut signatures = BTreeMap::new();
        signatures.insert(KeyIndex(0), self.signature);
        signatures
    }
}

#[derive(SerdeSerialize, SerdeDeserialize)]
#[serde(bound(
    serialize = "P: Pairing",
    deserialize = "P: Pairing"
))]
pub struct RandomnessWrapper<P: Pairing> {
    #[serde(
        rename = "randomness",
        serialize_with = "base16_encode",
        deserialize_with = "base16_decode"
    )]
    pub randomness: SigRetrievalRandomness<P>,
}

pub struct AccountDataStruct {
    pub public_keys: Vec<VerifyKey>,
    pub threshold: SignatureThreshold,
}

impl PublicAccountData for AccountDataStruct {
    fn get_existing(&self) ->  Either<SignatureThreshold, AccountAddress> { Either::Left(self.threshold) }

    fn get_public_keys(&self) -> Vec<VerifyKey> {
        (&self.public_keys).to_vec()
    }
}
