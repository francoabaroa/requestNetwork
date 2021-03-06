import requestArtifacts from 'requestnetworkartifacts';
import RequestBitcoinNodesValidationService from '../servicesContracts/requestBitcoinNodesValidation-service';
import RequestERC20Service from '../servicesContracts/requestERC20-service';
import RequestEthereumService from '../servicesContracts/requestEthereum-service';
import Erc20Service from '../servicesExternal/erc20-service';
import * as Types from '../types';

// Service containing methods for interacting with the Ethereum currency contract
let requestEthereumService: RequestEthereumService;

// Service containing methods for interacting with the ERC20 currency contract
let requestERC20Service: RequestERC20Service;

// Service containing methods for interacting with the bitcoin currency contract
let requestBitcoinNodesValidationService: RequestBitcoinNodesValidationService;

/**
 * Configuration for each currency. The objective is to regroup every information specific to each currency here.
 * It is currently a function to allow instanciation of the services and make a temporary singleton services hack.
 *
 * @param {Types.Currency} currency The currency to get the config for
 * @returns {erc20TokenContractAddress: string|null, service: any} The configuration
 */
function getCurrencyConfig(currency: Types.Currency): {erc20TokenContractAddress: string|null, service: any} {
    // Hack until services are singletons
    if (!requestEthereumService) {
        requestEthereumService = RequestEthereumService.getInstance();
        requestERC20Service = RequestERC20Service.getInstance();
        requestBitcoinNodesValidationService = RequestBitcoinNodesValidationService.getInstance();
    }

    return {
        [Types.Currency.BTC as number]: {
            erc20TokenContractAddress: null,
            service: requestBitcoinNodesValidationService,
        },
        [Types.Currency.ETH as number]: {
            erc20TokenContractAddress: null,
            service: requestEthereumService,
        },
        [Types.Currency.REQ as number]: {
            erc20TokenContractAddress: '0x8f8221afbb33998d8584a2b05749ba73c37a938a',
            service: requestERC20Service,
        },
    }[currency];
}

// Set of tools to handle currencies. Designed to be the only place regrouping the currency tools and util functions.
export default {
    /**
     * Get the currency from the address of a currency contract.
     * Useful to know which currency was used to create a Request.
     *
     * @param {string} address Address of the currency contract
     * @returns {Types.Currency} Currency
     */
    currencyFromContractAddress(address: string): Types.Currency {
        // TODO: Consider merging with the currecny config object
        const currencyMapping: { [index: string]: Types.Currency } = {
            'RequestBitcoinNodesValidation': Types.Currency.BTC,
            'RequestEthereum': Types.Currency.ETH,
            'RequestERC20': Types.Currency.REQ, // TODO: Update when refactoring artifacts.json
        };

        const currencyContractName = requestArtifacts.getContractNameForAddress(address.toLowerCase());
        return currencyMapping[currencyContractName];
    },

    /**
     * Get ERC20 token contract address of a currency
     *
     * @param {Types.Currency} currency The currency
     * @returns {string} The address of the ERC20 token contract
     */
    erc20TokenAddress(currency: Types.Currency): string {
        const currencyContractAddress = getCurrencyConfig(currency).erc20TokenContractAddress;
        if (!currencyContractAddress) {
            throw new Error(`${currency} is not an ERC20`);
        }

        const erc20Token = new Erc20Service(currencyContractAddress);
        return erc20Token.getAddress();
    },

    /**
     * Get the Request service for a currency
     *
     * @param {Types.Currency} currency The currency
     * @returns {*} The service
     */
    serviceForCurrency(currency: Types.Currency): any {
        return getCurrencyConfig(currency).service;
    },

    /**
     * Is the currency an ERC20?
     *
     * @param {Types.Currency} currency The currency
     * @returns {boolean}
     */
    isErc20(currency: Types.Currency): boolean {
        return !!getCurrencyConfig(currency).erc20TokenContractAddress;
    },
};
