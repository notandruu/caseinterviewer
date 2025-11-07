// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * CaseInterviewSession
 *
 * Users stake ETH to start a session. If their final score meets the threshold,
 * the stake is returned. Below threshold, it is kept as protocol revenue.
 *
 * Flow:
 *   1. User calls startSession(sessionId) with ETH attached
 *   2. Interview runs off-chain (OpenAI Realtime)
 *   3. Server calls completeSession(sessionId, score) via admin key
 *   4. Contract refunds stake if score >= scoreThreshold, otherwise retains it
 *
 * Owner can update sessionPrice, scoreThreshold, and withdraw accumulated fees.
 */
contract CaseInterviewSession {
    address public owner;
    uint256 public sessionPrice;
    uint8 public scoreThreshold;

    struct Session {
        address user;
        uint256 stakeAmount;
        uint256 startTime;
        bool completed;
        bool refunded;
        uint8 finalScore;
    }

    mapping(bytes32 => Session) public sessions;

    event SessionStarted(bytes32 indexed sessionId, address indexed user, uint256 stake);
    event SessionCompleted(bytes32 indexed sessionId, address indexed user, uint8 score, bool passed, bool refunded);
    event FeeWithdrawn(address indexed to, uint256 amount);

    error SessionAlreadyExists();
    error SessionNotFound();
    error SessionAlreadyCompleted();
    error InsufficientStake();
    error OnlyOwner();
    error OnlyAdmin();
    error RefundFailed();
    error WithdrawFailed();

    address public admin;

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin && msg.sender != owner) revert OnlyAdmin();
        _;
    }

    constructor(uint256 _sessionPrice, uint8 _scoreThreshold, address _admin) {
        owner = msg.sender;
        sessionPrice = _sessionPrice;
        scoreThreshold = _scoreThreshold;
        admin = _admin;
    }

    /**
     * Start a session by staking ETH.
     * sessionId is a bytes32 derived from the off-chain interview record ID.
     */
    function startSession(bytes32 sessionId) external payable {
        if (sessions[sessionId].user != address(0)) revert SessionAlreadyExists();
        if (msg.value < sessionPrice) revert InsufficientStake();

        sessions[sessionId] = Session({
            user: msg.sender,
            stakeAmount: msg.value,
            startTime: block.timestamp,
            completed: false,
            refunded: false,
            finalScore: 0
        });

        emit SessionStarted(sessionId, msg.sender, msg.value);
    }

    /**
     * Complete a session. Called by the server after scoring.
     * score is 0-100. If >= scoreThreshold, stake is returned.
     */
    function completeSession(bytes32 sessionId, uint8 score) external onlyAdmin {
        Session storage session = sessions[sessionId];
        if (session.user == address(0)) revert SessionNotFound();
        if (session.completed) revert SessionAlreadyCompleted();

        session.completed = true;
        session.finalScore = score;

        bool passed = score >= scoreThreshold;

        if (passed) {
            session.refunded = true;
            (bool ok,) = session.user.call{value: session.stakeAmount}("");
            if (!ok) revert RefundFailed();
        }

        emit SessionCompleted(sessionId, session.user, score, passed, passed);
    }

    /**
     * Emergency refund for stuck sessions (owner only).
     */
    function emergencyRefund(bytes32 sessionId) external onlyOwner {
        Session storage session = sessions[sessionId];
        if (session.user == address(0)) revert SessionNotFound();
        if (session.refunded) return;

        session.refunded = true;
        session.completed = true;

        (bool ok,) = session.user.call{value: session.stakeAmount}("");
        if (!ok) revert RefundFailed();
    }

    /**
     * Withdraw accumulated protocol fees.
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit FeeWithdrawn(to, amount);
    }

    function updateSessionPrice(uint256 newPrice) external onlyOwner {
        sessionPrice = newPrice;
    }

    function updateScoreThreshold(uint8 newThreshold) external onlyOwner {
        scoreThreshold = newThreshold;
    }

    function updateAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }

    function getSession(bytes32 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    receive() external payable {}
}
