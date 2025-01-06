const { ethers } = require("hardhat");
const assert = require("assert");

describe("NFTMarketplace", function () {
  let NFTMarketplace, nftMarketplace, deployer, user1, user2;
  let listingFee, tokenURI;

  beforeEach(async function () {
    console.log("\n🔄 Setting up the test environment...");

    [deployer, user1, user2] = await ethers.getSigners();

    // Display signers for clarity
    console.log("👤 Deployer:", deployer.address);
    console.log("👤 User1:", user1.address);
    console.log("👤 User2:", user2.address);

    // Use ethers@6 syntax
    listingFee = ethers.parseEther("0.025");
    tokenURI = "ipfs://token-metadata-uri";

    NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();

    console.log("✅ Contract deployed at:", await nftMarketplace.getAddress());
  });

  /// ✅ Test Case 1: Contract Deployment
  it("Should deploy the contract and set the marketplace owner", async function () {
    console.log("\n🛠️ Testing Contract Deployment...");

    const owner = await nftMarketplace.marketplaceOwner();
    console.log("👑 Marketplace Owner:", owner);
    console.log("✅ Expected Owner:", deployer.address);

    assert.strictEqual(owner, deployer.address, "Owner is not the deployer");
  });

  /// ✅ Test Case 2: Mint an NFT
  it("Should mint a new NFT", async function () {
    console.log("\n🖼️ Testing Minting NFT...");

    const tx = await nftMarketplace
      .connect(user1)
      .mintNFT(tokenURI, ethers.parseEther("1"), { value: listingFee });
    await tx.wait();

    console.log("✅ NFT Minted by:", user1.address);
    console.log("🔗 Token URI:", tokenURI);

    const marketItem = await nftMarketplace.idToMarketItem(1);
    console.log("📊 Market Item Details:");
    console.log("Token ID:", marketItem.tokenId.toString());
    console.log("Seller:", marketItem.seller);
    console.log("Owner:", marketItem.owner);
    console.log("Price:", marketItem.price.toString());

    assert.strictEqual(marketItem.tokenId.toString(), "1", "Token ID mismatch");
    assert.strictEqual(marketItem.seller, user1.address, "Seller mismatch");
    assert.strictEqual(
      marketItem.price.toString(),
      ethers.parseEther("1").toString(),
      "Price mismatch"
    );
  });

  /// ✅ Test Case 3: List an NFT for Sale
  it("Should list an NFT for sale", async function () {
    console.log("\n📤 Testing Listing NFT for Sale...");

    await nftMarketplace
      .connect(user1)
      .mintNFT(tokenURI, ethers.parseEther("1"), { value: listingFee });

    const tx = await nftMarketplace
      .connect(user1)
      .listNFT(1, ethers.parseEther("2"), { value: listingFee });
    await tx.wait();

    console.log("✅ NFT Listed for Sale by:", user1.address);
    console.log("💲 Listing Price:", ethers.formatEther("2"));

    const marketItem = await nftMarketplace.idToMarketItem(1);
    console.log("📊 Market Item After Listing:");
    console.log("Listed:", marketItem.listed);
    console.log("Price:", marketItem.price.toString());

    assert.strictEqual(marketItem.listed, true, "NFT is not listed");
    assert.strictEqual(
      marketItem.price.toString(),
      ethers.parseEther("2").toString(),
      "Listing price mismatch"
    );
  });

  /// ✅ Test Case 4: Prevent Non-Owner from Listing an NFT
  it("Should not allow a non-owner to list an NFT", async function () {
    console.log("\n🚫 Testing Non-Owner Listing Restriction...");

    await nftMarketplace
      .connect(user1)
      .mintNFT(tokenURI, ethers.parseEther("1"), { value: listingFee });

    try {
      await nftMarketplace
        .connect(user2)
        .listNFT(1, ethers.parseEther("2"), { value: listingFee });
      assert.fail("Non-owner was able to list an NFT");
    } catch (error) {
      console.log("✅ Error Message:", error.message);
      assert(
        error.message.includes("You must own the NFT"),
        "Incorrect error message"
      );
    }
  });

  /// ✅ Test Case 5: Buy an NFT
  it("Should allow a user to buy an NFT", async function () {
    console.log("\n💸 Testing Buying an NFT...");

    await nftMarketplace
      .connect(user1)
      .mintNFT(tokenURI, ethers.parseEther("1"), { value: listingFee });

    await nftMarketplace
      .connect(user1)
      .listNFT(1, ethers.parseEther("1"), { value: listingFee });

    const sellerBalanceBefore = await ethers.provider.getBalance(user1.address);
    await nftMarketplace
      .connect(user2)
      .buyNFT(1, { value: ethers.parseEther("1") });
    const sellerBalanceAfter = await ethers.provider.getBalance(user1.address);

    console.log("✅ NFT Purchased by:", user2.address);
    console.log(
      "💰 Seller Balance Before:",
      ethers.formatEther(sellerBalanceBefore)
    );
    console.log(
      "💰 Seller Balance After:",
      ethers.formatEther(sellerBalanceAfter)
    );

    const marketItem = await nftMarketplace.idToMarketItem(1);
    console.log("📊 Market Item After Purchase:");
    console.log("Owner:", marketItem.owner);
    console.log("Sold:", marketItem.sold);

    // Comparison with BigInt syntax
    assert(
      sellerBalanceAfter > sellerBalanceBefore,
      "Seller balance did not increase"
    );

    assert.strictEqual(
      marketItem.owner,
      user2.address,
      "Ownership transfer failed"
    );
    assert.strictEqual(marketItem.sold, true, "NFT was not marked as sold");
  });
});
