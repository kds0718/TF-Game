//Pull in contracts
const Game = artifacts.require("./Game.sol");

contract('Game', function(accounts){
  
  let game; //Instance of game contract

  let owner =  accounts[0]; //Launcher of the game (doesn't have to be different from player, but hey..why not?)
  let playerOne = accounts[1]; 
  let playerTwo = accounts[2];
  let strategy = 'ATTACK';
  let strategyTwo = 'DEFEND';
  let toAttack = playerTwo; 
  let toAttackTwo = 0; 
  let randFrontEndNum = 7; 

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
      let theStrategyHash = await web3.sha3(strategy,toAttack,randFrontEndNum, {encoding:'hex'});
      let resultTwo = await game.startAGame(theStrategyHash, {from:playerOne, value:100});
      let currentBlockNum; 
      let resultThree = await web3.eth.blockNumber
      let eventOne = resultTwo.logs[0];
      let gameId = eventOne.args._gameId;
      let gameEndBlock = eventOne.args._endGameBlock; 
      //Need to get playerOne out of this struct...
      let theStruct = await game.gameInfo(gameId);
      let grabplayer = theStruct[0];
      let grabstrat = theStruct[1];
      console.log(theStruct);
      assert.equal(gameEndBlock.toNumber(), resultThree+40, "Incorrect saved block end.");
      assert.strictEqual(grabplayer, playerOne, "Incorrect player 1 saved.");
      assert.strictEqual(grabstrat, theStrategyHash, "Incorrect strategy hash.");
    })
    it('Should allow a player to join an exisiting game', async function() {
      let result = await game.claimTokens({from: playerOne, gas:400000});
      let theStrategyHash = await web3.sha3(strategy,toAttack,randFrontEndNum, {encoding:'hex'});
      let resultTwo = await game.startAGame(theStrategyHash, {from:playerOne, value:100});
      let eventOne = resultTwo.logs[0];
      let gameId = eventOne.args._gameId;
      let resultThree = await game.claimTokens({from:playerTwo, gas:400000});
      let theStrategyHashTwo = await web3.sha3(strategyTwo, toAttackTwo, randFrontEndNum, {encoding: 'hex'});
      //Found some interesting behavior with initialized arrays in Truffle...need to sort
      //let resultFour = await game.joinAGame(gameId, theStrategyHashTwo, {from:playerTwo, value:100});
    })
  })
}); 
