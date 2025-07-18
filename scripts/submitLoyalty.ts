import { ethers } from "hardhat";

// Configuration interface
interface ProofConfig {
    contractAddress: string;
    requestId: number;
    proofData: {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
        pub_signals: string[];
    };
}

// ZKP Proof formatter function
function formatZKPProofForContract(proofResponse: any, requestId: number) {
    const proof = proofResponse.body.scope[0].proof;
    const pubSignals = proofResponse.body.scope[0].pub_signals;

    return {
        requestId: requestId,
        inputs: pubSignals.map((signal: string) => signal.toString()),
        a: [proof.pi_a[0], proof.pi_a[1]] as [string, string],
        b: [
            [proof.pi_b[0][0], proof.pi_b[0][1]],
            [proof.pi_b[1][0], proof.pi_b[1][1]]
        ] as [[string, string], [string, string]],
        c: [proof.pi_c[0], proof.pi_c[1]] as [string, string]
    };
}

// Your proof data (you can move this to a separate JSON file)
const proofResponse = {
    "id": "66dc145e-1d3e-4a22-aa62-332d62ccdc30",
    "typ": "application/iden3-zkp-json",
    "type": "https://iden3-communication.io/authorization/1.0/response",
    "thid": "8e532b66-8ee1-4e0f-a1cb-8ac89347ec35",
    "body": {
        "scope": [
            {
                "id": 1,
                "circuitId": "credentialAtomicQuerySigV2",
                "proof": {
                    "pi_a": [
                        "3298230848160796647979331245862216175395952355027210230404951211040411149827",
                        "2596613897609043251949145514275196165112342402351848355954709319415677056947",
                        "1"
                    ],
                    "pi_b": [
                        [
                            "1835123582970402845402335009964963610182080853717064942361333812068362151650",
                            "16840276460215217119471498453114180767334206952209880735824705263251054603931"
                        ],
                        [
                            "8574371737538306954271265519904024372242628797977250232624898270364992990765",
                            "18469874873791090788306309876997920438455515948580544250634227313262853089555"
                        ],
                        [
                            "1",
                            "0"
                        ]
                    ],
                    "pi_c": [
                        "21165200190865098022873663179145665786169680358873410586097188121839594233477",
                        "18809415741943965173806749815128878221478855189453197860460665538106396744851",
                        "1"
                    ],
                    "protocol": "groth16",
                    "curve": "bn128"
                },
                "pub_signals": [
                    "1",
                    "22267605878019832344890502055831357282933867906319130337162167440531497217",
                    "7192072742563031150642023150988111510965662585365236632965132927855173797404",
                    "1",
                    "20947228843450380333762680382997917440306268282103805368923350131329536770",
                    "1",
                    "7192072742563031150642023150988111510965662585365236632965132927855173797404",
                    "1752662041",
                    "121901350748583279005897313638285172630",
                    "0",
                    "13879207347271870224717046555319043223125477330458676583164031510927478750468",
                    "0",
                    "1",
                    "13852765802147329625940085470205307733063892555861170635949846132558939730611",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0",
                    "0"
                ]
            }
        ]
    },
    "from": "did:iden3:privado:main:2Sjj9krzCLvDKrh2JFFzEdzzckdjkbc56t4jVBz1Jj",
    "to": "did:iden3:polygon:amoy:xCkXubP2T1zsUQpFLwczwfbWpdBYBxmJDtUTWAUCE"
};

async function main() {
    // Get network name from Hardhat
    const networkName = hre.network.name;
    console.log(`Running on network: ${networkName}`);
    const requestId = 1;

    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Signer address: ${signer.address}`);

    // Format the proof
    const formattedProof = formatZKPProofForContract(proofResponse, requestId);

    console.log(`Proof formatted:`);
    console.log(`  - Request ID: ${formattedProof.requestId}`);
    console.log(`  - Inputs length: ${formattedProof.inputs.length}`);

    const loyaltyDeployment = require('./deployments_output/deploy_output_2484_loyalty.json');
    const loyaltyAddress = loyaltyDeployment.loyalty;

    // The validator address for the specific chain and circuit
    const validatorAddressSig = '0xF0c6Ff8dA7caeF33aDa796FD57A497af70a40814'; // u2u SIG Validator

    const loyaltyContract = await ethers.getContractAt('Loyalty', loyaltyAddress);
    console.log('Loyalty contract attached to:', await loyaltyContract.getAddress());

    try {
        // Submit the proof
        console.log(`📤 Submitting ZKP proof...`);
        console.log('inputs', formattedProof.inputs);
        const tx = await loyaltyContract.submitZKPResponse(
            formattedProof.requestId,
            formattedProof.inputs,
            formattedProof.a,
            formattedProof.b,
            formattedProof.c,
            {
                gasLimit: 1500000
            }
        );

        console.log(`Transaction submitted: ${tx.hash}`);
        console.log(`Waiting for confirmation...`);

        // Wait for transaction confirmation
        await tx.wait();

        console.log(`ZKP proof submitted successfully!`);

    } catch (error: any) {
        console.error(`Error submitting proof:`);
        console.error(error.message);

        throw error;
    }
}

// Enhanced error handling and cleanup
main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error)
        process.exit(1);
    });
