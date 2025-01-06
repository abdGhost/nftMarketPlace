const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMarketplace", function () {
  let NFTMarketplace, nftMarketplace, owner, user1, user2;
  let listingFee, tokenURI;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();

    listingFee = ethers.parseEther("0.025");
    tokenURI = "ipfs://sample-token-uri";
  });

  /// ✅ Test Case 1: Contract Deployment
  it("Should deploy the contract and set the marketplace owner", async function () {
    const marketplaceOwner = await nftMarketplace.marketplaceOwner();
    console.log("\n✅ Marketplace Owner Address:", marketplaceOwner);
    expect(marketplaceOwner).to.equal(owner.address);
  });

  /// ✅ Test Case 2: Create a Collection
  it("Should allow a user to create a collection", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Test Collection", "TEST");
    const collection = await nftMarketplace.idToCollection(1);

    console.log("\n✅ Collection Created:");
    console.log("  📦 Name:", collection.name);
    console.log("  🏷️ Symbol:", collection.symbol);
    console.log("  👤 Owner:", collection.owner);

    expect(collection.name).to.equal("Test Collection");
    expect(collection.symbol).to.equal("TEST");
    expect(collection.owner).to.equal(user1.address);
  });

  /// ✅ Test Case 3: Mint an NFT in a Collection
  it("Should mint an NFT in a collection", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Test Collection", "TEST");

    await nftMarketplace
      .connect(user1)
      .mintNFT(1, tokenURI, ethers.parseEther("1"), { value: listingFee });

    const marketItem = await nftMarketplace.idToMarketItem(1);

    console.log("\n✅ NFT Minted:");
    console.log("  🆔 Token ID:", marketItem.tokenId.toString());
    console.log("  📦 Price:", ethers.formatEther(marketItem.price));
    console.log("  👤 Seller:", marketItem.seller);

    expect(marketItem.tokenId).to.equal(1);
    expect(marketItem.price).to.equal(ethers.parseEther("1"));
    expect(marketItem.seller).to.equal(user1.address);
  });

  /// ✅ Test Case 4: Batch Mint NFTs
  it("Should batch mint NFTs in a collection", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Batch Collection", "BATCH");

    const tokenURIs = ["ipfs://uri1", "ipfs://uri2"];
    const prices = [ethers.parseEther("1"), ethers.parseEther("2")];
    const totalFee = listingFee * BigInt(tokenURIs.length);

    await nftMarketplace
      .connect(user1)
      .batchMintNFT(1, tokenURIs, prices, { value: totalFee });

    const marketItem1 = await nftMarketplace.idToMarketItem(1);
    const marketItem2 = await nftMarketplace.idToMarketItem(2);

    console.log("\n✅ Batch NFTs Minted:");
    console.log("  🆔 Token 1 Price:", ethers.formatEther(marketItem1.price));
    console.log("  👤 Seller Token 1:", marketItem1.seller);
    console.log("  🆔 Token 2 Price:", ethers.formatEther(marketItem2.price));
    console.log("  👤 Seller Token 2:", marketItem2.seller);

    expect(marketItem1.price).to.equal(ethers.parseEther("1"));
    expect(marketItem2.price).to.equal(ethers.parseEther("2"));
  });

  /// ✅ Test Case 5: List an NFT for Sale
  it("Should allow a user to list their NFT for sale", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("List Collection", "LIST");
    await nftMarketplace
      .connect(user1)
      .mintNFT(1, tokenURI, ethers.parseEther("1"), { value: listingFee });

    await nftMarketplace
      .connect(user1)
      .listNFT(1, ethers.parseEther("2"), { value: listingFee });

    const marketItem = await nftMarketplace.idToMarketItem(1);

    console.log("\n✅ NFT Listed for Sale:");
    console.log("  🆔 Token ID:", marketItem.tokenId.toString());
    console.log("  📦 Price:", ethers.formatEther(marketItem.price));
    console.log("  📊 Listed:", marketItem.listed);

    expect(marketItem.listed).to.be.true;
    expect(marketItem.price).to.equal(ethers.parseEther("2"));
  });

  /// ✅ Test Case 6: Prevent Non-Owner from Listing
  it("Should prevent a non-owner from listing an NFT", async function () {
    await nftMarketplace.connect(user1).createCollection("Invalid List", "INV");
    await nftMarketplace
      .connect(user1)
      .mintNFT(1, tokenURI, ethers.parseEther("1"), { value: listingFee });

    await expect(
      nftMarketplace
        .connect(user2)
        .listNFT(1, ethers.parseEther("2"), { value: listingFee })
    ).to.be.revertedWith("You must own the NFT");

    console.log("\n❌ Non-Owner Prevented from Listing NFT (as expected).");
  });

  /// ✅ Test Case 7: Buy an NFT
  it("Should allow a user to buy a listed NFT", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Buy Collection", "BUY");
    await nftMarketplace
      .connect(user1)
      .mintNFT(1, tokenURI, ethers.parseEther("1"), { value: listingFee });
    await nftMarketplace
      .connect(user1)
      .listNFT(1, ethers.parseEther("1"), { value: listingFee });

    await nftMarketplace
      .connect(user2)
      .buyNFT(1, { value: ethers.parseEther("1") });

    const marketItem = await nftMarketplace.idToMarketItem(1);

    console.log("\n✅ NFT Purchased:");
    console.log("  🆔 Token ID:", marketItem.tokenId.toString());
    console.log("  👤 New Owner:", marketItem.owner);
    console.log("  📊 Sold Status:", marketItem.sold);

    expect(marketItem.sold).to.be.true;
  });

  /// ✅ Test Case 8: Create an Auction
  it("Should allow a user to create an auction", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Auction Collection", "AUC");
    await nftMarketplace
      .connect(user1)
      .mintNFT(1, tokenURI, ethers.parseEther("1"), { value: listingFee });

    await nftMarketplace
      .connect(user1)
      .createAuction(1, ethers.parseEther("1"), 86400); // 1 day

    const marketItem = await nftMarketplace.idToMarketItem(1);

    console.log("\n✅ Auction Created:");
    console.log("  🆔 Token ID:", marketItem.tokenId.toString());
    console.log("  📦 Starting Price:", ethers.formatEther(marketItem.price));
    console.log("  📊 Listed:", marketItem.listed);

    expect(marketItem.listed).to.be.true;
  });
});
