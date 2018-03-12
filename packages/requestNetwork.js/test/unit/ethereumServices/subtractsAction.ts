import {expect} from 'chai';
import 'mocha';
import requestArtifacts from 'requestnetworkartifacts';
import RequestNetwork from '../../../src/requestNetwork';
import * as utils from '../../utils';

const WEB3 = require('web3');
const BN = WEB3.utils.BN;

const addressRequestEthereum = requestArtifacts('private', 'last-RequestEthereum').networks.private.address;
const addressRequestCore = requestArtifacts('private', 'last-RequestCore').networks.private.address;

let rn: any;
let web3: any;
let defaultAccount: string;
let payer: string;
let payee: string;
let payee2: string;
let payee3: string;
let payeePaymentAddress: string;
let payee3PaymentAddress: string;
let otherGuy: string;
let payerRefundAddress: string;
let currentNumRequest: any;

let requestId: any;

describe('subtracts Action', () => {
    const arbitraryAmount = 100000000;
    const arbitraryAmount2 = 2000000;
    const arbitraryAmount3 = 300000;
    rn = new RequestNetwork('http://localhost:8545', 10000000000, false);
    web3 = rn.requestEthereumService.web3Single.web3;

    beforeEach(async () => {
        const accounts = await web3.eth.getAccounts();
        defaultAccount = accounts[0].toLowerCase();
        payer = accounts[2].toLowerCase();
        payee = accounts[3].toLowerCase();
        payee2 = accounts[4].toLowerCase();
        payee3 = accounts[5].toLowerCase();
        payerRefundAddress = accounts[6].toLowerCase();
        payee3PaymentAddress = accounts[7].toLowerCase();
        payeePaymentAddress = accounts[8].toLowerCase();
        otherGuy = accounts[9].toLowerCase();

        currentNumRequest = await rn.requestCoreService.getCurrentNumRequest();

        const req = await rn.requestEthereumService.createRequestAsPayee(
            [payee , payee2, payee3],
            [arbitraryAmount, arbitraryAmount2, arbitraryAmount3],
            payer,
            [payeePaymentAddress, undefined, payee3PaymentAddress],
            payerRefundAddress,
            '{"reason":"weed purchased"}',
            '',
            [],
            {from: payee});

        requestId = req.request.requestId;
    });

    it('subtracts request', async () => {
        const result = await rn.requestEthereumService.subtractAction(
                            requestId,
                            [1, 2, 3],
                            {from: payee})
            .on('broadcasted', (data: any) => {
                expect(data.transaction, 'data.transaction.hash is wrong').to.have.property('hash');
            });

        utils.expectEqualsBN(result.request.payee.expectedAmount, arbitraryAmount - 1, 'expectedAmount is wrong');
        utils.expectEqualsBN(result.request.payee.balance, 0, 'balance is wrong');
        expect(result.request.creator.toLowerCase(), 'creator is wrong').to.equal(payee);
        expect(result.request.extension, 'extension is wrong').to.be.undefined;
        expect(result.request.payee.address.toLowerCase(), 'payee is wrong').to.equal(payee);
        expect(result.request.payer.toLowerCase(), 'payer is wrong').to.equal(payer);
        expect(result.request.requestId, 'requestId is wrong').to.equal(
                                    utils.getRequestId(addressRequestCore, ++currentNumRequest));
        expect(result.request.state, 'state is wrong').to.equal(0);
        expect(result.request.currencyContract.address.toLowerCase(), 'currencyContract is wrong').to.equal(addressRequestEthereum);
        expect(result.transaction, 'result.transaction.hash is wrong').to.have.property('hash');

        expect(result.request.subPayees[0].address.toLowerCase(), 'payee2 is wrong').to.equal(payee2);
        utils.expectEqualsBN(result.request.subPayees[0].balance, 0, 'payee2 balance is wrong');
        utils.expectEqualsBN(result.request.subPayees[0].expectedAmount, arbitraryAmount2-2, 'payee2 expectedAmount is wrong');

        expect(result.request.subPayees[1].address.toLowerCase(), 'payee3 is wrong').to.equal(payee3);
        utils.expectEqualsBN(result.request.subPayees[1].balance, 0, 'payee3 balance is wrong');
        utils.expectEqualsBN(result.request.subPayees[1].expectedAmount, arbitraryAmount3-3, 'payee3 expectedAmount is wrong');
    });


    it('subtracts accepted request', async () => {
        await rn.requestEthereumService.accept(
                                requestId,
                                {from: payer});

        const result = await rn.requestEthereumService.subtractAction(
                            requestId,
                            [1, 2, 3],
                            {from: payee})
            .on('broadcasted', (data: any) => {
                expect(data.transaction, 'data.transaction.hash is wrong').to.have.property('hash');
            });

        utils.expectEqualsBN(result.request.payee.expectedAmount, arbitraryAmount - 1, 'expectedAmount is wrong');
        utils.expectEqualsBN(result.request.payee.balance, 0, 'balance is wrong');
        expect(result.request.creator.toLowerCase(), 'creator is wrong').to.equal(payee);
        expect(result.request.extension, 'extension is wrong').to.be.undefined;
        expect(result.request.payee.address.toLowerCase(), 'payee is wrong').to.equal(payee);
        expect(result.request.payer.toLowerCase(), 'payer is wrong').to.equal(payer);
        expect(result.request.requestId, 'requestId is wrong').to.equal(
                                    utils.getRequestId(addressRequestCore, ++currentNumRequest));
        expect(result.request.state, 'state is wrong').to.equal(1);
        expect(result.request.currencyContract.address.toLowerCase(), 'currencyContract is wrong').to.equal(addressRequestEthereum);
        expect(result.transaction, 'result.transaction.hash is wrong').to.have.property('hash');

        expect(result.request.subPayees[0].address.toLowerCase(), 'payee2 is wrong').to.equal(payee2);
        utils.expectEqualsBN(result.request.subPayees[0].balance, 0, 'payee2 balance is wrong');
        utils.expectEqualsBN(result.request.subPayees[0].expectedAmount, arbitraryAmount2 - 2, 'payee2 expectedAmount is wrong');

        expect(result.request.subPayees[1].address.toLowerCase(), 'payee3 is wrong').to.equal(payee3);
        utils.expectEqualsBN(result.request.subPayees[1].balance, 0, 'payee3 balance is wrong');
        utils.expectEqualsBN(result.request.subPayees[1].expectedAmount, arbitraryAmount3 - 3, 'payee3 expectedAmount is wrong');
    });

    it('pay request with not valid requestId', async () => {

        try {
            const result = await rn.requestEthereumService.subtractAction(
                                '0x00000000000000',
                                [arbitraryAmount],
                                {from: payee});
            expect(false, 'exception not thrown').to.be.true; 
        } catch (e) {
            utils.expectEqualsObject(e, Error('_requestId must be a 32 bytes hex string (eg.: \'0x0000000000000000000000000000000000000000000000000000000000000000\''), 'exception not right');
        }
    });

    it('pay request with not valid additional (negative)', async () => {

        try {
            const result = await rn.requestEthereumService.subtractAction(
                                requestId,
                                [-1],
                                {from: payee});
            expect(false, 'exception not thrown').to.be.true;
        } catch (e) {
            utils.expectEqualsObject(e, Error('subtracts must be positives integer'), 'exception not right');
        }
    });

    it('pay request with not valid additional (too high)', async () => {

        try {
            const result = await rn.requestEthereumService.subtractAction(
                                requestId,
                                [arbitraryAmount + 1],
                                {from: payee});
            expect(false, 'exception not thrown').to.be.true;
        } catch (e) {
            utils.expectEqualsObject(e, Error('subtracts must be positives integer'), 'exception not right');
        }
    });

    it('subtracts request canceled', async () => {
        await rn.requestEthereumService.cancel(
                                requestId,
                                {from: payer});

        try {
            const result = await rn.requestEthereumService.paymentAction(
                                requestId,
                                [arbitraryAmount],
                                {from: payee});
            expect(false, 'exception not thrown').to.be.true;
        } catch (e) {
            utils.expectEqualsObject(e, Error('request must be accepted'), 'exception not right');
        }
    });

    it('subtracts request from otherGuy', async () => {
        try {
            const result = await rn.requestEthereumService.paymentAction(
                                requestId,
                                [arbitraryAmount],
                                {from: otherGuy});
            expect(false, 'exception not thrown').to.be.true;
        } catch (e) {
            utils.expectEqualsObject(e, Error('account must be payee'), 'exception not right');
        }
    });


    it('subtracts too long', async () => {
        try {
            const result = await rn.requestEthereumService.paymentAction(
                                requestId,
                                [3, 2, 1, 1],
                                {from: payee});
            expect(false, 'exception not thrown').to.be.true;
        } catch (e) {
            utils.expectEqualsObject(e, Error('subtracts size must be lower than number of payees'), 'exception not right');
        }
    });
});