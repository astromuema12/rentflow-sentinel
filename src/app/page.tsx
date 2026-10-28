import { ArrowDownRight, ArrowRight, Heart, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { HomeSearch } from "./home-search";

export default function Home() {
  return (
    <main className="kenya-home" id="home">
      <header className="market-nav">
        <Link className="market-brand" href="/" aria-label="RentFlow home">
          <RentFlowLogo />
        </Link>
        <nav className="market-nav-links" aria-label="Main navigation">
          <a href="#find-a-home">Find a home</a>
          <a href="#how-rentflow-works">How it works</a>
          <Link className="market-host-link" href="/register">
            Create renter account <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link className="market-host-link" href="/sign-in">
            Sign in <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <div className="market-main">
        <section className="market-hero" aria-labelledby="market-title">
          <div className="market-hero-copy">
            <p className="market-kicker">
              <span aria-hidden="true" />A MORE THOUGHTFUL WAY TO FIND HOME
            </p>
            <h1 id="market-title">
              Your next place
              <br />
              <em>is out there.</em>
            </h1>
            <p className="market-hero-intro">
              Explore rentals across Kenya, compare the details that matter, and
              find a place that feels right — all from wherever you are.
            </p>
            <a className="market-hero-cta" href="#find-a-home">
              Find a place <ArrowRight size={16} aria-hidden="true" />
            </a>
            <div className="market-trust-line">
              <span className="market-trust-icon" aria-hidden="true">
                <MapPin size={14} />
              </span>
              <span>One country. 47 counties. Your own way home.</span>
            </div>
          </div>

          <div className="market-hero-visual">
            <div className="hero-photo-main">
              <Image
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90"
                alt="Sunlit modern home with a calm, welcoming interior"
                fill
                priority
                sizes="(max-width: 760px) 90vw, 48vw"
              />
              <span className="hero-image-caption">
                <span>PICTURE YOURSELF HERE</span>
                <strong>A little more room to feel at home.</strong>
              </span>
            </div>
            <div className="hero-photo-inset">
              <Image
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=85"
                alt="Warm living room in an illustrative rental home"
                fill
                sizes="210px"
              />
            </div>
            <div className="hero-stamp" aria-label="Search throughout Kenya">
              <span>MADE FOR</span>
              <strong>KENYA</strong>
              <span>FROM COAST TO COUNTRY</span>
            </div>
            <span className="hero-decorative-line" aria-hidden="true" />
          </div>
        </section>

        <HomeSearch />

        <section
          className="market-how"
          id="how-rentflow-works"
          aria-labelledby="how-title"
        >
          <div className="market-how-heading">
            <p className="market-kicker">
              LESS RUNNING AROUND. MORE FEELING SURE.
            </p>
            <h2 id="how-title">
              Find your next place from the comfort of home.
            </h2>
            <p>
              A good rental search should make it easier to explore, compare,
              and make your next move on your terms.
            </p>
          </div>
          <div className="market-how-steps">
            <article>
              <span>01</span>
              <h3>Choose your county</h3>
              <p>
                Start in a familiar neighbourhood or explore somewhere
                completely new.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Compare what matters</h3>
              <p>
                Browse prices, spaces, and stay types side by side before you
                decide.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Make your next move</h3>
              <p>
                Take your time finding a home that fits your life and your
                budget.
              </p>
            </article>
          </div>
          <div className="market-note">
            <Heart size={16} aria-hidden="true" />
            <p>
              <strong>Made with Kenyan renters in mind.</strong> Search spans
              all 47 counties, from coastal escapes to the highlands and city
              neighbourhoods.
            </p>
            <ArrowDownRight
              className="market-note-arrow"
              size={18}
              aria-hidden="true"
            />
          </div>
        </section>

        <footer className="market-footer">
          <Link className="market-footer-brand" href="/">
            RENTFLOW <span>·</span> KENYA
          </Link>
          <span>Find a place to call home.</span>
          <div className="market-footer-links">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/disclaimer">Disclaimer</Link>
            <Link href="/legal/listing-standards">Listing standards</Link>
            <Link href="/legal/acceptable-use">Acceptable use</Link>
          </div>
          <Link href="/sign-in">Sign in to RentFlow</Link>
        </footer>
      </div>
    </main>
  );
}
