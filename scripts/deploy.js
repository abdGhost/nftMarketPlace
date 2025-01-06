async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with account:", deployer.address);

  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const nftMarketplace = await NFTMarketplace.deploy();

  console.log("Waiting for deployment...");
  await nftMarketplace.waitForDeployment(); // Replace deployed with waitForDeployment

  console.log(
    "NFT Marketplace deployed at:",
    await nftMarketplace.getAddress()
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
