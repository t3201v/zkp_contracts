import { ethers } from 'hardhat';
import { packV2ValidatorParams } from '../test/utils/pack-utils';
import {buildVerifierId, calculateQueryHashV2, calculateQueryHashV3, coreSchemaFromStr} from '../test/utils/utils';
import {ChainIds, DidMethod} from "@iden3/js-iden3-core";

const Operators = {
  NOOP: 0, // No operation, skip query verification in circuit
  EQ: 1, // equal
  LT: 2, // less than
  GT: 3, // greater than
  IN: 4, // in
  NIN: 5, // not in
  NE: 6 // not equal
};

function bigIntReplacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

async function main() {
  // const loyaltyDeployment = require('./deployments_output/deploy_output_2484_loyalty.json');
  const loyaltyDeployment = require('./deployments_output/deploy_output_80002_loyalty.json');
  const loyaltyAddress = loyaltyDeployment.loyalty;
  
  // The validator address for the specific chain and circuit
  // const validatorAddressSig = '0xF0c6Ff8dA7caeF33aDa796FD57A497af70a40814'; // u2u SIG Validator
  const validatorAddressSig = '0x8c99F13dc5083b1E4c16f269735EaD4cFbc4970d'; // amoy SIG Validator
  const validatorAddressMtp = '0xEEd5068AD8Fecf0b9a91aF730195Fef9faB00356'; // amoy MTP Validator

  const loyaltyContract = await ethers.getContractAt('Loyalty', loyaltyAddress);
  console.log('Loyalty contract attached to:', await loyaltyContract.getAddress());

  const circuitIdSig = 'credentialAtomicQuerySigV2OnChain';
  const circuitIdMTP = 'credentialAtomicQueryMTPV2OnChain';

  // You can run https://go.dev/play/p/3id7HAhf-Wi to get schema hash and claimPathKey using your schema
  const schemaUrl = "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld";
  const schema = "74977327600848231385663280181476307657";
  const schemaClaimPathKey = '20376033832371109177683048456014525905119173674985843915445634726167450989630';
  const slotIndex = 0; // because schema  is merklized for merklized credential, otherwise you should actual put slot index  https://docs.iden3.io/protocol/non-merklized/#motivation
  const value = [20020101, ...new Array(63).fill(0)];
  const claimPathDoesntExist = 0; // 0 for inclusion (merklized credentials) - 1 for non-merklized
  const requestIdSig = await loyaltyContract.SUBMIT_REQUEST_ID_SIG_VALIDATOR();
  const requestIdMtp = await loyaltyContract.SUBMIT_REQUEST_ID_MTP_VALIDATOR();
  // const requestIdSig = 100000;
  // const requestIdMtp = 100001;

  // prooofage
  // const claimPathKeys = {
  //   "probability": "5404045458195230891750735279045504971543599904373267799351524782992691008799",
  //   "verificationMethod": "19554096465404444126683812737245222057459390664391787437340720543081506520212",
  //   "verificationMethodId": "10837404595086607055826167315612494042155782490981439592679720075149736581051",
  //   "ageRange.minAgeRange": "13879207347271870224717046555319043223125477330458676583164031510927478750468",
  //   "ageRange.maxAgeRange": "2988680931240483620786206189665768830899479841714815485783391909734377661537",
  //   "levelOfConfidence": "12837435528204357876850149830275286328570854322046852798133247316497452266402"
  // };

  const query = {
    schema: schema,
    claimPathKey: schemaClaimPathKey,
    operator: Operators.LT,
    slotIndex: slotIndex,
    value: value,
    queryHash: calculateQueryHashV2(
        value,
        schema,
        slotIndex,
        Operators.LT,
        schemaClaimPathKey,
        claimPathDoesntExist
    ).toString(),
    // queryHash: '9216172619867794036903412371339582119080960385095068186622296677264068532368',
    circuitIds: [circuitIdSig],
    allowedIssuers: [],
    skipClaimRevocationCheck: false,
    claimPathNotExists: claimPathDoesntExist
  };
  const chainId = 80002;

  const network = 'polygon-amoy';
  const networkFlag = Object.keys(ChainIds).find((key) => ChainIds[key] === chainId);

  if (!networkFlag) {
    throw new Error(`Invalid chain id ${chainId}`);
  }
  const [blockchain, networkId] = networkFlag.split(':');
  const id = buildVerifierId(loyaltyAddress, {
    blockchain,
    networkId,
    method: DidMethod.PolygonId
  });
  const schemaHash = coreSchemaFromStr(schema);
  console.log('queryHashV2', query.queryHash);
  console.log('queryHashV3', calculateQueryHashV3(
      value,
      schemaHash,
      slotIndex,
      Operators.LT,
      schemaClaimPathKey,
      "0",
      "1",
      "0",
      id.bigInt().toString(),
      "0",
  ))

  const invokeRequestMetadata = {
    id: '471da5f5-b22d-4b5e-922c-b698f147f42e',
    typ: 'application/iden3comm-plain-json',
    type: 'https://iden3-communication.io/proofs/1.0/contract-invoke-request',
    thid: '471da5f5-b22d-4b5e-922c-b698f147f42e',
    body: {
      reason: 'for testing',
      transaction_data: {
        contract_address: await loyaltyContract.getAddress(),
        method_id: 'b68967e2',
        chain_id: 80002,
        network: 'polygon-amoy'
      },
      scope: [
        {
          id: requestIdSig,
          circuitId: circuitIdSig,
          query: {
            allowedIssuers: ['*'],
            context: schemaUrl,
            credentialSubject: {
              "birthday": {
                "$lt": 20020101
              }
            },
            type: 'KYCAgeCredential'
          }
        }
      ]
    }
  };

  try {
    console.log(`Setting ZKP Request for ID: ${requestIdSig} (KYCAgeCredential)`);
    const tx = await loyaltyContract.setZKPRequest(requestIdSig, {
      metadata: JSON.stringify(invokeRequestMetadata, bigIntReplacer),
      validator: validatorAddressSig,
      data: packV2ValidatorParams(query)
    });

    console.log('Transaction Hash:', tx.hash);
    console.log('Scope: ', JSON.stringify(invokeRequestMetadata.body.scope));
    await tx.wait();
    console.log('Transaction Confirmed');
  } catch (e) {
    console.log('Error:', e.message);
  }

  try {
    invokeRequestMetadata.body.scope[0].id = requestIdMtp;
    invokeRequestMetadata.body.scope[0].circuitId = circuitIdMTP;
    console.log(`Setting ZKP Request for ID: ${requestIdMtp} (KYCAgeCredential)`);
    const tx = await loyaltyContract.setZKPRequest(requestIdMtp, {
      metadata: JSON.stringify(invokeRequestMetadata, bigIntReplacer),
      validator: validatorAddressMtp,
      data: packV2ValidatorParams(query)
    });

    console.log('Transaction Hash:', tx.hash);
    await tx.wait();
    console.log('Transaction Confirmed');
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });