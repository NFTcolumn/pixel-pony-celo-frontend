import { useState } from 'react'
import './Story.css'

export default function Story() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const totalSlides = 14

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <div className="story-page">
      <section className="story-container">
        <h2>The $PONY Story</h2>

        {/* Slideshow */}
        <div className="slideshow-wrapper">
          {/* Main Image Container - Full Width */}
          <div className="slide-container">
            <img
              src={`/pony-story/${currentSlide + 1}.png`}
              alt={`The PONY Story - Page ${currentSlide + 1}`}
            />
          </div>

          {/* Navigation Arrows - Outside and Below Image */}
          <div className="navigation-controls">
            <button onClick={prevSlide} className="nav-arrow">
              ◀
            </button>

            {/* Page Counter - Between Arrows */}
            <div className="page-counter">
              Page {currentSlide + 1} / {totalSlides}
            </div>

            <button onClick={nextSlide} className="nav-arrow">
              ▶
            </button>
          </div>

          {/* Thumbnail Navigation */}
          <div className="thumbnail-navigation">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`thumbnail-button ${currentSlide === i ? 'active' : ''}`}
              >
                <img
                  src={`/pony-story/${i + 1}.png`}
                  alt={`Page ${i + 1}`}
                />
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="text-navigation">
            <button onClick={prevSlide} className="text-nav-button">
              ← PREVIOUS
            </button>
            <button onClick={nextSlide} className="text-nav-button">
              NEXT →
            </button>
          </div>
        </div>

        <div className="story-cta">
          <p>THE RACE NEVER STOPS</p>
          <a href="/game" className="story-cta-button">
            🎮 JOIN THE RACE 🎮
          </a>
        </div>
      </section>
    </div>
  )
}
