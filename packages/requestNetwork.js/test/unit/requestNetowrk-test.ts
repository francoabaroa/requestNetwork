import RequestNetwork from '../../src/requestNetwork';
const Web3 = require('web3');

const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
const should = chai.should()
const expect = chai.expect;

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const BigNumber = require("bn.js");

describe('Request Network API', () => {
    let accounts: Array<string>;
    let requestNetwork: RequestNetwork;
    let examplePayees: Array<any>;
    let examplePayer: any;

    beforeEach(async () => {
        accounts = await web3.eth.getAccounts();

        examplePayees = [{
            idAddress: accounts[0],
            paymentAddress: accounts[0],
            expectedAmount: 100,
        }];
        examplePayer = {
            idAddress: accounts[1],
            refundAddress: accounts[1],
        };

        requestNetwork = new RequestNetwork({
            provider: 'http://localhost:8545',
            networkId: 10000000000
        });
    })

    it('can be created with default parameters', async () => {
       const requestNetwork = new RequestNetwork();
       expect(requestNetwork).to.exist;
    });

    it('creates a ETH request from payee', async () => {
        const role = RequestNetwork.Role.Payee;
        const { request } = await requestNetwork.createRequest(
            role,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )
        
        expect(request.requestId).to.exist;
        expect(request.currency).to.equal(RequestNetwork.Currency.Ethereum);
    });

    it('creates a ETH request from payer', async () => {
        const role = RequestNetwork.Role.Payer;
        const { request } = await requestNetwork.createRequest(
            role,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )
        
        expect(request.requestId).to.exist;
        expect(request.currency).to.equal(RequestNetwork.Currency.Ethereum);
    });

    it('creates a ETH request with data', async () => {
        const role = RequestNetwork.Role.Payer;
        const initialData = { message: 'Hello, human, I come in peace' };
        const { request } = await requestNetwork.createRequest(
            role,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer,
            { data: initialData }
        )
        
        const requestData = await request.getData();
        expect(requestData.data.data).to.deep.equal(initialData);
    });

    it('allows to pay an ETH request', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )

        await request.pay([1]);

        const data = await request.getData();
        expect(data.payee.balance.toNumber()).to.equal(1);
    });

    it('allows to pay an ETH request using string and bignumbers', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )

        await request.pay([1]);
        await request.pay(['10']);
        await request.pay([new BigNumber(100)]);

        const data = await request.getData();
        expect(data.payee.balance.toNumber()).to.equal(111);
    });

    it('allows to cancel an ETH request', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )

        await request.cancel();

        const data = await request.getData();
        expect(data.state).to.equal(RequestNetwork.State.Canceled);
    });

    it('allows to refund an ETH request', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )

        await request.pay([10]);
        await request.refund(1);

        const data = await request.getData();
        expect(data.payee.balance.toNumber()).to.equal(9);
    });
    
    it('sends broadcasted event', async () => {
        const broadcastedSpy = chai.spy();
        const notCalledSpy = chai.spy();

        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        )
            .on('broadcasted', broadcastedSpy)
            .on('event-that-doesnt-exist', notCalledSpy);

        expect(request).to.be.an.instanceof(RequestNetwork.Request)
        expect(broadcastedSpy).to.have.been.called();
        expect(notCalledSpy).to.have.been.called.below(1);
    });
    
    it('gets request from its ID', async () => {
        const { request: request1 } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        );

        const request2 = await requestNetwork.fromRequestId(request1.requestId);

        // Same ID
        expect(request1.requestId).to.equal(request1.requestId);

        // Different obejct referrences
        expect(request1).to.not.equal(request2);
    });
    
    it('gets data of a request', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        );

        const data = await request.getData();

        expect(data.creator).to.be.equal(examplePayees[0].idAddress);
        expect(data.requestId).to.be.equal(request.requestId);
    });

    it('creates a signed request', async () => {
        const signedRequest = await requestNetwork.createSignedRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            Date.now() + 3600*1000
        );

        expect(signedRequest).to.be.instanceof(RequestNetwork.SignedRequest);
        expect(signedRequest.signedRequestData.signature).to.exist;
    });

    it('checks validity of a signed request', async () => {
        const signedRequest = await requestNetwork.createSignedRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            Date.now() + 3600*1000
        );

        expect(signedRequest.isValid(examplePayer)).to.be.true;
        
        // Change the hash to make the signed request invalid
        signedRequest.signedRequestData.hash = 'someinvalidhash';
        expect(signedRequest.isValid(examplePayer)).to.be.false;
        expect(signedRequest.getInvalidErrorMessage(examplePayer)).to.be.equal('hash is not valid');
    });

    it('broadcasts a signed request', async () => {
        const signedRequest = await requestNetwork.createSignedRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            Date.now() + 3600*1000
        );

        const { request } = await requestNetwork.broadcastSignedRequest(signedRequest, examplePayer);

        expect(request.requestId).to.exist;
        expect(request.currency).to.equal(RequestNetwork.Currency.Ethereum);
    });

    it('send broadcast event when broadcasting a signed request', async () => {
        const broadcastedSpy = chai.spy();
        const notCalledSpy = chai.spy();

        const signedRequest = await requestNetwork.createSignedRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            Date.now() + 3600*1000
        );

        const { request } = await requestNetwork.broadcastSignedRequest(signedRequest, examplePayer)
            .on('broadcasted', broadcastedSpy)
            .on('event-that-doesnt-exist', notCalledSpy);

        expect(request).to.be.an.instanceof(RequestNetwork.Request)
        expect(broadcastedSpy).to.have.been.called();
        expect(notCalledSpy).to.have.been.called.below(1);
    });

    it('can serialize and deserialize signed request', async () => {
        const signedRequest = await requestNetwork.createSignedRequest(
            RequestNetwork.Role.Payee,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            Date.now() + 3600*1000
        );

        const serialized = signedRequest.serializeForUri();
        const deserialized = new RequestNetwork.SignedRequest(serialized);

        expect(deserialized.signedRequestData.signature).to.equal(signedRequest.signedRequestData.signature);
    });

    it('can get events', async () => {
        const { request } = await requestNetwork.createRequest(
            RequestNetwork.Role.Payer,
            RequestNetwork.Currency.Ethereum,
            examplePayees,
            examplePayer
        );

        const events = await request.getEvents();

        expect(events[0].name).to.equal('Created');
        expect(events[0].data.payee).to.equal(examplePayees[0].idAddress);
    });


});
