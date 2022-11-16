import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, upgrades } from "hardhat";
import {
    Token,
    TokenUpgradeableV1,
    TokenUpgradeableV2,
    Token__factory,
    TokenUpgradeableV1__factory,
    TokenUpgradeableV2Wrong__factory,
    TokenUpgradeableV2__factory
} from "../typechain-types";

chaiUse(chaiAsPromised);

const MINT_TEST_VALUE = 1;

describe("Upgrade", async () => {
    let tokenFactory: Token__factory;
    let tokenUpgradeableV1Factory: TokenUpgradeableV1__factory;
    let tokenUpgradeableV2WrongFactory: TokenUpgradeableV2Wrong__factory;
    let tokenUpgradeableV2Factory: TokenUpgradeableV2__factory;

    let accounts: SignerWithAddress[];

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        const [ 
            tokenFactory_,
            tokenUpgradeableV1Factory_,
            tokenUpgradeableV2WrongFactory_,
            tokenUpgradeableV2Factory_
        ] = await Promise.all([
            ethers.getContractFactory("Token"),
            ethers.getContractFactory("TokenUpgradeableV1"),
            ethers.getContractFactory("TokenUpgradeableV2Wrong"),
            ethers.getContractFactory("TokenUpgradeableV2")
        ]);

        tokenFactory = tokenFactory_ as Token__factory;
        tokenUpgradeableV1Factory = tokenUpgradeableV1Factory_ as TokenUpgradeableV1__factory;
        tokenUpgradeableV2WrongFactory = tokenUpgradeableV2WrongFactory_ as TokenUpgradeableV2Wrong__factory;
        tokenUpgradeableV2Factory = tokenUpgradeableV2Factory_ as TokenUpgradeableV2__factory;
    });

    describe("When deploying the common ERC20 token", async () => {
        let token: Token;
        beforeEach(async () => {
            token = await tokenFactory.deploy();
            await token.deployed();
        });

        it("Mints tokens correctly using valid minter", async () => {
            const totalSupplyBefore = await token.totalSupply();
            const mintTx = await token.mint(accounts[0].address, ethers.utils.parseEther(MINT_TEST_VALUE.toFixed(18)));
            await mintTx.wait();
            const totalSupplyAfter = await token.totalSupply();
            const diff = totalSupplyAfter.sub(totalSupplyBefore);
            expect(Number(ethers.utils.formatEther(diff))).to.eq(MINT_TEST_VALUE);
            const balanceAfter = await token.balanceOf(accounts[0].address);
            expect(Number(ethers.utils.formatEther(balanceAfter))).to.eq(MINT_TEST_VALUE);
        });
    });

    describe("When trying to upgrade", async () => {
        it("Fails", async () => {
            await expect(upgrades.deployProxy(tokenFactory)).to.eventually.be.rejected;
        });
    });

    describe("When deploying the upgradeable ERC20 token", async () => {
        let tokenProxy: TokenUpgradeableV1;

        beforeEach(async () => {
            const tokenProxy_ = await upgrades.deployProxy(tokenUpgradeableV1Factory);
            tokenProxy = tokenProxy_ as TokenUpgradeableV1;
        });

        describe("When the contract is deployed", async () => {
            it("Mints tokens correctly using valid minter", async () => {
                const totalSupplyBefore = await tokenProxy.totalSupply();
                const mintTx = await tokenProxy.mint(accounts[0].address, ethers.utils.parseEther(MINT_TEST_VALUE.toFixed(18)));
                await mintTx.wait();
                const totalSupplyAfter = await tokenProxy.totalSupply();
                const diff = totalSupplyAfter.sub(totalSupplyBefore);
                expect(Number(ethers.utils.formatEther(diff))).to.eq(MINT_TEST_VALUE);
                const balanceAfter = await tokenProxy.balanceOf(accounts[0].address);
                expect(Number(ethers.utils.formatEther(balanceAfter))).to.eq(MINT_TEST_VALUE);
            });
        });

        describe("When the upgrade contract is wrong", async () => {
            it("Fails", async () => {
                await expect(upgrades.upgradeProxy(tokenProxy.address, tokenUpgradeableV2WrongFactory)).to.eventually.be.rejectedWith("New storage layout is incompatible");
            })
        })
    });
});