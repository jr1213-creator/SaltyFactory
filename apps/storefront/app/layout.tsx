import "./globals.css";
export const metadata = { title: "Salty Cowhide Co.", description: "Coastal western print-on-demand goods." };
export default function Layout({children}:{children:React.ReactNode}){ return <html lang="en"><body><nav className="nav"><a href="/">Salty Cowhide Co.</a><a href="/collections">Collections</a><a href="/drops">Drops</a><a href="/search">Search</a><a href="/cart">Cart</a></nav>{children}</body></html>; }
