import { ethers } from 'hardhat';
import { packV2ValidatorParams } from '../test/utils/pack-utils';
import { calculateQueryHashV2 } from '../test/utils/utils';

async function main() {
  const loyaltyDeployment = require('./deployments_output/deploy_output_2484_loyalty.json');
  const loyaltyAddress = loyaltyDeployment.loyalty;
  
  // The validator address for the specific chain and circuit
  const validatorAddressSig = '0xF0c6Ff8dA7caeF33aDa796FD57A497af70a40814'; // u2u SIG Validator

  const loyaltyContract = await ethers.getContractAt('Loyalty', loyaltyAddress);
  console.log('Loyalty contract attached to:', await loyaltyContract.getAddress());

  const circuitIdSig = 'credentialAtomicQuerySigV2OnChain';

  // --- USER-DEFINED QUERY DATA ---

  // 1. Schema Information
  // You can run https://go.dev/play/p/3id7HAhf-Wi to get schema hash and claimPathKey using your schema
  const schemaUrl = "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E";
  const schema = "121901350748583279005897313638285172630";

  // 2. Claim Path Keys
  // You must convert your credentialSubject fields to claimPathKeys.
  // Example mapping:
  const claimPathKeys = {
    "probability": "5404045458195230891750735279045504971543599904373267799351524782992691008799",
    "verificationMethod": "19554096465404444126683812737245222057459390664391787437340720543081506520212",
    "verificationMethodId": "10837404595086607055826167315612494042155782490981439592679720075149736581051",
    "ageRange.minAgeRange": "13879207347271870224717046555319043223125477330458676583164031510927478750468",
    "ageRange.maxAgeRange": "2988680931240483620786206189665768830899479841714815485783391909734377661537",
    "levelOfConfidence": "12837435528204357876850149830275286328570854322046852798133247316497452266402"
  };

  // 3. Queries from Builder
  const proofAgeQueries = [
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1752579546,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "probability": {
            "$eq": 1
          }
        },
        "type": "ProoofAge"
      }
    },
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1753342562,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "verificationMethod": {
            "$eq": "document"
          }
        },
        "type": "ProoofAge"
      }
    },
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1752733058,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "verificationMethodId": {
            "$eq": 3
          }
        },
        "type": "ProoofAge"
      }
    },
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1753359651,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "ageRange.minAgeRange": {
            "$eq": 18
          }
        },
        "type": "ProoofAge"
      }
    },
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1753076406,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "ageRange.maxAgeRange": {
            "$eq": 40
          }
        },
        "type": "ProoofAge"
      }
    },
    {
      "circuitId": "credentialAtomicQuerySigV2",
      "id": 1753452005,
      "query": {
        "allowedIssuers": [
          "did:iden3:u2u:testnet:2mRQvRTLxVen1wNWqcYx1KDE4TRpTsTFgqXVDmWj71"
        ],
        "context": "ipfs://QmfEEiU1UqkH5eXSFurSbu6g87k6R6YhKtxyRnd534Wn6E",
        "credentialSubject": {
          "levelOfConfidence": {
            "$eq": "basic"
          }
        },
        "type": "ProoofAge"
      }
    }
  ];

  // --- SCRIPT LOGIC ---

  for (const proofRequest of proofAgeQueries) {
    const { id: requestId, query } = proofRequest;
    const { credentialSubject, allowedIssuers, type } = query;

    const subjectKey = Object.keys(credentialSubject)[0];
    const condition = credentialSubject[subjectKey];
    const operatorKey = Object.keys(condition)[0];
    const value = condition[operatorKey];

    // Map operator string to number
    const operator = { "$eq": 1, "$lt": 2, "$gt": 3, "$in": 4, "$nin": 5, "$ne": 6 }[operatorKey];
    if (!operator) {
        console.error(`Unsupported operator: ${operatorKey}`);
        continue;
    }
    
    const claimPathKey = claimPathKeys[subjectKey];
    if (!claimPathKey || claimPathKey === "PLEASE_ADD_CLAIM_PATH_KEY") {
        console.error(`ClaimPathKey for '${subjectKey}' is not defined. Please add it to the 'claimPathKeys' map.`);
        continue;
    }

    const validatorQuery = {
      requestId,
      schema: schema,
      claimPathKey: claimPathKey,
      operator: operator,
      value: [value, ...new Array(63).fill(0)], // Ensure value is correctly formatted
      slotIndex: 0,
      queryHash: '',
      circuitIds: [circuitIdSig],
      allowedIssuers: allowedIssuers,
      skipClaimRevocationCheck: false,
      claimPathNotExists: 0
    };

    validatorQuery.queryHash = calculateQueryHashV2(
      validatorQuery.value,
      validatorQuery.schema,
      validatorQuery.slotIndex,
      validatorQuery.operator,
      validatorQuery.claimPathKey,
      validatorQuery.claimPathNotExists
    ).toString();

    const invokeRequestMetadata = {
      id: '7f38a193-0918-4a48-9fac-36adfdb8b542',
      typ: 'application/iden3comm-plain-json',
      type: 'https://iden3-communication.io/proofs/1.0/contract-invoke-request',
      thid: '7f38a193-0918-4a48-9fac-36adfdb8b542',
      body: {
        reason: `Proof of Age Verification: ${type}`,
        transaction_data: {
          contract_address: loyaltyAddress,
          method_id: 'b68967e2',
          chain_id: 2484,
          network: 'u2u-testnet'
        },
        scope: [
          {
            id: validatorQuery.requestId,
            circuitId: circuitIdSig,
            query: {
              allowedIssuers: validatorQuery.allowedIssuers,
              context: schemaUrl,
              credentialSubject: {
                [subjectKey]: {
                  [operatorKey]: value
                }
              },
              type: type
            }
          }
        ]
      }
    };

    try {
      console.log(`Setting ZKP Request for ID: ${requestId} (${subjectKey})`);
      const tx = await loyaltyContract.setZKPRequest(validatorQuery.requestId, {
        metadata: JSON.stringify(invokeRequestMetadata),
        validator: validatorAddressSig,
        data: packV2ValidatorParams(validatorQuery)
      });

      console.log('Transaction Hash:', tx.hash);
      await tx.wait();
      console.log('Transaction Confirmed');
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });