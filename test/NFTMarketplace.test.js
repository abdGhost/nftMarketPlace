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
    expect(marketplaceOwner).to.equal(owner.address);
  });

  /// ✅ Test Case 2: Create a Collection
  it("Should allow a user to create a collection", async function () {
    await nftMarketplace
      .connect(user1)
      .createCollection("Test Collection", "TEST");
    const collection = await nftMarketplace.idToCollection(1);

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

    const tx = await nftMarketplace
      .connect(user1)
      .batchMintNFT(1, tokenURIs, prices, { value: totalFee });

    await tx.wait();

    const marketItem1 = await nftMarketplace.idToMarketItem(1);
    const marketItem2 = await nftMarketplace.idToMarketItem(2);

    expect(marketItem1.price).to.equal(ethers.parseEther("1"));
    expect(marketItem2.price).to.equal(ethers.parseEther("2"));
    expect(marketItem1.seller).to.equal(user1.address);
    expect(marketItem2.seller).to.equal(user1.address);
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

    const sellerBalanceBefore = await ethers.provider.getBalance(user1.address);

    await nftMarketplace
      .connect(user2)
      .buyNFT(1, { value: ethers.parseEther("1") });

    const marketItem = await nftMarketplace.idToMarketItem(1);
    expect(marketItem.sold).to.be.true;
    expect(marketItem.owner).to.equal(user2.address);

    const sellerBalanceAfter = await ethers.provider.getBalance(user1.address);
    expect(sellerBalanceAfter > sellerBalanceBefore).to.be.true;
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
    expect(marketItem.listed).to.be.true;
    expect(marketItem.price).to.equal(ethers.parseEther("1"));
  });
});
