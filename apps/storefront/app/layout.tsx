import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = { title: "Salty Cowhide Co.", description: "Coastal western print-on-demand goods." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={inter.className}>
    <div className="store-announcement">Approved public products only. Checkout appears when commerce providers are configured.</div>
    <nav className="store-nav" aria-label="Storefront navigation">
      <a className="store-logo" href="/">Salty Cowhide</a>
      <div className="store-links"><a href="/collections">Collections</a><a href="/drops">Drops</a><a href="/about">About</a><a href="/size-guide">Size Guide</a><a href="/faq">FAQ</a></div>
      <div className="store-actions"><input className="store-search" placeholder="Search products..." aria-label="Search products" /><a href="/cart">Cart</a></div>
    </nav>
    {children}
    <footer className="store-footer"><strong>Salty Cowhide Co.</strong><span>Secure checkout appears only after commerce providers and policies are configured.</span><span>Approved public products only.</span></footer>
  </body></html>;
}
