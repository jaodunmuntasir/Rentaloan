import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Wallet, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

interface WalletInfoProps {
  walletAddress: string | null;
  walletBalance: string | null;
  isConnected: boolean;
  onConnectWallet: () => Promise<void>;
}

const WalletInfo: React.FC<WalletInfoProps> = ({
  walletAddress,
  walletBalance,
  isConnected,
  onConnectWallet
}) => {
  const [copied, setCopied] = React.useState(false);

  // Format wallet address for display
  const formatWalletAddress = (address: string): string => {
    if (!address) return 'Not connected';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Copy wallet address to clipboard
  const copyToClipboard = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Your wallet information and balance</CardDescription>
          </div>
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="flex items-center">
                <span className="font-mono text-sm mr-2">
                  {formatWalletAddress(walletAddress || '')}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard}>
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="font-medium">
                {walletBalance ? `${parseFloat(walletBalance).toFixed(4)} ETH` : 'Loading...'}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Network</div>
              <Badge variant="outline">Local Hardhat</Badge>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Etherscan
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <Wallet className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Wallet Not Connected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect your wallet to interact with smart contracts
            </p>
            <Button onClick={onConnectWallet}>
              Connect Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletInfo; 