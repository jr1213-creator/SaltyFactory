export default function Page() {
  return <main><section className="sf-page-hero"><h1>Fresh Drops</h1><p>Limited capsules and seasonal stories appear after products are approved for public release.</p></section><section className="sf-card-grid">{["Coast & Beyond","Ranch Roots","Summer Essentials"].map((drop)=><article className="sf-card" key={drop}><h2>{drop}</h2><p>Drop preview. Product availability is gated by human approval and provider configuration.</p><a href={`/drops/${drop.toLowerCase().replaceAll(" ","-").replace("&","and")}`}>View drop</a></article>)}</section></main>;
}
