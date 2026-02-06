import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { RequestHandler } from 'express';

export type Network = 'mainnet' | 'nile' | string;

export interface PaymentAgentOptions {
	privateKey: string;
	policyName: string;
	facilitatorUrl: string;
	maxBudget?: number;
	network?: Network;
}

declare class PaymentAgent {
	constructor(options: PaymentAgentOptions);

	privateKey: string;
	policyName: string;
	facilitatorUrl: string;
	maxBudget: number;
	networkLabel: string;
	tronWeb: unknown;
	myAddress: string;

	get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
	post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse>;

	protected _request(
		method: string,
		url: string,
		data: unknown,
		config: AxiosRequestConfig
	): Promise<AxiosResponse>;

	protected _handlePaymentAuth(
		url: string,
		errorResponse: {
			headers: Record<string, string | string[] | undefined>;
			data?: unknown;
		},
		originalRequest: {
			method: string;
			data?: unknown;
			headers?: AxiosRequestConfig['headers'];
		}
	): Promise<AxiosResponse>;
}

export interface X402GateOptions {
	recipient: string;
	price: number;
	facilitator: string;
}

declare function x402Gate(options: X402GateOptions): RequestHandler;

export const client: {
	PaymentAgent: typeof PaymentAgent;
};

export const server: {
	x402Gate: typeof x402Gate;
};

declare module 'express-serve-static-core' {
	interface Request {
		payment?: {
			from: string;
			to: string;
			value: string;
			txId: string;
			invoiceId: string;
		};
	}
}
