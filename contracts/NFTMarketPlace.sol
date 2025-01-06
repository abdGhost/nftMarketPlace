// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract NFTMarketplace is ERC721URIStorage, ERC2981, ReentrancyGuard {
    uint256 private _tokenIds; // Tracks NFT IDs
    uint256 private _itemsSold; // Tracks sold NFTs
    uint256 private _collectionIds; // Tracks collection IDs

    address payable public marketplaceOwner;
    uint256 public listingFee = 0.025 ether;

    struct MarketItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool listed;
    }

    struct Collection {
        uint256 collectionId;
        string name;
        string symbol;
        address owner;
    }

    mapping(uint256 => MarketItem) public idToMarketItem;
    mapping(uint256 => Collection) public idToCollection;
    mapping(uint256 => uint256) public tokenIdToCollectionId;

    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    event CollectionCreated(
        uint256 indexed collectionId,
        string name,
        string symbol,
        address owner
    );

    event AuctionCreated(
        uint256 indexed tokenId,
        uint256 startingPrice,
        uint256 endTime
    );

    constructor() ERC721("MarketplaceNFT", "MNFT") {
        marketplaceOwner = payable(msg.sender);
        _setDefaultRoyalty(msg.sender, 500); // 5% royalty
    }

    /// @notice Supports Interface Override
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Create a new NFT collection
    function createCollection(string memory name, string memory symbol) public {
        _collectionIds++;
        uint256 newCollectionId = _collectionIds;

        idToCollection[newCollectionId] = Collection(
            newCollectionId,
            name,
            symbol,
            msg.sender
        );

        emit CollectionCreated(newCollectionId, name, symbol, msg.sender);
    }

    /// @notice Mint a new NFT in a collection
    function mintNFT(uint256 collectionId, string memory tokenURI, uint256 price)
        public
        payable
        returns (uint256)
    {
        require(price > 0, "Price must be greater than zero");
        require(msg.value == listingFee, "Listing fee must be paid");
        require(idToCollection[collectionId].owner == msg.sender, "You must own the collection");

        return _mintNFT(collectionId, tokenURI, price);
    }

    /// @dev Internal mint function used for batch minting
    function _mintNFT(uint256 collectionId, string memory tokenURI, uint256 price)
        internal
        returns (uint256)
    {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        tokenIdToCollectionId[newTokenId] = collectionId;

        idToMarketItem[newTokenId] = MarketItem(
            newTokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            true
        );

        emit MarketItemCreated(newTokenId, msg.sender, address(this), price, false);

        return newTokenId;
    }

    /// @notice Batch mint NFTs in a collection
    function batchMintNFT(
        uint256 collectionId,
        string[] memory tokenURIs,
        uint256[] memory prices
    ) public payable {
        require(tokenURIs.length == prices.length, "Mismatched inputs");
        uint256 totalFee = listingFee * tokenURIs.length;
        require(msg.value == totalFee, "Incorrect total listing fee");

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            _mintNFT(collectionId, tokenURIs[i], prices[i]);
        }
    }

    /// @notice List an existing NFT for sale
    function listNFT(uint256 tokenId, uint256 price) public payable {
        require(ownerOf(tokenId) == msg.sender, "You must own the NFT");
        require(price > 0, "Price must be greater than zero");
        require(msg.value == listingFee, "Listing fee must be paid");

        idToMarketItem[tokenId] = MarketItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            true
        );

        _transfer(msg.sender, address(this), tokenId);

        emit MarketItemCreated(tokenId, msg.sender, address(this), price, false);
    }

    /// @notice Create an auction for an NFT
    function createAuction(uint256 tokenId, uint256 startingPrice, uint256 duration) public {
        require(ownerOf(tokenId) == msg.sender, "You must own the NFT");
        require(duration > 0, "Duration must be greater than zero");
        require(startingPrice > 0, "Starting price must be greater than zero");

        idToMarketItem[tokenId].price = startingPrice;
        idToMarketItem[tokenId].listed = true;
        idToMarketItem[tokenId].sold = false;

        emit AuctionCreated(tokenId, startingPrice, block.timestamp + duration);
    }

    /// @notice Buy an NFT
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        MarketItem storage item = idToMarketItem[tokenId];
        require(item.listed, "Item is not listed for sale");
        require(msg.value >= item.price, "Not enough funds to buy NFT");

        address payable seller = item.seller;

        item.owner = payable(msg.sender);
        item.sold = true;
        item.listed = false;
        _itemsSold++;

        _transfer(address(this), msg.sender, tokenId);

        seller.transfer(item.price);
        marketplaceOwner.transfer(listingFee);
    }
}
