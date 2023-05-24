const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange ", function () {
  async function setUp() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();
    const getBalance = ethers.provider.getBalance;
    const toWei = (value) => ethers.utils.parseEther(value.toString());
    const Exchange = await ethers.getContractFactory("Exchange");
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("UNITOKEN", "UNI", toWei(1000000000));
    const token_address = await token.address;
    const exchange = await Exchange.deploy(token_address);
    const fromWei = (value) =>
      ethers.utils.formatEther(
        typeof value === "string" ? value : value.toString()
      );
    return { exchange, owner, otherAccount, token, toWei, fromWei, getBalance };
  }

  describe("Exchange", function () {
    it("adds liquidity", async () => {
      const { exchange, token, toWei, getBalance } = await loadFixture(setUp);
      await token.approve(exchange.address, toWei(200));
      await exchange.addLiquidity(toWei(200), { value: toWei(100) });

      expect(await getBalance(exchange.address)).to.equal(toWei(100));
      expect(await exchange.getReserve()).to.equal(toWei(200));
    });

    it("Price should truncate to 0 ", async () => {
      const { exchange, token, toWei, getBalance } = await loadFixture(setUp);
      await token.approve(exchange.address, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      const tokenReserve = await exchange.getReserve();
      const etherReserve = await getBalance(exchange.address);

      // ETH per token
      expect(
        (await exchange.getPrice(etherReserve, tokenReserve)).toString()
      ).to.eq("0");

      // token per ETH
      expect(await exchange.getPrice(tokenReserve, etherReserve)).to.eq(2);
    });
    it("We should get correct Amount of tokens out when we input ether", async () => {
      const { exchange, token, toWei, fromWei, getBalance } = await loadFixture(
        setUp
      );
      await token.approve(exchange.address, toWei(20000));
      // We added liquidity  2000 Tokens  and 2 ETH  to exchange

      await exchange.addLiquidity(toWei(2000), { value: toWei(2) });
      // If we check  how much tokens  we can get out if we use 1 ETH
      let tokensOut = await exchange.getTokenAmount(toWei(1));
      //inputAmount * outputReserve) / (inputReserve + inputAmount
      //  (1 * 2000) / (2 + 1)   =  666.6666666666666  - fee  (4.459308807134903 Tokens )
      expect(fromWei(tokensOut)).to.equal("662.207357859531772575");
      //(100 * 2000) / (2+100)
      // for just 100 ether we can get 1960 tokens
      tokensOut = await exchange.getTokenAmount(toWei(100));
      // expect(fromWei(tokensOut)).to.equal("1960.784313725490196078");
      expect(fromWei(tokensOut)).to.equal("1960.396039603960396039");
      //(1000 * 2000) / (2+1000)
      // For  1000 ether we can get only  1996 tokens  ?
      tokensOut = await exchange.getTokenAmount(toWei(1000));
      // expect(fromWei(tokensOut)).to.equal("1996.007984031936127744");
      expect(fromWei(tokensOut)).to.equal("1995.967741935483870967");
    });
  });

  it("returns correct eth amount", async () => {
    const { exchange, token, toWei, fromWei, getBalance } = await loadFixture(
      setUp
    );
    await token.approve(exchange.address, toWei(2000));
    await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
    // ... addLiquidity ...
    let ethOut = await exchange.getEthAmount(toWei(2));

    // expect(fromWei(ethOut)).to.equal("0.999000999000999");
    expect(fromWei(ethOut)).to.equal("0.989020869339354039");

    ethOut = await exchange.getEthAmount(toWei(100));
    // expect(fromWei(ethOut)).to.equal("47.619047619047619047");
    expect(fromWei(ethOut)).to.equal("47.16531681753215817");

    ethOut = await exchange.getEthAmount(toWei(2000));
    // expect(fromWei(ethOut)).to.equal("500.0");
    expect(fromWei(ethOut)).to.equal("497.487437185929648241");
  });
  it("LP reward check", async () => {
    const { exchange, owner, token, toWei, fromWei, getBalance, otherAccount } =
      await loadFixture(setUp);
    await token.approve(exchange.address, toWei(2000));
    const before_Providing_Liqiuidity = fromWei(await owner.getBalance());
    console.log(before_Providing_Liqiuidity);
    await exchange
      .connect(owner)
      .addLiquidity(toWei(200), { value: toWei(100) });
    // ... addLiquidity ...
    await exchange
      .connect(otherAccount)
      .ethToTokenSwap(toWei(18), { value: toWei(10) });
    const l = await exchange.removeLiquidity(toWei(100));
    const After_removingLiquidity = fromWei(await owner.getBalance());
    console.log(After_removingLiquidity);
    expect(Number(After_removingLiquidity)).to.be.greaterThan(
      Number(before_Providing_Liqiuidity)
    );
    // console.log("ETHAMOUNT liquidity provider gets: %s ", ethAmount);
    // console.log("TokenAmount liquidity provider gets: %s ", tokenAmount);
  });
});
