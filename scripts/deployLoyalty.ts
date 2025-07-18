import fs from 'fs';
import { ethers, run } from 'hardhat';
import path from 'path';

const chainIdMapping = {
  'polygon-mumbai': 80001,
  'linea-sepolia': 59141,
  'linea': 59144,
  'polygon': 137,
  'amoy': 80002,
  'u2u-testnet': 2484,
}
const chainId = chainIdMapping[process.env.HARDHAT_NETWORK || ''];
const pathOutputJson = path.join(__dirname, `./deployments_output/deploy_output_${chainId}_loyalty.json`);

async function main() {
  // const stateAddress = '0x6f75ED7F8432ffcdb88776D804F73Af49DF5Cde7'; // u2u testnet
  const stateAddress = '0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124'; // amoy
  // const verifierLibAddress = '0x7Da96F77Fc4Ce9B6EAfC07954fCd0aC04B7BEF4a'; // u2u testnet (universal verifier)
  const verifierLibAddress = '0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c'; // amoy

  const [owner] = await ethers.getSigners();

  console.log(`Deploying with owner: ${owner.address}`);

  // Deploy LoyaltyPoint and link the library
  console.log('Deploying Loyalty...');
  const LoyaltyContractFactory = await ethers.getContractFactory('Loyalty', {
    libraries: {
      VerifierLib: verifierLibAddress,
    },
  });
  const loyalty = await LoyaltyContractFactory.deploy();
  await loyalty.waitForDeployment();

  const loyaltyAddress = await loyalty.getAddress();
  console.log('Loyalty deployed to:', loyaltyAddress);

  console.log('Initializing contract...');
  await loyalty.initialize(stateAddress, owner.address, "1");
  console.log('Contract initialized.');

  const outputJson = {
    loyalty: loyaltyAddress,
    stateContract: stateAddress,
    network: process.env.HARDHAT_NETWORK,
  };

  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 2));
  console.log(`Deployment output written to ${pathOutputJson}`);

  // --- VERIFICATION STEP ---
  console.log('Waiting for 5 block confirmations before verification...');
  const deploymentTransaction = loyalty.deploymentTransaction();
  if (deploymentTransaction) {
    await deploymentTransaction.wait(5);
  } else {
    console.log('Could not find deployment transaction to wait for. Proceeding with verification attempt anyway.');
  }

  try {
    console.log('Verifying contract on Etherscan...');
    await run('verify:verify', {
      address: loyaltyAddress,
      constructorArguments: [], // No constructor args, using initializer pattern
    });
    console.log('Contract verified successfully!');
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });