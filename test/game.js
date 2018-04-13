//Pull in contracts
const Game = artifacts.require("./Game.sol");

contract('Game', function(accounts){
  
  let game; //Instance of game contract

  let owner =  accounts[0]; //Launcher of the game (doesn't have to be different from player, but hey..why not?)
  let playerOne = accounts[1]; 
  let playerTwo = accounts[2];
  let strategy = 'ATTACK';
  let toAttack = playerTwo; 
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
      let player = await game.gameInfo(gameId);
      assert.equal(gameEndBlock.toNumber(), resultThree+40, "Incorrect saved block end.");
    })
  })
}); 
