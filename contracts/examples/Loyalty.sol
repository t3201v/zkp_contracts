// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {IState} from "@iden3/contracts/interfaces/IState.sol";
import {EmbeddedZKPVerifier} from "@iden3/contracts/verifiers/EmbeddedZKPVerifier.sol";
import {ICircuitValidator} from "@iden3/contracts/interfaces/ICircuitValidator.sol";
import {PrimitiveTypeUtils} from "@iden3/contracts/lib/PrimitiveTypeUtils.sol";

/**
 * @title Loyalty
 * @dev Manages loyalty points and allows users to claim native tokens.
 * This contract uses a decoupled ZKP verification pattern. Users first prove their
 * identity, linking their off-chain ID to their on-chain address. Then, they can
 * claim tokens based on points awarded to them by the owner.
 */
contract Loyalty is Ownable2StepUpgradeable, EmbeddedZKPVerifier {
    uint64 public constant SUBMIT_REQUEST_ID_SIG_VALIDATOR = 1;
    uint64 public constant SUBMIT_REQUEST_ID_MTP_VALIDATOR = 2;

    // Mapping from user's identity ID (from ZKP) to their wallet address
    mapping(uint256 => address) public idToAddress;
    // Mapping from wallet address to identity ID
    mapping(address => uint256) public addressToId;
    // On-chain record of points awarded to each user
    mapping(address => uint256) public pointBalance;
    // Mapping to track if a user's proof has been validated for a specific request ID
    mapping(address => mapping(uint64 => bool)) public proofsVerified;
    // Mapping to track owner-allowed request IDs
    mapping(uint64 => bool) public allowedRequestIds;
    // Mapping to track if a user has a verified proof
    mapping(address => bool) public hasVerifiedProof;

    // Conversion rate from points to the smallest unit of native token (e.g., wei)
    uint256 public pointsToTokenRate;

    // --- Events ---
    event PointsCredited(address indexed user, uint256 amount);
    event TokensClaimed(address indexed user, uint256 pointsClaimed, uint256 amountSent);
    event AllowedRequestIdSet(uint64 indexed requestId, bool allowed);

    /**
     * @dev Initializes the contract.
     */
    function initialize(address _stateContractAddr, address _initialOwner, uint256 rate) public initializer {
        __Ownable_init(_initialOwner);
        __EmbeddedZKPVerifier_init(_initialOwner, IState(_stateContractAddr));
        pointsToTokenRate = rate;
    }

    /**
     * @dev Sets an allowed request ID
     */
    function setAllowedRequestId(uint64 requestId, bool allowed) public onlyOwner {
        allowedRequestIds[requestId] = allowed;
        emit AllowedRequestIdSet(requestId, allowed);
    }

    /**
     * @dev Check if user submitted proof on-chain
     */
    modifier beforeClaim(address to) {
        require(
            hasVerifiedProof[to],
            'only identities who provided a valid proof on-chain are allowed to receive loyalty points'
        );
        _;
    }

    // --- ZKP Hooks & Verification Logic ---

    /**
     * @dev Hook executed before a ZKP is submitted.
     * Ensures the proof's challenge matches the sender's address, linking the proof to the caller.
     */
    function _beforeProofSubmit(
        uint64 /* requestId */,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal view override {
        address addr = PrimitiveTypeUtils.uint256LEToAddress(
            inputs[validator.inputIndexOf('challenge')]
        );
        require(_msgSender() == addr, "Address in proof is not sender's address");
    }

    /**
     * @dev Hook executed after a ZKP is successfully verified.
     * If it's an identity proof, it links the user's identity ID to their wallet address.
     */
    function _afterProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator /* validator */
    ) internal override {
        if (requestId == SUBMIT_REQUEST_ID_SIG_VALIDATOR || requestId == SUBMIT_REQUEST_ID_MTP_VALIDATOR || allowedRequestIds[requestId]) {
            uint256 userId = inputs[1]; // As per standard Polygon ID circuit outputs
            address sender = _msgSender();

            // Link the identity if it's the first time for both the ID and the address
            if (idToAddress[userId] == address(0) && addressToId[sender] == 0) {
                idToAddress[userId] = sender;
                addressToId[sender] = userId;
                // Mint points for the user
                _creditPoints(sender, 1000000);
            }
            proofsVerified[sender][requestId] = true;
            hasVerifiedProof[sender] = true;
        }
    }

    /**
     * @dev Allows a user who has proven their identity to claim tokens for their points.
     */
    function claimTokens() public beforeClaim(msg.sender) {
        address user = _msgSender();
        uint256 pointsToClaim = pointBalance[user];

        require(addressToId[user] != 0, "User identity not verified");
        require(pointsToClaim > 0, "No points to claim");

        uint256 amountToSend = pointsToClaim * pointsToTokenRate;
        require(address(this).balance >= amountToSend, "Insufficient contract balance");

        // Reset balance and send tokens
        pointBalance[user] = 0;
        (bool success, ) = user.call{value: amountToSend}("");
        require(success, "Native token transfer failed");

        emit TokensClaimed(user, pointsToClaim, amountToSend);
    }

    /**
     * @dev Allows a user who has proven their identity to claim a specific amount of tokens for their points.
     */
    function claimSpecificTokens(uint256 pointsToClaim) public beforeClaim(msg.sender) {
        address user = _msgSender();

        require(addressToId[user] != 0, "User identity not verified");
        require(pointBalance[user] >= pointsToClaim, "Insufficient points balance");
        require(pointsToClaim > 0, "No points to claim");

        uint256 amountToSend = pointsToClaim * pointsToTokenRate;
        require(address(this).balance >= amountToSend, "Insufficient contract balance");

        // Decrease balance and send tokens
        pointBalance[user] -= pointsToClaim;
        (bool success, ) = user.call{value: amountToSend}("");
        require(success, "Native token transfer failed");

        emit TokensClaimed(user, pointsToClaim, amountToSend);
    }

    /**
     * @dev Called by the owner to award points to a user.
     */
    function creditPoints(address user, uint256 pointsToAward) public onlyOwner {
        _creditPoints(user, pointsToAward);
    }

    /**
     * @dev Sets the conversion rate from points to tokens. Only owner.
     */
    function setPointsToTokenRate(uint256 _rate) public onlyOwner {
        pointsToTokenRate = _rate;
    }

    /**
     * @dev Allows the contract to receive native tokens.
     */
    receive() external payable {}

    /**
     * @dev Internal function to credit points to a user.
     */
    function _creditPoints(address user, uint256 pointsToAward) internal {
        pointBalance[user] += pointsToAward;
        emit PointsCredited(user, pointsToAward);
    }

    /**
     * @dev Allows the owner to withdraw funds from the contract.
     */
    function withdraw(uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Native token transfer failed");
    }
}