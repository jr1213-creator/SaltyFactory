export default function Page() {
  return <main><section className="store-page-hero"><h1>FAQ</h1><p>Helpful answers for made-to-order coastal western goods.</p></section><section className="card-grid">{["When will my order ship?","How do returns work?","Are products made to order?","Where do designs come from?"].map((q)=><article className="store-card" key={q}><h2>{q}</h2><p>Final storefront policies should be verified before launch. This public page never exposes Studio data.</p></article>)}</section></main>;
}
