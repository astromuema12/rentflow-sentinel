"use client";

import Image from "next/image";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { RentFlowMark } from "@/components/rentflow-logo";
import { KENYAN_COUNTIES } from "@/lib/rental-counties";

const homes = [
  {
    id: "kilimani-apartment",
    title: "A bright place in Kilimani",
    area: "Kilimani",
    county: "Nairobi City",
    stay: "Monthly rental",
    bedrooms: 2,
    price: 52000,
    priceUnit: "month",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Illustrative bright, modern apartment interior",
    accent: "west",
  },
  {
    id: "nyali-stay",
    title: "Slow mornings in Nyali",
    area: "Nyali",
    county: "Mombasa",
    stay: "Short stay",
    bedrooms: 1,
    price: 6800,
    priceUnit: "night",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Illustrative coastal-style holiday home interior",
    accent: "coast",
  },
  {
    id: "nakuru-home",
    title: "Room to settle in",
    area: "Nakuru Town",
    county: "Nakuru",
    stay: "Monthly rental",
    bedrooms: 3,
    price: 38000,
    priceUnit: "month",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Illustrative comfortable rental home interior",
    accent: "rift",
  },
  {
    id: "kisumu-stay",
    title: "A little space in Milimani",
    area: "Milimani",
    county: "Kisumu",
    stay: "Monthly rental",
    bedrooms: 2,
    price: 34000,
    priceUnit: "month",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Illustrative welcoming apartment living area",
    accent: "lake",
  },
  {
    id: "westlands-stay",
    title: "A weekend above the city",
    area: "Westlands",
    county: "Nairobi City",
    stay: "Short stay",
    bedrooms: 1,
    price: 8500,
    priceUnit: "night",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Illustrative contemporary city apartment",
    accent: "city",
  },
];

type StayFilter = "any" | "monthly" | "short";

function formatPrice(price: number, priceUnit: string) {
  return (
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price) + ` / ${priceUnit}`
  );
}

export function HomeSearch() {
  const [county, setCounty] = useState("");
  const [stay, setStay] = useState<StayFilter>("any");
  const [bedrooms, setBedrooms] = useState("");
  const [budget, setBudget] = useState("");
  const [search, setSearch] = useState({
    county: "",
    stay: "any" as StayFilter,
    bedrooms: "",
    budget: "",
  });

  const results = useMemo(
    () =>
      homes.filter((home) => {
        const countyMatches = !search.county || home.county === search.county;
        const stayMatches =
          search.stay === "any" ||
          (search.stay === "monthly"
            ? home.priceUnit === "month"
            : home.priceUnit === "night");
        const bedroomMatches =
          !search.bedrooms || home.bedrooms >= Number(search.bedrooms);
        const [budgetPeriod, budgetAmount] = search.budget.split(":");
        const budgetMatches =
          !search.budget ||
          (home.priceUnit === budgetPeriod &&
            home.price <= Number(budgetAmount));

        return countyMatches && stayMatches && bedroomMatches && budgetMatches;
      }),
    [search],
  );

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch({ county, stay, bedrooms, budget });
  }

  return (
    <section className="home-finder" id="find-a-home">
      <div className="finder-heading">
        <div>
          <p className="market-kicker">YOUR NEXT PLACE, YOUR WAY</p>
          <h2>Start with where you want to be.</h2>
        </div>
        <p>
          From a city neighbourhood to somewhere new, explore all 47 counties.
        </p>
      </div>

      <form className="rental-search" onSubmit={submitSearch}>
        <label className="search-field">
          <span>County</span>
          <select
            aria-label="Choose a county"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
          >
            <option value="">All 47 counties</option>
            {KENYAN_COUNTIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          <span>Rental type</span>
          <select
            aria-label="Choose rental type"
            value={stay}
            onChange={(event) => setStay(event.target.value as StayFilter)}
          >
            <option value="any">Any stay</option>
            <option value="monthly">Monthly home</option>
            <option value="short">Short stay</option>
          </select>
        </label>
        <label className="search-field">
          <span>Bedrooms</span>
          <select
            aria-label="Choose minimum bedrooms"
            value={bedrooms}
            onChange={(event) => setBedrooms(event.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1 or more</option>
            <option value="2">2 or more</option>
            <option value="3">3 or more</option>
          </select>
        </label>
        <label className="search-field search-field--budget">
          <span>Maximum budget</span>
          <select
            aria-label="Choose maximum budget"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          >
            <option value="">Any budget</option>
            <optgroup label="Monthly rent">
              <option value="month:30000">Up to KES 30,000 / month</option>
              <option value="month:50000">Up to KES 50,000 / month</option>
              <option value="month:75000">Up to KES 75,000 / month</option>
              <option value="month:100000">Up to KES 100,000 / month</option>
            </optgroup>
            <optgroup label="Short stay">
              <option value="night:5000">Up to KES 5,000 / night</option>
              <option value="night:7500">Up to KES 7,500 / night</option>
              <option value="night:10000">Up to KES 10,000 / night</option>
            </optgroup>
          </select>
        </label>
        <button className="rental-search-button" type="submit">
          <Search size={17} aria-hidden="true" />
          <span>Find a home</span>
        </button>
      </form>

      <div className="home-results" aria-live="polite">
        <div className="home-results-heading">
          <div>
            <p className="market-kicker">A FEEL FOR THE EXPERIENCE</p>
            <h2>
              {search.county
                ? `A taste of ${search.county}`
                : "Homes with a sense of place"}
            </h2>
          </div>
          <span className="preview-disclosure">
            <RentFlowMark className="preview-disclosure-mark" />
            DESIGN PREVIEW · SAMPLE
          </span>
        </div>

        <p className="preview-explanation">
          These example homes show how a Kenya-wide search could feel. They are
          not live listings or available rentals. Budget filters are separated
          by monthly rent and nightly stays.
        </p>

        {results.length ? (
          <div className="home-card-grid">
            {results.map((home) => (
              <article
                className={`home-card home-card--${home.accent}`}
                key={home.id}
              >
                <div className="home-card-image">
                  <Image
                    alt={home.imageAlt}
                    className="home-card-photo"
                    src={home.image}
                    width={640}
                    height={430}
                    sizes="(max-width: 700px) 90vw, (max-width: 1000px) 44vw, 30vw"
                  />
                  <span className="home-card-preview-label">SAMPLE HOME</span>
                </div>
                <div className="home-card-info">
                  <div className="home-card-title-row">
                    <div>
                      <p className="home-card-area">
                        {home.area} <span>·</span> {home.county} County
                      </p>
                      <h3>{home.title}</h3>
                    </div>
                    <span className="home-card-rooms">{home.bedrooms} bd</span>
                  </div>
                  <div className="home-card-meta">
                    <span>{home.stay}</span>
                    <strong>{formatPrice(home.price, home.priceUnit)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="preview-empty">
            <SlidersHorizontal size={19} aria-hidden="true" />
            <p>
              No sample homes match those filters yet. Real listings will make
              this search useful across every county.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
