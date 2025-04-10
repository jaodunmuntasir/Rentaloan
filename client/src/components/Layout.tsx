import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../contexts/WalletContext";
import Navigation from "./Navigation";
import { Button } from "./ui/button";
// import { Separator } from './ui/separator';
import { Home, Wallet, LogOut, Menu } from "lucide-react";
import { Toaster } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const Layout: React.FC = () => {
  const { logout } = useAuth();
  const {
    isConnected,
    walletAddress,
    walletBalance,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle wallet connection
  const handleWalletConnection = async () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  // Navigation items for mobile only
  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      path: "/rental",
      label: "Rentals",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    { path: "/loan", label: "Loans", icon: <Home className="h-4 w-4 mr-2" /> },
    {
      path: "/profile",
      label: "Profile",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" />

      {/* Simplified Header - only logo, wallet connection and logout */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">Rentaloan</span>
            </Link>
          </div>

          {/* Desktop wallet and logout */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant={isConnected ? "outline" : "default"}
              size="sm"
              className={
                isConnected
                  ? "bg-green-50 text-green-700 border-green-200"
                  : ""
              }
              onClick={handleWalletConnection}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnected
                ? `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(
                    -4
                  )} (${Number(walletBalance).toFixed(4)} ETH)`
                : "Connect Wallet"}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant={isConnected ? "outline" : "default"}
              size="sm"
              className={
                isConnected ? "bg-green-50 text-green-700 border-green-200" : ""
              }
              onClick={handleWalletConnection}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnected ? "Connected" : "Connect"}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                <div className="flex flex-col h-full">
                  <div className="py-4">
                    <h2 className="text-lg font-semibold mb-2">Menu</h2>
                    <nav className="flex flex-col space-y-3">
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center py-2 px-3 rounded-md transition-colors ${
                            location.pathname.startsWith(item.path)
                              ? "bg-muted font-medium"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </div>

                  <div className="mt-auto pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 container py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar navigation on desktop */}
          <div className="hidden md:block w-64 shrink-0">
            <div className="bg-card rounded-lg shadow-sm border p-4 sticky top-20">
              <Navigation />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-6">
        <div className="container flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Rentaloan. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Link
              to="https://muntasir.tech/"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Developed by Jaodun Muntasir
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
