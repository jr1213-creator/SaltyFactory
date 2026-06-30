export default function Page() {
  return <main><section className="sf-page-hero"><h1>Size Guide</h1><p>Clear fit guidance for tees, sweatshirts, hats, and accessories.</p></section><section className="sf-section"><table className="sf-table"><thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Fit note</th></tr></thead><tbody>{["S","M","L","XL","2XL"].map((s)=><tr key={s}><td>{s}</td><td>Standard range</td><td>Standard length</td><td>Check product-specific provider details before launch.</td></tr>)}</tbody></table></section></main>;
}
