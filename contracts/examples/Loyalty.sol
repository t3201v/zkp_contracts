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
    // Placeholder Request ID for the identity-only proof
    uint64 public constant IDENTITY_VERIFICATION_REQUEST_ID = 1;

    // Mapping from user's identity ID (from ZKP) to their wallet address
    mapping(uint256 => address) public idToAddress;
    // Mapping from wallet address to identity ID
    mapping(address => uint256) public addressToId;
    // On-chain record of points awarded to each user
    mapping(address => uint256) public pointBalance;

    // Conversion rate from points to the smallest unit of native token (e.g., wei)
    uint256 public pointsToTokenRate;

    // --- Events ---
    event PointsCredited(address indexed user, uint256 amount);
    event TokensClaimed(address indexed user, uint256 pointsClaimed, uint256 amountSent);

    /**
     * @dev Initializes the contract.
     */
    function initialize(address _stateContractAddr, address _initialOwner, uint256 rate) public initializer {
        __Ownable_init(_initialOwner);
        __EmbeddedZKPVerifier_init(_initialOwner, IState(_stateContractAddr));
        pointsToTokenRate = rate;
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
        if (requestId == IDENTITY_VERIFICATION_REQUEST_ID) {
            uint256 userId = inputs[1]; // As per standard Polygon ID circuit outputs
            address sender = _msgSender();

            // Link the identity if it's the first time for both the ID and the address
            if (idToAddress[userId] == address(0) && addressToId[sender] == 0) {
                idToAddress[userId] = sender;
                addressToId[sender] = userId;
                // Mint points for the user
                _creditPoints(sender, 1000000);
            }
        }
    }

    /**
     * @dev Allows a user who has proven their identity to claim tokens for their points.
     */
    function claimTokens() public {
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
}