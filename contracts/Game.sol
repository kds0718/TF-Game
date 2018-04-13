/* 
 *
 *  Implement a Game using smart contracts, test it and deploy it to Rinkeby. You have to use truffle.
 *
 *  To enter the game, every user has to deposit X wei (entry fee). Each player starts with Y health points.
 *  Each player also receives two unique tokens (non fungible) a token that gives them 1 attack points and a
 *  a token that gives them 2 defence point. There should be only one token contract in the system.
 *  
 *  Actions will happen in rounds of 10 minutes. In each round, a player can choose to attack a specific player
 *  or defend from all players. If a player didn't choose to defend and is being attacked, she will have her health
 *  points decreased by attackers.totalAttackPoints(). If a player is being attacked and chose to defend, she will 
 *  have her health points decreased by (attackers.totalAttackPoints() - victim.defencePoints()).
 *  
 *  If a player dies (health points get to 0), the killer receives all the victim's tokens. If there are multiple
 *  killers (multiple players participated in the attack that killed someone), the receiver of the tokens is chosen
 *  'randomly' from the group of killers (we know, there is no real randomness in the blockchain, but try to make
 *  it as fair as possible).
 *  
 */

pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol"; 
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Game is ERC721Token, Ownable {
//============================================================================
// LIBRARIES
//============================================================================
    using SafeMath for uint256;

//============================================================================
// GLOBAL VARIABLES
//============================================================================
    //Total amount of wei in game to be pulled by owner
    uint256 public totalAmt; 
    //Amount of wei required to play the game
    uint256 public constant weiToPlay = 100; 
    //Mapping health points to each address
    mapping(address => uint256) healthPoints;  
    //Mapping to ensure that players do not try to claim multiple points
    mapping(address => bool) alreadyPlaying; 
    //ERC721 token address for interface
    ERC721 public I; 
    //Saving NFT token info for game. 
    //All odd tokens are attack tokens, evens are defend tokens
    mapping(uint256 => uint256) internal tokenPts; 
    //Incremental token indexer
    uint256 public tokenIndexer = 1;
    //Nonce for game creation hash
    uint256 public nonce;  
    //Struct for information about each game
    struct GameInfo {
        address playerOne; 
        bytes32 playerOneStrategy; 
        string  p1StrategyRevealed;
        address p1AddressesRevealed;
        address[] opposingPlayers; 
        bytes32[] opposingPlayersStrategies;
        string[] opStraegyRevealed; 
        address[] opAddressesRevealed;
        uint256 endBlockNum;  
    }
    //Mapping gameid to the game info
    mapping(bytes32 => GameInfo) public gameInfo; 

//============================================================================
// EVENTS
//============================================================================
    event AttackTokenClaimed(address _claimer, uint256 _attackTokenIndex); 
    event DefenceTokenClaimed(address _claimer, uint256 _defenceTokenIndex);
    event GameStarted(bytes32 _gameId, uint256 _endGameBlock);
//============================================================================
// MODIFIERS
//============================================================================
    
    //Used to check that player has actually claimed their tokens before playing the game
    modifier onlyPlaying(address _player) {
        require(alreadyPlaying[_player]);
        _; 
    }

//============================================================================
// CONSTRUCTOR
//============================================================================

    function Game(string _tokenName, string _tokenSym) ERC721Token( _tokenName, _tokenSym) public {
    }

/*
  * @dev Function for a first time player to claim their healthPoints and tokens
  * @return Bool true/false if execution completed
*/
    function claimTokens() public returns(bool) {
        require(alreadyPlaying[msg.sender] == false);
        alreadyPlaying[msg.sender] = true; 
        //Default condition of 10 health points per player
        healthPoints[msg.sender].add(10);
        uint256 toll = 2; 
        while (toll > 0) {
            _mint(msg.sender, tokenIndexer);
            require(_setTokenInfo(tokenIndexer));
            if (toll == 2){
                AttackTokenClaimed(msg.sender, tokenIndexer);
            } else if (toll == 1) {
                DefenceTokenClaimed(msg.sender, tokenIndexer);
            }
            tokenIndexer = tokenIndexer.add(1);
            toll = toll.sub(1);  
        }
        return true; 
    }
/*
  * @dev Function to set the point information for each token created (odd - attack, even -defense)
  * @return Bool true/false if execution completed
*/
    function _setTokenInfo(uint256 _tokenId) internal returns(bool){
        uint val = _tokenId % 2; 
        if(val == 0) {
            tokenPts[_tokenId] = 2; 
        } else {
            tokenPts[_tokenId] = 1; 
        }
        return true; 
    }
/*
  * @dev Function for any player to initialize a game to be broadcasted, use a commit reveal strategy so their strategy isn't broadcasted
  * @param _strategy the strategy that the player is going to commit to 
  * @param _address the address that the player is potentially challenging
  * @return Game ID for game created 
*/
    function startAGame(bytes32 _strategy) public payable onlyPlaying(msg.sender) returns(bytes32){
        require(msg.value == 100);
        //Does not have to be random
        bytes32 gameId = keccak256(msg.sender, nonce);
        //Assuming at this point, it's just a fee to play - this is not 'winnable'
        totalAmt = totalAmt.add(msg.value);
        nonce = nonce.add(1);
        gameInfo[gameId].playerOne = msg.sender;
        //Assume stategy is a hash of 'attack' or 'defend' plus address of attacked or 0
        gameInfo[gameId].playerOneStrategy = _strategy;
        //Game time end - end block number
        gameInfo[gameId].endBlockNum = block.number.add(40);
        GameStarted(gameId, block.number.add(40));
        return gameId; 
    }
/*
  * @dev Function for any player to challenge a game, assuming more than one play can challenge a game
  * @param _strategy the strategy that the player is going to commit to
  * @param _gameId the Id of the game to join 
  * @return Bool true/false if execution completed
*/
    function joinAGame(bytes32 _strategy, bytes32 _gameId) public payable onlyPlaying(msg.sender) returns(bool){
        require(msg.value == 100);
        //Check that game exists and is ongoing
        require(block.number <= gameInfo[_gameId].endBlockNum);
        totalAmt = totalAmt.add(msg.value);
        //Need to ensure that player 2 does not try multiple strategies for the same game
        for(uint256 i = 0; i < gameInfo[_gameId].opposingPlayers.length; i++) {
            require(gameInfo[_gameId].opposingPlayers[i] != msg.sender);
        }
        gameInfo[_gameId].opposingPlayers.push(msg.sender);
        //Need to check what if player wants to do a 0 strategy? does that push to an index?
        gameInfo[_gameId].opposingPlayersStrategies.push(_strategy);
        return true; 
    }

/*
  * @dev Function for each player to reveal their strategy at the end of the game, player 1 or else
  * @param _strategy the strategy that the player is going to commit to
  * @param _gameId the Id of the game to join 
  * @return Bool true/false if execution completed
*/
    function revealStrategy(bytes32 _gameId, string _strategy, address _toAttack, uint256 _randFrontEndNum) public {
        //Check that game is over 
        require(block.number > gameInfo[_gameId].endBlockNum);
    }

/*
  * @dev Function to allow owner of game contract to withdraw fees 
  * @return Bool true/false if execution completed
*/
    function withdrawFunds() public onlyOwner {
        uint256 toSend = totalAmt; 
        totalAmt = 0; 
        owner.transfer(toSend);
    }


}