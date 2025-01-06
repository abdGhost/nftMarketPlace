// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ERC721URIStorage, ReentrancyGuard {
    uint256 private _tokenIds; // Tracks NFT IDs
    uint256 private _itemsSold; // Tracks sold NFTs

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

    mapping(uint256 => MarketItem) public idToMarketItem;

    event MarketItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    constructor() ERC721("MarketplaceNFT", "MNFT") {
        marketplaceOwner = payable(msg.sender);
    }

    /// @notice Mint a new NFT
    function mintNFT(string memory tokenURI, uint256 price)
        public
        payable
        returns (uint256)
    {
        require(price > 0, "Price must be greater than zero");
        require(msg.value == listingFee, "Listing fee must be paid");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

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

        // Pay the seller and marketplace fee
        seller.transfer(item.price);
        marketplaceOwner.transfer(listingFee);
    }

    /// @notice Fetch all listed NFTs
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 unsoldItemCount = _tokenIds - _itemsSold;
        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (idToMarketItem[i].owner == address(this)) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }

        return items;
    }

    /// @notice Fetch NFTs owned by the user
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 ownedItemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                ownedItemCount++;
            }
        }

        MarketItem[] memory items = new MarketItem[](ownedItemCount);
        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }

        return items;
    }

    /// @notice Fetch NFTs listed by the user
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 listedItemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (idToMarketItem[i].seller == msg.sender && idToMarketItem[i].listed) {
                listedItemCount++;
            }
        }

        MarketItem[] memory items = new MarketItem[](listedItemCount);
        for (uint256 i = 1; i <= _tokenIds; i++) {
            if (idToMarketItem[i].seller == msg.sender && idToMarketItem[i].listed) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }

        return items;
    }
}
