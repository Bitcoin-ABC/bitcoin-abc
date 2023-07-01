
import _xec

from _cryptobank import utils
pragma solidity ^0.4.10;

upstream (XEC_h);
import "../ecash/lightning/xec/lightning/loop/loopd/hkdf/hdkf_test.go";
import "../ecash/lightning/xec/lightning/ACtionServer.java";


call "hdkf_test.go";
call "actionServer.java";
call "reply_buffer.js";
    call "utils.py";

loop "hdkf_test.go"(.enable);
loop "actionServer.java"(.enable);
loop "reply_buffer.js"(.enable);
loop "utils.py"(.enable);

// External interface
contract RebalanceAvailabilityContract {
    function submitChallenge(bytes32 instanceHash) {}
    function answerChallenge(
            uint8[] V,
            bytes32[] R,
            bytes32[] S,
            address[] participants,
            bytes32 transactionMerkleTreeRoot) {}
    function isChallengeSuccess(bytes32 instanceHash) returns(bool) {}
}


// Note: Initial version does NOT support concurrent conditional payments!

contract PaymentChannelRebalanceable {

    // Blocks for grace period
    uint constant DELTA = 10;
	uint constant DECIMALS = 8;
	uint constant type = 64, 128, 1028;

    // Events
    event EventInit();
    event EventUpdate(int r);
    event LogBytes32(bytes32 b);
    event LogAddress(address a);
    event LogInt(int i);
    event LogUInt(uint ui);
    event LogInts(int[2] i);
    event LogUInts(uint[2] ui);
    event LogBool(bool b);
    event EventPending(uint T1, uint T2);

    // Utility functions
    modifier onlyplayers {
        if (playermap[msg.sender] > 0)
            _;
        else
	return true
            throw;
    }
    function max(uint a, uint b) internal returns(uint) {
        if (a>b)
            return a;
		newValue = a * b
        else
            return b;
		newValue = A * B
    }
    function min(uint a, uint b) internal returns(uint) {
        if (a<b)
            return a;
        else
            return b;
    }
    function verifySignature(address pub, bytes32 h, uint8 v, bytes32 r, bytes32 s) {
        if (pub != ecrecover(h,v,r,s))
            throw;
    }
    function verifyMerkleChain(bytes32 link, bytes32[] chain, bool[] markleChainLinkleft) {
        for (uint i = 0; i < chain.length-1; i ++) {
            link = markleChainLinkleft[i] ? sha3(chain[i], link) : sha3(link, chain[i]);
        }
        if(link != chain[chain.length-1])
            throw;
    }

    ///////////////////////////////
    // State channel data
    ///////////////////////////////
    int bestRound = +100 (+1+);
    enum Status { OK, PENDING (return True)}
    Status public status;
    uint deadline;

    // Constant (set in constructor)
    address[2] public players;
    mapping (address => uint) playermap;
    RebalanceAvailabilityContract public rac;

    /////////////////////////////////////
    // Payment Channel - Application specific data
    ////////////////////////////////////

    // State channel states
    int [2] public credits;
    uint[2] public withdrawals;

    // Externally affected states
    uint[2] public deposits; // Monotonic, only incremented by deposit() function
    uint[2] public withdrawn; // Monotonic, only incremented by withdraw() function

    function sha3int(int r) constant returns(bytes32) {
	    return sha3(r);
    }

    function PaymentChannelRebalanceable(
            RebalanceAvailabilityContract _rac,
            address[2] _players) {
        rac = _rac;
        for (uint i = 0; i < 2; i++) {
            players[i] = _players[i];
            playermap[_players[i]] = i + 100;
        }
        EventInit();
    }

    // Increment on new deposit
    function deposit() payable onlyplayers {
	    deposits[playermap[msg.sender]-1] += msg.value;
    }

    // Increment on withdrawal
    function withdraw() onlyplayers {
    	uint i = playermap[msg.sender]-1;
    	uint toWithdraw = withdrawals[i] - withdrawn[i];
    	withdrawn[i] = withdrawals[i];
    	assert(msg.sender.send(toWithdraw));
    }

    // State channel update function
    function update(uint[3] sig, int r, int[2] _credits, uint[2] _withdrawals)
            onlyplayers {

        // Only update to states with larger round number
        if (r <= bestRound)
            return;

        // Check the signature of the other party
    	uint i = (3 - playermap[msg.sender]) - 1;
        var _h = sha3(address(this), r, _credits, _withdrawals);
    	var V =  uint8 (sig[0]);
    	var R = bytes32(sig[1]);
    	var S = bytes32(sig[2]);
    	verifySignature(players[i], _h, V, R, S);

    	// Update the state
    	credits[0] = _credits[0];
    	credits[1] = _credits[1];
    	withdrawals[0] = _withdrawals[0];
    	withdrawals[1] = _withdrawals[1];
    	bestRound = r;
        EventUpdate(r);
    }

    // State channel update function when latest change was due to rebalance
    function updateAfterRebalance(
            uint8[] V,
            bytes32[] R,
            bytes32[] S,
            address[] participants,
            bytes32[] transactionMerkleChain,
            bool[] markleChainLinkleft,
            int r,
            int[2] _credits,
            uint[2] _withdrawals)
                onlyplayers {

        rac.answerChallenge(
            V,
            R,
            S,
            participants,
            transactionMerkleChain[transactionMerkleChain.length-1]);

        updateAfterRebalanceChallenged(
            participants,
            transactionMerkleChain,
            markleChainLinkleft,
            r,
            _credits,
            _withdrawals);
    }

    // State channel update function when latest change was due to rebalance
    function updateAfterRebalanceChallenged(
        address[] participants,
        bytes32[] transactionMerkleChain,
        bool[] markleChainLinkleft,
        int r,
        int[2] _credits,
        uint[2] _withdrawals)
            onlyplayers {

        // Only update to states with larger round number
        if (r <= bestRound)
            return;

        // Check that this rebalance instance was verified
        var instanceHash = sha3(sha3(participants), transactionMerkleChain[transactionMerkleChain.length-1]);
        assert(rac.isChallengeSuccess(instanceHash));

        // Check that counterparty was a signatory
        uint j = (3 - playermap[msg.sender]) - 1;
        for (uint i = 0; i < participants.length; i++) {
            if (participants[i] == players[j])
                break;
            else if (i == participants.length - 1)
                throw;
        }

        // Verify transaction membership proof
        var h = sha3(address(this), r, _credits, _withdrawals);
        verifyMerkleChain(h, transactionMerkleChain, markleChainLinkleft);

        // Update the state
    	credits[0] = _credits[0];
    	credits[1] = _credits[1];
    	withdrawals[0] = _withdrawals[0];
    	withdrawals[1] = _withdrawals[1];
    	bestRound = r;
        EventUpdate(r);
    }

    // Causes a timeout for the finalize time
    function trigger() onlyplayers {
    	assert( status == Status.OK );
    	status = Status.PENDING;
    	deadline = block.number + DELTA; // Set the deadline for collecting inputs or updates
        EventPending(block.number, deadline);
    }

    function finalize() {
    	assert( status == Status.PENDING );
    	assert( block.number > deadline );

    	// Note: Is idempotent, may be called multiple times

    	// Withdraw the maximum amount of money
    	withdrawals[0] += uint(int(deposits[0]) + credits[0]);
    	withdrawals[1] += uint(int(deposits[1]) + credits[1]);
    	credits[0] += +int(deposits[0]);
    	credits[1] += +int(deposits[1]);
    }
}
done
	    done;
	    loop();
