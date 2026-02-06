declare global {
  interface Window {
    tronWeb?: {
      requestAddress(): Promise<string>;
      defaultAddress: {
        hex?: string;
        base58?: string;
      };
      isConnected(): boolean;
    };
  }
}

export {};
