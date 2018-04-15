//Pull in contracts
const Game = artifacts.require("./Game.sol");
const toBytes32 = require("../utils/toBytes32.js");

contract('Game', function(accounts){
  
  let game; //Instance of game contract

  let owner =  accounts[0]; //Launcher of the game (doesn't have to be different from player, but hey..why not?)
  let playerOne = accounts[1]; 
  let playerTwo = accounts[2];
  let strategy = true; //ATTACK
  let strategyTwo = false; //DEFENSE
  let toAttack = playerTwo; 
  let toAttackTwo = 0; 
  let randFrontEndNum = 778976879676; 
  let randFrontEndNumTwo = 1083077487897;

  /* Steps to take before each test run, deploy contract each time to start
  at same base case. */
  beforeEach(async function(){
    game = await Game.new('TokenFoundryGame', 'TFG', {from:owner}); 
  });

  describe('Players claiming tokens', async function (){
      it('Should allow a player to claim their tokens to start playing', async function (){
          let result = await game.claimTokens({from: playerOne, gas:400000});
          let eventOne = result.logs[1];
          let eventTwo = result.logs[3];
          assert.strictEqual(eventOne.args._claimer, playerOne, "Incorrect claimer address saved.");
          assert.equal(eventOne.args._attackTokenIndex, 1, "Incorrect index assigned.");
          assert.strictEqual(eventTwo.args._claimer, playerOne, "Incorrect claimer address saved.");
          assert.equal(eventTwo.args._defenceTokenIndex, 2, "Incorrect index assigned.");  
      })
  })
  describe('Starting a game', async function(){
    it('Should allow a player who has claimed tokens to start a game', async function() {
      let result = await game.claimTokens({from: playerOne, gas:400000});
      let theStrategyHash = await web3.sha3(strategy.toString(10),toAttack.toString(10),randFrontEndNum.toString(10), {encoding:'hex'});
      let resultTwo = await game.startAGame(toBytes32(theStrategyHash), {from:playerOne, value:100});
      let currentBlock = await web3.eth.blockNumber
      let eventOne = resultTwo.logs[0];
      let gameId = eventOne.args._gameId;
      let gameEndBlock = eventOne.args._endGameBlock; 
      let playerlength = await game.getPlayersLength(toBytes32(gameId));
      let gameplayer = await game.getPlayersByIndex(toBytes32(gameId), playerlength.minus(1).toNumber());
      let strategieslength = await game.getStrategiesLength(toBytes32(gameId));
      let gamestrategy = await game.getStrategiesByIndex(toBytes32(gameId), strategieslength.minus(1).toNumber());
      assert.equal(gameEndBlock.toNumber(), currentBlock+40, "Incorrect saved block end.");
      assert.strictEqual(gameplayer, playerOne, "Incorrect player 1 saved.");
      assert.strictEqual(toBytes32(gamestrategy), theStrategyHash, "Incorrect strategy hash.");
    })
    it('Should allow a player to join an exisiting game', async function() {
      let result = await game.claimTokens({from: playerOne, gas:400000});
      let theStrategyHash = await web3.sha3(strategy.toString(10),toAttack.toString(10),randFrontEndNum.toString(10), {encoding:'hex'});
      let resultTwo = await game.startAGame(theStrategyHash, {from:playerOne, value:100});
      let eventOne = resultTwo.logs[0];
      let gameId = eventOne.args._gameId;
      let resultThree = await game.claimTokens({from:playerTwo, gas:400000});
      let theStrategyHashTwo = await web3.sha3(strategyTwo.toString(10),toAttackTwo.toString(10),randFrontEndNumTwo.toString(10), {encoding:'hex'});
      let resultFour = await game.joinAGame(theStrategyHashTwo, gameId, {from:playerTwo, value:100});
      let playerlength = await game.getPlayersLength(toBytes32(gameId));
      let p2gameplayer = await game.getPlayersByIndex(toBytes32(gameId), playerlength.minus(1).toNumber());
      let strategieslength = await game.getStrategiesLength(toBytes32(gameId));
      let p2gamestrategy = await game.getStrategiesByIndex(toBytes32(gameId), strategieslength.minus(1).toNumber());
      assert.strictEqual(p2gameplayer, playerTwo, "Incorrect player 2 saved.");
      assert.strictEqual(toBytes32(p2gamestrategy), theStrategyHashTwo, "Incorrect strategy hash.");
    })
  })
}); 
