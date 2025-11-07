// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CaseInterviewSession.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address adminAddress = vm.envAddress("PAYMENT_ADMIN_ADDRESS");

        // 0.001 ETH stake per session (~$3 at $3000/ETH)
        uint256 sessionPrice = 0.001 ether;
        // Score threshold: 70% to get stake back
        uint8 scoreThreshold = 70;

        vm.startBroadcast(deployerPrivateKey);

        CaseInterviewSession contractInstance = new CaseInterviewSession(
            sessionPrice,
            scoreThreshold,
            adminAddress
        );

        vm.stopBroadcast();

        console.log("CaseInterviewSession deployed at:", address(contractInstance));
        console.log("Session price:", sessionPrice);
        console.log("Score threshold:", scoreThreshold);
        console.log("Admin:", adminAddress);
    }
}
