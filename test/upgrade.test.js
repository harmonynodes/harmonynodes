const { expect } = require("chai");
const { ethers } = require("hardhat");

const bigNum = num=>(num + '0'.repeat(18))
const bigNum_6 = num => (num + '0'.repeat(6))
const smallNum = num=>(parseInt(num)/bigNum(1))
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

describe("Deploying a Hone Token Contract and test their functionalities ", function () {

  before (async function () {
    [
      this.owner,
      this.dev,
      this.feeWallet,
      this.rewardPool,
      this.renter,
    ] = await ethers.getSigners();

    this.ERC20Factory = await ethers.getContractFactory('ERC20Mock');
    this.USDC = await this.ERC20Factory.deploy('USDC', 'USDC');
    await this.USDC.deployed();

    // addr: USDC address, router address, feeCollectWallet
    // value: saleFee, transferFee
    const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const saleFee = 10;
    const transferFee = 15;

    this.HONE = await ethers.getContractFactory('HONE_Test');
    this.HONE = await this.HONE.deploy(
      [
        this.USDC.address,
        routerAddress,
        this.feeWallet.address
      ],
      [
        saleFee,
        transferFee
      ]
    );
    await this.HONE.deployed();
    console.log('HONE token address is ', this.HONE.address);

    this.honeNFT = await ethers.getContractFactory('HarmonyNode');
    this.honeNFT = await this.honeNFT.deploy(
      'honeNFT',
      'HONENFT',
      '',
      '',
      this.USDC.address
    );
    await this.honeNFT.deployed();
    console.log('HONE NFT address is ', this.honeNFT.address);

    this.HoneNode = await ethers.getContractFactory('HoneNode');
    this.HoneNode = await this.HoneNode.deploy();
    await this.HoneNode.deployed();

    this.NodeManage = await ethers.getContractFactory('HarmonyNodeManageTest');
    this.NodeManage = await this.NodeManage.deploy(
      this.HONE.address,
      this.honeNFT.address,
      this.feeWallet.address,
      this.USDC.address,
      this.HoneNode.address
    );
    await this.NodeManage.deployed();
    console.log('HONE NodeManage address is ', this.NodeManage.address);

    await this.HoneNode.transferOwnership(this.NodeManage.address);
  })

  it ('check initial state', async function () {
    const transferFee = await this.HONE.transferFee();
    const saleFee = await this.HONE.saleFee();
    const checkHasNode = await this.HONE.checkHasNode();
    let balance = await this.HONE.balanceOf(this.owner.address);
    balance = smallNum(balance);

    expect(transferFee).to.equal(15);
    expect(saleFee).to.equal(10);
    expect(checkHasNode).to.equal(0);
    expect(balance).to.equal(600000);

    await this.HONE.transfer(this.dev.address, bigNum(2000));
    await this.USDC.transfer(this.dev.address, bigNum_6(10000));

    await this.HONE.transfer(this.renter.address, bigNum(2000));
    await this.USDC.transfer(this.renter.address, bigNum_6(10000));
  })

  describe('Harmony NodeManagement', async function () {
    it ('change rewardPool', async function() {
      await expect(
        this.NodeManage.connect(this.dev).setRewardPool(this.rewardPool.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await this.NodeManage.setRewardPool(this.rewardPool.address);
    })

    it ('create node with first month fee', async function () {
      const nodeType = 0;
      const honeAmount = bigNum(10);

      
      for (let i = 0; i < 2; i ++) {
         await this.HONE.connect(this.dev).approve(this.NodeManage.address, bigNum(10));
         await this.USDC.connect(this.dev).approve(this.NodeManage.address, bigNum_6(10));

         await this.NodeManage.connect(this.dev).createNode(
         honeAmount,
         [],
         nodeType
         );
      }
    })

    it ('upgrade node with two low-level nodes', async function () {
      const upgradeNodeType = 1;
      
      let nodes = await this.NodeManage.getNodes(this.dev.address);
      await this.USDC.connect(this.dev).approve(this.NodeManage.address, bigNum_6(20));   
      await this.NodeManage.connect(this.dev).upgradeNode(
        upgradeNodeType,
        [
          nodes[0].nodeIndex,
          nodes[1].nodeIndex
        ]
      );

      await network.provider.send("evm_increaseTime", [60 * 1000]);
      await network.provider.send("evm_mine");

      let claimAmount = await this.NodeManage.getClaimableRewards(this.dev.address);
      console.log(smallNum(claimAmount));

    })
   })
});