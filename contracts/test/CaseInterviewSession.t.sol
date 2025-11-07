// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CaseInterviewSession.sol";

contract CaseInterviewSessionTest is Test {
    CaseInterviewSession public contract_;
    address public owner = address(1);
    address public admin = address(2);
    address public user = address(3);

    uint256 constant SESSION_PRICE = 0.001 ether;
    uint8 constant SCORE_THRESHOLD = 70;
    bytes32 constant SESSION_ID = keccak256("test-session-1");

    function setUp() public {
        vm.deal(owner, 10 ether);
        vm.deal(user, 10 ether);

        vm.prank(owner);
        contract_ = new CaseInterviewSession(SESSION_PRICE, SCORE_THRESHOLD, admin);
    }

    function test_StartSession() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        CaseInterviewSession.Session memory session = contract_.getSession(SESSION_ID);
        assertEq(session.user, user);
        assertEq(session.stakeAmount, SESSION_PRICE);
        assertFalse(session.completed);
    }

    function test_StartSession_InsufficientStake() public {
        vm.prank(user);
        vm.expectRevert(CaseInterviewSession.InsufficientStake.selector);
        contract_.startSession{value: SESSION_PRICE - 1}(SESSION_ID);
    }

    function test_StartSession_DuplicateId() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        vm.prank(user);
        vm.expectRevert(CaseInterviewSession.SessionAlreadyExists.selector);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);
    }

    function test_CompleteSession_Pass_RefundsStake() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        uint256 balanceBefore = user.balance;

        vm.prank(admin);
        contract_.completeSession(SESSION_ID, 80);

        CaseInterviewSession.Session memory session = contract_.getSession(SESSION_ID);
        assertTrue(session.completed);
        assertTrue(session.refunded);
        assertEq(session.finalScore, 80);
        assertEq(user.balance, balanceBefore + SESSION_PRICE);
    }

    function test_CompleteSession_Fail_KeepsStake() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        uint256 balanceBefore = user.balance;
        uint256 contractBalanceBefore = address(contract_).balance;

        vm.prank(admin);
        contract_.completeSession(SESSION_ID, 50);

        CaseInterviewSession.Session memory session = contract_.getSession(SESSION_ID);
        assertTrue(session.completed);
        assertFalse(session.refunded);
        assertEq(session.finalScore, 50);
        assertEq(user.balance, balanceBefore);
        assertEq(address(contract_).balance, contractBalanceBefore);
    }

    function test_CompleteSession_AtThreshold_Passes() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        uint256 balanceBefore = user.balance;

        vm.prank(admin);
        contract_.completeSession(SESSION_ID, SCORE_THRESHOLD);

        assertEq(user.balance, balanceBefore + SESSION_PRICE);
    }

    function test_CompleteSession_OnlyAdmin() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        vm.prank(user);
        vm.expectRevert(CaseInterviewSession.OnlyAdmin.selector);
        contract_.completeSession(SESSION_ID, 80);
    }

    function test_EmergencyRefund() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        uint256 balanceBefore = user.balance;

        vm.prank(owner);
        contract_.emergencyRefund(SESSION_ID);

        assertEq(user.balance, balanceBefore + SESSION_PRICE);
    }

    function test_WithdrawFees() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        vm.prank(admin);
        contract_.completeSession(SESSION_ID, 50);

        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        contract_.withdrawFees(owner, SESSION_PRICE);

        assertEq(owner.balance, ownerBalanceBefore + SESSION_PRICE);
    }

    function test_OwnerCanCompleteSession() public {
        vm.prank(user);
        contract_.startSession{value: SESSION_PRICE}(SESSION_ID);

        vm.prank(owner);
        contract_.completeSession(SESSION_ID, 75);

        CaseInterviewSession.Session memory session = contract_.getSession(SESSION_ID);
        assertTrue(session.completed);
    }
}
